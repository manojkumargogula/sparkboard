"""Import the curated "problems worth solving" set.

Usage:  python -m sparkboard_api.importers.problems [data/problems.json]

Idempotent: ideas are matched by title, so re-running refreshes ranks, scores,
tags and copy without duplicating anything. Votes and comments are never touched,
and imported ideas start at zero votes: this board's users decide the ranking.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.core.config import Settings
from sparkboard_api.core.db import Database
from sparkboard_api.models import Idea
from sparkboard_api.repositories.authors import AuthorRepository
from sparkboard_api.schemas import normalize_tags

DEFAULT_FILE = Path(__file__).resolve().parents[3] / "data" / "problems.json"
AUTHOR_NAME = "Sparkboard"
SOURCE = "curated"
TAG = "worth-solving"


@dataclass(frozen=True)
class Problem:
    question: str
    industry: str
    score: float | None
    top10: bool

    @property
    def description(self) -> str:
        return f"A problem worth solving in {self.industry}. Vote if you feel it too."

    @property
    def tags(self) -> list[str]:
        return normalize_tags([self.industry, TAG])


def load(path: Path) -> list[Problem]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [
        Problem(
            question=p["question"].strip(),
            industry=p["industry"],
            score=p.get("itch_score"),
            top10=bool(p.get("top10")),
        )
        for p in data["problems"]
    ]


def ranked(problems: list[Problem]) -> list[tuple[int, Problem]]:
    """The curated order: the Top 10 as listed, then by score."""
    top = [p for p in problems if p.top10]
    rest = sorted((p for p in problems if not p.top10), key=lambda p: -(p.score or 0))
    return list(enumerate([*top, *rest], start=1))


async def import_problems(session: AsyncSession, problems: list[Problem]) -> tuple[int, int]:
    """Insert missing problems and refresh existing ones. Returns (created, updated)."""
    author_hash = hashlib.sha256(f"importer:{SOURCE}".encode()).hexdigest()
    author = await AuthorRepository(session).upsert(author_hash, AUTHOR_NAME, "sparkboard")
    existing = {
        idea.title: idea
        for idea in (await session.execute(select(Idea).where(Idea.title.is_not(None)))).scalars()
    }
    created = updated = 0
    for rank, problem in ranked(problems):
        idea = existing.get(problem.question)
        if idea is None:
            idea = Idea(title=problem.question[:120])
            session.add(idea)
            existing[problem.question] = idea
            created += 1
        else:
            updated += 1
        idea.content = problem.description
        idea.tags = problem.tags
        idea.author_id = author.id
        idea.source = SOURCE
        idea.source_rank = rank
        idea.source_score = problem.score
    await session.commit()
    return created, updated


async def run(path: Path, settings: Settings) -> tuple[int, int]:
    db = Database(settings)
    try:
        async for session in db.session():
            return await import_problems(session, load(path))
    finally:
        await db.dispose()
    return 0, 0  # pragma: no cover


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FILE
    created, updated = asyncio.run(run(path, Settings()))
    print(f"imported {created} new problems, refreshed {updated}")  # noqa: T201


if __name__ == "__main__":
    main()
