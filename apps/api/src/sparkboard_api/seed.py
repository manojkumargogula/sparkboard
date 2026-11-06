"""Seed a fresh board with believable starter content.

Usage: python -m sparkboard_api.seed  (idempotent: skips when ideas exist)
"""

from __future__ import annotations

import asyncio
import hashlib
import random
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from sparkboard_api.core.config import Settings
from sparkboard_api.core.db import Database
from sparkboard_api.models import Author, Comment, Idea, IdeaStatus, Vote

PEOPLE = ["Priya N", "Marco Rossi", "Aiko", "Dev Patel", "Sam Okafor", "Lena W", "Tom H", "Ines"]

IDEAS: list[tuple[str, str, list[str], IdeaStatus]] = [
    (
        "Dark mode that follows my OS",
        "Switch themes automatically at sunset, and remember my choice per device.",
        ["ui", "accessibility"],
        IdeaStatus.SHIPPED,
    ),
    (
        "Weekly digest email",
        "One short email on Monday with the top five ideas of the week and what shipped.",
        ["email", "engagement"],
        IdeaStatus.PLANNED,
    ),
    (
        "Merge duplicate ideas",
        "When two ideas say the same thing, let moderators merge them and keep every vote.",
        ["moderation"],
        IdeaStatus.BUILDING,
    ),
    (
        "Embed the board on our docs site",
        "A small script tag that shows the top ideas for a tag inside any page.",
        ["integrations"],
        IdeaStatus.OPEN,
    ),
    (
        "Slack notifications for status changes",
        "Post to a channel when an idea moves to Planned, Building or Shipped.",
        ["integrations", "slack"],
        IdeaStatus.PLANNED,
    ),
    (
        "Let me follow an idea",
        "Tell me when an idea I care about gets a reply or changes status.",
        ["notifications"],
        IdeaStatus.OPEN,
    ),
    (
        "Keyboard shortcuts everywhere",
        "J and K to move, V to vote, C to comment. I live on the keyboard.",
        ["ui", "power-users"],
        IdeaStatus.SHIPPED,
    ),
    (
        "Show why something was declined",
        "A short note when an idea will not be built is better than silence.",
        ["transparency"],
        IdeaStatus.OPEN,
    ),
    (
        "Image attachments on ideas",
        "Let me drop in a screenshot or a sketch so the idea is easier to picture.",
        ["ui"],
        IdeaStatus.OPEN,
    ),
    (
        "Public changelog page",
        "Every shipped idea gets a line on a changelog with the date and who asked for it.",
        ["transparency", "engagement"],
        IdeaStatus.BUILDING,
    ),
]

COMMENTS = [
    "Yes please, this would save me so much time.",
    "We hacked around this with a spreadsheet. Would love it built in.",
    "Could this work on mobile too?",
    "Strong +1. Our whole team asked for this last week.",
    "Curious how this would handle private projects.",
]


def _device(name: str) -> str:
    return hashlib.sha256(f"seed:{name}".encode()).hexdigest()


async def seed(settings: Settings) -> int:
    db = Database(settings)
    rng = random.Random(7)  # noqa: S311 - deterministic demo data, not security
    async for session in db.session():
        if (await session.execute(select(func.count(Idea.id)))).scalar_one():
            await db.dispose()
            return 0
        authors = [
            Author(device_hash=_device(n), display_name=n, avatar_seed=n.lower()[:6])
            for n in PEOPLE
        ]
        session.add_all(authors)
        await session.flush()
        now = datetime.now(UTC)
        for i, (title, content, tags, status) in enumerate(IDEAS):
            voters = rng.sample(authors, k=rng.randint(1, len(authors)))
            idea = Idea(
                title=title,
                content=content,
                tags=tags,
                status=status,
                author_id=authors[i % len(authors)].id,
                vote_count=len(voters),
                created_at=now - timedelta(hours=rng.randint(2, 24 * 20)),
            )
            session.add(idea)
            await session.flush()
            session.add_all(Vote(idea_id=idea.id, author_id=a.id) for a in voters)
            picked = rng.sample(COMMENTS, k=rng.randint(0, 3))
            session.add_all(
                Comment(idea_id=idea.id, content=c, author_id=rng.choice(authors).id)
                for c in picked
            )
            idea.comment_count = len(picked)
        await session.commit()
    await db.dispose()
    return len(IDEAS)


def main() -> None:
    created = asyncio.run(seed(Settings(db_serverless=True)))
    print(f"seeded {created} ideas" if created else "board already has ideas; nothing to do")  # noqa: T201


if __name__ == "__main__":
    main()
