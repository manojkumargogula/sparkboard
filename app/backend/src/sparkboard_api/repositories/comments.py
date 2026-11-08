"""Comment persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.models import Comment, Idea


class CommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def for_idea(self, idea_id: int, limit: int) -> list[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.idea_id == idea_id)
            .order_by(Comment.created_at.asc(), Comment.id.asc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.unique().scalars().all())

    async def create(self, idea_id: int, content: str, author_id: uuid.UUID | None) -> Comment:
        comment = Comment(idea_id=idea_id, content=content, author_id=author_id)
        self._session.add(comment)
        await self._session.execute(
            update(Idea).where(Idea.id == idea_id).values(comment_count=Idea.comment_count + 1)
        )
        await self._session.flush()
        await self._session.refresh(comment, attribute_names=["author", "created_at"])
        return comment
