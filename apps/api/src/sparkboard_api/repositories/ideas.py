"""Idea, vote and tag queries."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Float,
    and_,
    cast,
    delete,
    exists,
    func,
    literal,
    or_,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.models import Comment, Idea, IdeaStatus, Vote
from sparkboard_api.schemas import SortOrder

SIMILARITY_THRESHOLD = 0.3


@dataclass(frozen=True)
class IdeaQuery:
    sort: SortOrder = SortOrder.TRENDING
    tag: str | None = None
    status: IdeaStatus | None = None
    search: str | None = None
    limit: int = 50
    offset: int = 0


@dataclass(frozen=True)
class IdeaRow:
    idea: Idea
    voted: bool


def _trending_score() -> ColumnElement[float]:
    """Hacker-News style gravity: votes decay with age in hours."""
    age_hours = func.extract("epoch", func.now() - Idea.created_at) / 3600.0
    return cast(Idea.vote_count + 1, Float) / func.power(age_hours + 2.0, 1.5)


def _voted_by(viewer_id: uuid.UUID | None) -> ColumnElement[bool]:
    if viewer_id is None:
        return literal(False)
    return exists().where(and_(Vote.idea_id == Idea.id, Vote.author_id == viewer_id))


class IdeaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def search(self, query: IdeaQuery, viewer_id: uuid.UUID | None) -> list[IdeaRow]:
        stmt = select(Idea, _voted_by(viewer_id).label("voted"))
        if query.tag:
            stmt = stmt.where(Idea.tags.contains([query.tag]))
        if query.status:
            stmt = stmt.where(Idea.status == query.status)
        if query.search:
            pattern = f"%{query.search}%"
            stmt = stmt.where(or_(Idea.content.ilike(pattern), Idea.title.ilike(pattern)))

        order: tuple[ColumnElement[Any], ...]
        match query.sort:
            case SortOrder.NEW:
                order = (Idea.created_at.desc(), Idea.id.desc())
            # Votes on this board always win; an imported source rank (e.g.
            # Fix My Itch's own ranking) only breaks ties between equal votes.
            case SortOrder.TOP:
                order = (
                    Idea.vote_count.desc(),
                    Idea.source_rank.asc().nulls_last(),
                    Idea.created_at.desc(),
                )
            case SortOrder.TRENDING:
                order = (
                    _trending_score().desc(),
                    Idea.source_rank.asc().nulls_last(),
                    Idea.id.desc(),
                )
        stmt = stmt.order_by(*order).limit(query.limit).offset(query.offset)
        result = await self._session.execute(stmt)
        return [IdeaRow(idea=row[0], voted=bool(row[1])) for row in result.unique().all()]

    async def get(self, idea_id: int, viewer_id: uuid.UUID | None) -> IdeaRow | None:
        stmt = select(Idea, _voted_by(viewer_id).label("voted")).where(Idea.id == idea_id)
        row = (await self._session.execute(stmt)).unique().one_or_none()
        return IdeaRow(idea=row[0], voted=bool(row[1])) if row else None

    async def create(
        self, content: str, title: str | None, tags: list[str], author_id: uuid.UUID | None
    ) -> Idea:
        idea = Idea(content=content, title=title, tags=tags, author_id=author_id)
        self._session.add(idea)
        await self._session.flush()
        await self._session.refresh(idea, attribute_names=["author", "created_at", "status"])
        return idea

    async def set_status(self, idea_id: int, status: IdeaStatus) -> bool:
        result = await self._session.execute(
            update(Idea).where(Idea.id == idea_id).values(status=status).returning(Idea.id)
        )
        return result.scalar_one_or_none() is not None

    async def add_vote(self, idea_id: int, author_id: uuid.UUID) -> int:
        inserted = await self._session.execute(
            insert(Vote)
            .values(idea_id=idea_id, author_id=author_id)
            .on_conflict_do_nothing(constraint="uq_votes_idea_author")
            .returning(Vote.id)
        )
        delta = 1 if inserted.scalar_one_or_none() is not None else 0
        return await self._bump_votes(idea_id, delta)

    async def remove_vote(self, idea_id: int, author_id: uuid.UUID) -> int:
        removed = await self._session.execute(
            delete(Vote)
            .where(Vote.idea_id == idea_id, Vote.author_id == author_id)
            .returning(Vote.id)
        )
        delta = -1 if removed.scalar_one_or_none() is not None else 0
        return await self._bump_votes(idea_id, delta)

    async def _bump_votes(self, idea_id: int, delta: int) -> int:
        result = await self._session.execute(
            update(Idea)
            .where(Idea.id == idea_id)
            .values(vote_count=Idea.vote_count + delta)
            .returning(Idea.vote_count)
        )
        return int(result.scalar_one())

    async def exists(self, idea_id: int) -> bool:
        result = await self._session.execute(select(Idea.id).where(Idea.id == idea_id))
        return result.scalar_one_or_none() is not None

    async def similar(self, text: str, limit: int) -> list[tuple[Idea, float]]:
        """Trigram similarity, so near-duplicates surface while the user types."""
        # Headlines are short, so word_similarity matches them against a long
        # draft far better than plain similarity does.
        score = func.greatest(
            func.similarity(Idea.content, text),
            func.word_similarity(func.coalesce(Idea.title, ""), text),
        )
        stmt = (
            select(Idea, score.label("score"))
            .where(score >= SIMILARITY_THRESHOLD)
            .order_by(score.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [(row[0], float(row[1])) for row in result.unique().all()]

    async def tag_counts(self, limit: int) -> list[tuple[str, int]]:
        tag = func.unnest(Idea.tags).label("tag")
        sub = select(tag).subquery()
        stmt = (
            select(sub.c.tag, func.count().label("n"))
            .group_by(sub.c.tag)
            .order_by(func.count().desc(), sub.c.tag)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [(str(r[0]), int(r[1])) for r in result.all()]

    async def stats(self) -> tuple[int, int, int, int, int | None]:
        ideas = select(
            func.count(Idea.id),
            func.coalesce(func.sum(Idea.vote_count), 0),
            func.count(Idea.id).filter(Idea.status == IdeaStatus.SHIPPED),
            func.max(Idea.id),
        )
        idea_count, votes, shipped, latest = (await self._session.execute(ideas)).one()
        comments = (await self._session.execute(select(func.count(Comment.id)))).scalar_one()
        return int(idea_count), int(votes), int(comments), int(shipped), latest
