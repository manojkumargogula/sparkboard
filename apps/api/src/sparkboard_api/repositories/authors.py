"""Author persistence."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.models import Author


class AuthorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def by_device(self, device_hash: str) -> Author | None:
        result = await self._session.execute(
            select(Author).where(Author.device_hash == device_hash)
        )
        return result.scalar_one_or_none()

    async def upsert(self, device_hash: str, display_name: str, avatar_seed: str) -> Author:
        stmt = (
            insert(Author)
            .values(device_hash=device_hash, display_name=display_name, avatar_seed=avatar_seed)
            .on_conflict_do_update(
                index_elements=[Author.device_hash],
                set_={"display_name": display_name, "avatar_seed": avatar_seed},
            )
            .returning(Author)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()
