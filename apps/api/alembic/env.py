"""Alembic runs migrations online through the same asyncpg engine as the app."""

from __future__ import annotations

import asyncio

from alembic import context
from sqlalchemy.engine import Connection

from sparkboard_api.core.config import Settings
from sparkboard_api.core.db import build_engine
from sparkboard_api.models import Base

target_metadata = Base.metadata


def _run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async() -> None:
    # Run with DATABASE_URL pointing at a direct (non-pooled) connection.
    engine = build_engine(Settings())
    async with engine.connect() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    raise SystemExit("Offline migrations are not supported; run against a database.")
asyncio.run(_run_async())
