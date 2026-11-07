"""The Fix My Itch importer is idempotent and attributes its source."""

from __future__ import annotations

import json
from pathlib import Path

import httpx

from sparkboard_api.core.config import Settings
from sparkboard_api.importers import fix_my_itch


def test_bundled_file_loads() -> None:
    problems = fix_my_itch.load(fix_my_itch.DEFAULT_FILE)
    assert len(problems) >= 100
    assert all(p.question.startswith("Why") for p in problems)
    assert sum(p.top10 for p in problems) == 10


async def test_import_is_idempotent(
    client: httpx.AsyncClient, settings: Settings, tmp_path: Path
) -> None:
    source = tmp_path / "itch.json"
    source.write_text(
        json.dumps(
            {
                "problems": [
                    {
                        "question": "Why can't I find a plumber?",
                        "industry": "Home Services",
                        "itch_score": 71.5,
                        "top10": False,
                    },
                    {
                        "question": "Why is parking so hard?",
                        "industry": "Transportation",
                        "itch_score": None,
                        "top10": True,
                    },
                ]
            }
        )
    )
    assert await fix_my_itch.run(source, settings) == (2, 0)
    assert await fix_my_itch.run(source, settings) == (0, 2)

    # Equal votes: Fix My Itch's own ranking (Top 10 first) decides the order.
    top = (await client.get("/api/ideas", params={"sort": "top"})).json()
    assert [i["source_rank"] for i in top] == [1, 2]
    assert top[0]["title"] == "Why is parking so hard?"
    assert top[1]["source_score"] == 71.5

    ideas = (await client.get("/api/ideas", params={"sort": "new"})).json()
    plumber = next(i for i in ideas if i["title"] == "Why can't I find a plumber?")
    assert plumber["tags"] == ["home-services", "fix-my-itch"]
    assert "Itch Score 71.5" in plumber["content"]
    assert plumber["author"]["display_name"] == "Fix My Itch · Razorpay"
    assert plumber["vote_count"] == 0
    parking = next(i for i in ideas if i["title"] == "Why is parking so hard?")
    assert "Top 10 problem" in parking["content"]
