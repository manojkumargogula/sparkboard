"""Import problem statements from Razorpay's "Fix My Itch" with attribution.

Usage:  python -m sparkboard_api.importers.fix_my_itch [data/fix-my-itch.json]

Idempotent: an idea whose title already exists is skipped, so the import can
be re-run safely after the source file is refreshed. Imported ideas start with
zero votes; ranking comes from this board's own users.
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

DEFAULT_FILE = Path(__file__).resolve().parents[3] / "data" / "fix-my-itch.json"
AUTHOR_NAME = "Fix My Itch · Razorpay"
SOURCE_TAG = "fix-my-itch"


@dataclass(frozen=True)
class Problem:
    question: str
    industry: str
    itch_score: float | None
    top10: bool

    @property
    def description(self) -> str:
        rank = "a Top 10 problem" if self.top10 else f"Itch Score {self.itch_score:g}"
        return (
            f"From Razorpay's Fix My Itch ({rank}, {self.industry}), a crowdsourced, "
            "AI-curated list of problems worth solving in India. Vote if you feel this itch too."
        )

    @property
    def tags(self) -> list[str]:
        return normalize_tags([self.industry, SOURCE_TAG])


def load(path: Path) -> list[Problem]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [
        Problem(
            question=p["question"].strip(),
            industry=p["industry"],
            itch_score=p.get("itch_score"),
            top10=bool(p.get("top10")),
        )
        for p in data["problems"]
    ]


async def import_problems(session: AsyncSession, problems: list[Problem]) -> tuple[int, int]:
    """Insert missing problems. Returns (created, skipped)."""
    author_hash = hashlib.sha256(f"importer:{SOURCE_TAG}".encode()).hexdigest()
    author = await AuthorRepository(session).upsert(author_hash, AUTHOR_NAME, SOURCE_TAG)
    existing = set((await session.execute(select(Idea.title))).scalars())
    created = 0
    # Highest score first, so newer ids (the "Newest" sort) favour the best problems.
    ordered = sorted(problems, key=lambda p: (p.top10, p.itch_score or 0))
    for problem in ordered:
        if problem.question in existing:
            continue
        session.add(
            Idea(
                title=problem.question[:120],
                content=problem.description,
                tags=problem.tags,
                author_id=author.id,
            )
        )
        existing.add(problem.question)
        created += 1
    await session.commit()
    return created, len(problems) - created


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
    created, skipped = asyncio.run(run(path, Settings()))
    print(f"imported {created} problems, skipped {skipped} already on the board")  # noqa: T201


if __name__ == "__main__":
    main()
