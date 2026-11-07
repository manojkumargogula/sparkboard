"""Author persistence: anonymous profiles, Google identities and device links."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.models import Author, AuthorDevice


@dataclass(frozen=True)
class GoogleProfile:
    sub: str
    email: str | None
    name: str
    picture: str | None


class AuthorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def by_device(self, device_hash: str) -> Author | None:
        result = await self._session.execute(
            select(Author)
            .join(AuthorDevice, AuthorDevice.author_id == Author.id)
            .where(AuthorDevice.device_hash == device_hash)
        )
        return result.scalar_one_or_none()

    async def by_google_sub(self, sub: str) -> Author | None:
        result = await self._session.execute(select(Author).where(Author.google_sub == sub))
        return result.scalar_one_or_none()

    async def link_device(self, device_hash: str, author_id: uuid.UUID) -> None:
        await self._session.execute(
            insert(AuthorDevice)
            .values(device_hash=device_hash, author_id=author_id)
            .on_conflict_do_update(
                index_elements=[AuthorDevice.device_hash], set_={"author_id": author_id}
            )
        )

    async def unlink_device(self, device_hash: str) -> None:
        await self._session.execute(
            delete(AuthorDevice).where(AuthorDevice.device_hash == device_hash)
        )

    async def save_anonymous(self, device_hash: str, display_name: str, avatar_seed: str) -> Author:
        """Create or rename the anonymous profile on this device."""
        author = await self.by_device(device_hash)
        if author is None:
            author = Author(display_name=display_name, avatar_seed=avatar_seed)
            self._session.add(author)
            await self._session.flush()
            await self.link_device(device_hash, author.id)
        else:
            author.display_name = display_name
            author.avatar_seed = avatar_seed
        return author

    async def sign_in_google(self, device_hash: str, profile: GoogleProfile) -> Author:
        """Attach this device to the Google account's author.

        First sign-in on a device with an anonymous profile upgrades that profile,
        so earlier votes and ideas carry over. Otherwise the device simply switches
        to the Google account's author.
        """
        author = await self.by_google_sub(profile.sub)
        if author is None:
            current = await self.by_device(device_hash)
            if current is not None and current.google_sub is None:
                author = current
            else:
                author = Author(avatar_seed=profile.sub[:12], display_name=profile.name[:40])
                self._session.add(author)
            author.google_sub = profile.sub
        author.display_name = profile.name[:40] or author.display_name
        author.email = profile.email
        author.picture_url = profile.picture
        await self._session.flush()
        await self.link_device(device_hash, author.id)
        return author

    async def upsert_system(self, key: str, display_name: str, avatar_seed: str) -> Author:
        """Authors owned by the system (importers), keyed by a fixed hash."""
        stmt = (
            insert(Author)
            .values(device_hash=key, display_name=display_name, avatar_seed=avatar_seed)
            .on_conflict_do_update(
                index_elements=[Author.device_hash],
                set_={"display_name": display_name, "avatar_seed": avatar_seed},
            )
            .returning(Author)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()
