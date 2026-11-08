"""Health, metrics, rate limiting, AI endpoints and config helpers."""

from __future__ import annotations

import httpx
import pytest

from sparkboard_api.ai.factory import build_provider
from sparkboard_api.ai.null import NullProvider
from sparkboard_api.ai.provider import AIUnavailableError, T
from sparkboard_api.core.config import Settings, normalize_database_url
from sparkboard_api.core.ratelimit import RateLimiter
from sparkboard_api.schemas import SharpenOut, normalize_tags


async def test_health_and_metrics(client: httpx.AsyncClient) -> None:
    assert (await client.get("/healthz")).json()["status"] == "ok"
    ready = (await client.get("/readyz")).json()
    assert ready["checks"] == {"database": "up"}
    await client.get("/api/ideas")
    metrics = (await client.get("/metrics")).text
    assert 'sparkboard_http_requests_total{method="GET",route="/api/ideas",status="200"}' in metrics
    assert (await client.get("/healthz")).headers["X-Request-Id"]


async def test_write_rate_limit(client: httpx.AsyncClient) -> None:
    client.app.state.write_limiter = RateLimiter(limit=2, window_seconds=60)  # type: ignore[attr-defined]
    codes = [
        (await client.post("/api/ideas", json={"content": f"idea {n}"})).status_code
        for n in range(3)
    ]
    assert codes == [201, 201, 429]


def test_rate_limiter_window_resets() -> None:
    limiter = RateLimiter(limit=1, window_seconds=10)
    assert limiter.hit("k", now=0)[0] is True
    assert limiter.hit("k", now=5) == (False, 5)
    assert limiter.hit("k", now=11)[0] is True


class _FakeProvider:
    name = "fake"
    enabled = True

    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    async def structured(self, _system: str, prompt: str, schema: type[T]) -> T:
        if self.fail:
            raise AIUnavailableError("boom")
        assert "<idea>" in prompt
        return schema.model_validate(
            {"title": "Dark mode", "content": "Add dark mode.", "tags": ["UI", "Theme"]}
        )


async def test_ai_disabled_by_default(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/ai/status")).json() == {"enabled": False, "provider": "none"}
    resp = await client.post("/api/ai/sharpen", json={"content": "make it dark"})
    assert resp.status_code == 404


async def test_ai_sharpen_with_provider(client: httpx.AsyncClient) -> None:
    client.app.state.ai = _FakeProvider()  # type: ignore[attr-defined]
    resp = await client.post("/api/ai/sharpen", json={"content": "make it dark"})
    assert resp.json() == {
        "title": "Dark mode",
        "content": "Add dark mode.",
        "tags": ["ui", "theme"],
    }

    client.app.state.ai = _FakeProvider(fail=True)  # type: ignore[attr-defined]
    assert (await client.post("/api/ai/sharpen", json={"content": "dark"})).status_code == 503


async def test_null_provider_raises() -> None:
    with pytest.raises(AIUnavailableError):
        await NullProvider().structured("s", "p", SharpenOut)


def test_provider_factory() -> None:
    assert build_provider(Settings()).name == "none"
    anthropic = build_provider(Settings(ai_provider="anthropic", ai_api_key="k"))  # type: ignore[arg-type]
    assert anthropic.name == "anthropic"
    no_url = build_provider(Settings(ai_provider="openai", ai_api_key="k"))  # type: ignore[arg-type]
    assert no_url.name == "none"
    compat = build_provider(
        Settings(ai_provider="openai", ai_api_key="k", ai_base_url="http://x/v1")  # type: ignore[arg-type]
    )
    assert compat.name == "openai"


def test_database_url_normalisation() -> None:
    url, ssl = normalize_database_url(
        "postgres://u:p@host/db?sslmode=require&channel_binding=require&application_name=x"
    )
    assert url == "postgresql+asyncpg://u:p@host/db?application_name=x"
    assert ssl is True
    assert normalize_database_url("postgresql://u:p@h/db")[1] is False


def test_normalize_tags() -> None:
    assert normalize_tags(["A B", "a-b", "", "!!", "x" * 30, "c", "d", "e", "f"]) == [
        "a-b",
        "x" * 24,
        "c",
        "d",
        "e",
    ]
