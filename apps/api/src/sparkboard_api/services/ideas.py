"""Idea use-cases. Routers call these; these call repositories."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.models import IdeaStatus
from sparkboard_api.repositories.comments import CommentRepository
from sparkboard_api.repositories.ideas import IdeaQuery, IdeaRepository, IdeaRow
from sparkboard_api.schemas import (
    AuthorOut,
    CommentOut,
    IdeaCreate,
    IdeaOut,
    SimilarIdea,
    Stats,
    TagCount,
    VoteOut,
)


class NotFoundError(LookupError):
    """The requested idea does not exist."""


def _to_out(row: IdeaRow) -> IdeaOut:
    out = IdeaOut.model_validate(row.idea)
    out.voted = row.voted
    return out


class IdeaService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._ideas = IdeaRepository(session)
        self._comments = CommentRepository(session)

    async def feed(self, query: IdeaQuery, viewer_id: uuid.UUID | None) -> list[IdeaOut]:
        return [_to_out(row) for row in await self._ideas.search(query, viewer_id)]

    async def get(self, idea_id: int, viewer_id: uuid.UUID | None) -> IdeaOut:
        row = await self._ideas.get(idea_id, viewer_id)
        if row is None:
            raise NotFoundError(idea_id)
        return _to_out(row)

    async def create(self, data: IdeaCreate, author_id: uuid.UUID | None) -> IdeaOut:
        idea = await self._ideas.create(data.content, data.title, data.tags, author_id)
        await self._session.commit()
        return IdeaOut.model_validate(idea)

    async def set_status(self, idea_id: int, status: IdeaStatus) -> IdeaOut:
        if not await self._ideas.set_status(idea_id, status):
            raise NotFoundError(idea_id)
        await self._session.commit()
        return await self.get(idea_id, None)

    async def vote(self, idea_id: int, author_id: uuid.UUID, *, up: bool) -> VoteOut:
        if not await self._ideas.exists(idea_id):
            raise NotFoundError(idea_id)
        if up:
            count = await self._ideas.add_vote(idea_id, author_id)
        else:
            count = await self._ideas.remove_vote(idea_id, author_id)
        await self._session.commit()
        return VoteOut(idea_id=idea_id, vote_count=count, voted=up)

    async def comments(self, idea_id: int, limit: int = 200) -> list[CommentOut]:
        if not await self._ideas.exists(idea_id):
            raise NotFoundError(idea_id)
        return [CommentOut.model_validate(c) for c in await self._comments.for_idea(idea_id, limit)]

    async def add_comment(
        self, idea_id: int, content: str, author_id: uuid.UUID | None
    ) -> CommentOut:
        if not await self._ideas.exists(idea_id):
            raise NotFoundError(idea_id)
        comment = await self._comments.create(idea_id, content, author_id)
        await self._session.commit()
        return CommentOut.model_validate(comment)

    async def similar(self, text: str, limit: int = 5) -> list[SimilarIdea]:
        return [
            SimilarIdea(
                id=idea.id,
                title=idea.title,
                content=idea.content,
                vote_count=idea.vote_count,
                score=round(score, 3),
            )
            for idea, score in await self._ideas.similar(text, limit)
        ]

    async def tags(self, limit: int = 30) -> list[TagCount]:
        return [TagCount(tag=t, count=n) for t, n in await self._ideas.tag_counts(limit)]

    async def stats(self) -> Stats:
        ideas, votes, comments, shipped, latest = await self._ideas.stats()
        return Stats(
            ideas=ideas, votes=votes, comments=comments, shipped=shipped, latest_idea_id=latest
        )


__all__ = ["AuthorOut", "IdeaService", "NotFoundError"]
