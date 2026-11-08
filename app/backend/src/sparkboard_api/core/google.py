"""Verify Google Identity Services ID tokens (the "Continue with Google" credential)."""

from __future__ import annotations

from typing import Any, Protocol

import anyio
import jwt

from sparkboard_api.repositories.authors import GoogleProfile

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")


class InvalidTokenError(ValueError):
    """The credential is not a valid Google ID token for this app."""


class TokenVerifier(Protocol):
    async def __call__(self, credential: str) -> GoogleProfile: ...


class GoogleVerifier:
    """Checks signature (Google's rotating keys), audience, issuer, expiry, email."""

    def __init__(self, client_id: str) -> None:
        self._client_id = client_id
        self._keys = jwt.PyJWKClient(GOOGLE_CERTS_URL, cache_keys=True, lifespan=3600)

    def _verify(self, credential: str) -> dict[str, Any]:
        try:
            key = self._keys.get_signing_key_from_jwt(credential)
            claims: dict[str, Any] = jwt.decode(
                credential,
                key.key,
                algorithms=["RS256"],
                audience=self._client_id,
                options={"require": ["exp", "iat", "sub", "aud", "iss"]},
                leeway=30,
            )
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(str(exc)) from exc
        if claims.get("iss") not in GOOGLE_ISSUERS:
            raise InvalidTokenError("unexpected issuer")
        if claims.get("email") and not claims.get("email_verified"):
            raise InvalidTokenError("email not verified")
        return claims

    async def __call__(self, credential: str) -> GoogleProfile:
        claims = await anyio.to_thread.run_sync(self._verify, credential)
        name = claims.get("name") or claims.get("given_name") or "Google user"
        return GoogleProfile(
            sub=str(claims["sub"]),
            email=claims.get("email"),
            name=str(name),
            picture=claims.get("picture"),
        )
