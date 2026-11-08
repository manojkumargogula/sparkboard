"""Google sign-in: verification, account linking, and write protection."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import text

from sparkboard_api.core.config import Settings
from sparkboard_api.core.google import GoogleVerifier, InvalidTokenError
from sparkboard_api.main import create_app
from sparkboard_api.repositories.authors import GoogleProfile
from tests.conftest import make_author, new_token

CLIENT_ID = "test-client.apps.googleusercontent.com"


class FakeVerifier:
    """Accepts credentials of the form 'good:<sub>'."""

    async def __call__(self, credential: str) -> GoogleProfile:
        if not credential.startswith("good:"):
            raise InvalidTokenError("bad")
        sub = credential.removeprefix("good:").split("|")[0]
        return GoogleProfile(
            sub=sub, email=f"{sub}@example.com", name=f"User {sub}", picture="https://p/x.png"
        )


def cred(sub: str) -> str:
    return f"good:{sub}|".ljust(24, "x")


@pytest.fixture
async def strict(settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    """A client for an app with AUTH_REQUIRED and Google configured."""
    app = create_app(
        settings.model_copy(update={"auth_required": True, "google_client_id": CLIENT_ID})
    )
    app.state.google_verifier = FakeVerifier()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    async with app.state.db.engine.begin() as conn:
        await conn.execute(text("TRUNCATE comments, votes, ideas, author_devices, authors CASCADE"))
    await app.state.db.dispose()


async def test_config_and_not_configured(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/auth/config")).json() == {
        "google_client_id": None,
        "auth_required": False,
    }
    headers = {"X-Device-Token": new_token()}
    resp = await client.post("/api/auth/google", json={"credential": cred("a")}, headers=headers)
    assert resp.status_code == 404


async def test_sign_in_links_devices_and_upgrades_anonymous(client: httpx.AsyncClient) -> None:
    client.app.state.google_verifier = FakeVerifier()  # type: ignore[attr-defined]
    # An anonymous visitor votes, then signs in: the same author is upgraded.
    device_a = await make_author(client, "Anon")
    idea = (await client.post("/api/ideas", json={"content": "Keep my vote"})).json()
    await client.put(f"/api/ideas/{idea['id']}/vote", headers=device_a)
    me = await client.post("/api/auth/google", json={"credential": cred("123")}, headers=device_a)
    body = me.json()
    assert body["display_name"] == "User 123"
    assert body["picture_url"] == "https://p/x.png"
    assert body["signed_in"] is True
    assert (await client.get("/api/ideas", headers=device_a)).json()[0]["voted"] is True

    # A second device signing in to the same account sees the same vote.
    device_b = {"X-Device-Token": new_token()}
    await client.post("/api/auth/google", json={"credential": cred("123")}, headers=device_b)
    assert (await client.get("/api/ideas", headers=device_b)).json()[0]["voted"] is True
    assert (await client.get("/api/me", headers=device_b)).json()["signed_in"] is True

    # Signing out forgets only that device.
    assert (await client.post("/api/auth/logout", headers=device_b)).status_code == 204
    assert (await client.get("/api/me", headers=device_b)).status_code == 404
    assert (await client.get("/api/me", headers=device_a)).status_code == 200


async def test_switching_accounts_on_a_device(client: httpx.AsyncClient) -> None:
    client.app.state.google_verifier = FakeVerifier()  # type: ignore[attr-defined]
    device = {"X-Device-Token": new_token()}
    await client.post("/api/auth/google", json={"credential": cred("one")}, headers=device)
    await client.post("/api/auth/google", json={"credential": cred("two")}, headers=device)
    assert (await client.get("/api/me", headers=device)).json()["display_name"] == "User two"


async def test_bad_credentials(client: httpx.AsyncClient) -> None:
    client.app.state.google_verifier = FakeVerifier()  # type: ignore[attr-defined]
    resp = await client.post(
        "/api/auth/google",
        json={"credential": "bad".ljust(24, "x")},
        headers={"X-Device-Token": new_token()},
    )
    assert resp.status_code == 401
    no_device = await client.post("/api/auth/google", json={"credential": cred("a")})
    assert no_device.status_code == 401


async def test_auth_required_blocks_anonymous_writes(strict: httpx.AsyncClient) -> None:
    assert (await strict.get("/api/auth/config")).json()["auth_required"] is True
    anon = {"X-Device-Token": new_token()}
    assert (
        await strict.post("/api/ideas", json={"content": "nope"}, headers=anon)
    ).status_code == 401
    assert (
        await strict.put("/api/me", json={"display_name": "x"}, headers=anon)
    ).status_code == 403

    signed = {"X-Device-Token": new_token()}
    await strict.post("/api/auth/google", json={"credential": cred("9")}, headers=signed)
    idea = await strict.post("/api/ideas", json={"content": "Signed idea"}, headers=signed)
    assert idea.status_code == 201
    assert idea.json()["author"]["picture_url"] == "https://p/x.png"
    iid = idea.json()["id"]
    assert (await strict.put(f"/api/ideas/{iid}/vote", headers=anon)).status_code == 401
    assert (await strict.put(f"/api/ideas/{iid}/vote", headers=signed)).status_code == 200
    comment = await strict.post(f"/api/ideas/{iid}/comments", json={"content": "hi"}, headers=anon)
    assert comment.status_code == 401
    # Reading stays public.
    assert (await strict.get("/api/ideas")).status_code == 200


# ----------------------------------------------------------------- real JWT checks


@pytest.fixture
def signer(monkeypatch: pytest.MonkeyPatch) -> Any:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    class _Key:
        def __init__(self) -> None:
            self.key = key.public_key()

    monkeypatch.setattr(jwt.PyJWKClient, "get_signing_key_from_jwt", lambda *_: _Key())

    def sign(**overrides: Any) -> str:
        now = int(time.time())
        claims = {
            "iss": "https://accounts.google.com",
            "aud": CLIENT_ID,
            "sub": "42",
            "email": "a@b.com",
            "email_verified": True,
            "name": "Ada",
            "picture": "p",
            "iat": now,
            "exp": now + 600,
        } | overrides
        return jwt.encode(claims, key, algorithm="RS256")

    return sign


async def test_google_verifier_accepts_valid_token(signer: Any) -> None:
    profile = await GoogleVerifier(CLIENT_ID)(signer())
    assert profile == GoogleProfile(sub="42", email="a@b.com", name="Ada", picture="p")


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "someone-else"},
        {"iss": "https://evil.example"},
        {"exp": int(time.time()) - 3600},
        {"email_verified": False},
    ],
)
async def test_google_verifier_rejects(signer: Any, overrides: dict[str, Any]) -> None:
    with pytest.raises(InvalidTokenError):
        await GoogleVerifier(CLIENT_ID)(signer(**overrides))
