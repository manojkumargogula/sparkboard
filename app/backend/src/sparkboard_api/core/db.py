"""Async SQLAlchemy engine and session lifecycle."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from sparkboard_api.core.config import Settings


def build_engine(settings: Settings) -> AsyncEngine:
    connect_args: dict[str, Any] = {
        # Transaction poolers (PgBouncer, Neon) cannot keep prepared statements.
        "statement_cache_size": 0,
        "server_settings": {"application_name": "sparkboard-api"},
    }
    if settings.database_ssl:
        connect_args["ssl"] = "require"

    if settings.db_serverless:
        # Serverless instances are reused between requests (Vercel fluid compute),
        # so keep a tiny pool behind the provider's transaction pooler. Short
        # recycle + pre-ping drop connections that went stale while frozen.
        return create_async_engine(
            settings.async_database_url,
            pool_size=1,
            max_overflow=4,
            pool_recycle=120,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
    return create_async_engine(
        settings.async_database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_pool_size,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=connect_args,
    )


class Database:
    """Owns the engine and hands out sessions; one instance per app."""

    def __init__(self, settings: Settings) -> None:
        self.engine = build_engine(settings)
        self._sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self._sessions() as session:
            yield session

    async def dispose(self) -> None:
        await self.engine.dispose()
