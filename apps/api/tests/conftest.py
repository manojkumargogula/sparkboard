"""Integration fixtures: a real Postgres, migrated once, truncated per test."""

from __future__ import annotations

import os
import secrets
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr
from sqlalchemy import text

from sparkboard_api.core.config import Settings
from sparkboard_api.main import create_app

API_ROOT = Path(__file__).resolve().parents[1]
TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://sparkboard:sparkboard@localhost:5433/sparkboard_test"
)
ADMIN_TOKEN = "test-admin-token"  # noqa: S105 - fixture value, not a secret


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(
        environment="test",
        database_url=TEST_DB,
        admin_token=SecretStr(ADMIN_TOKEN),
        log_json=False,
        log_level="WARNING",
        rate_limit_writes=1000,
    )


@pytest.fixture(scope="session", autouse=True)
def _migrate() -> None:
    env = {**os.environ, "DATABASE_URL": TEST_DB}
    for args in (["downgrade", "base"], ["upgrade", "head"]):
        subprocess.run(  # noqa: S603 - fixed argv
            [sys.executable, "-m", "alembic", *args], cwd=API_ROOT, env=env, check=True
        )


@pytest.fixture
async def client(settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        c.app = app  # type: ignore[attr-defined]
        yield c
    async with app.state.db.engine.begin() as conn:
        await conn.execute(text("TRUNCATE comments, votes, ideas, authors RESTART IDENTITY"))
    await app.state.db.dispose()


def new_token() -> str:
    return secrets.token_urlsafe(32)


async def make_author(client: httpx.AsyncClient, name: str = "Ada") -> dict[str, str]:
    headers = {"X-Device-Token": new_token()}
    resp = await client.put("/api/me", json={"display_name": name}, headers=headers)
    assert resp.status_code == 200, resp.text
    return headers
