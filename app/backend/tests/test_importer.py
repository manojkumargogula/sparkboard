"""The problems importer is idempotent and keeps the curated ranking."""

from __future__ import annotations

import json
from pathlib import Path

import httpx

from sparkboard_api.core.config import Settings
from sparkboard_api.importers import problems


def test_bundled_file_loads() -> None:
    items = problems.load(problems.DEFAULT_FILE)
    assert len(items) >= 100
    assert all(p.question.startswith("Why") for p in items)
    assert sum(p.top10 for p in items) == 10


async def test_import_is_idempotent_and_ranked(
    client: httpx.AsyncClient, settings: Settings, tmp_path: Path
) -> None:
    source = tmp_path / "problems.json"
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
    assert await problems.run(source, settings) == (2, 0)
    assert await problems.run(source, settings) == (0, 2)

    top = (await client.get("/api/ideas", params={"sort": "top"})).json()
    assert [i["source_rank"] for i in top] == [1, 2]
    assert top[0]["title"] == "Why is parking so hard?"
    plumber = top[1]
    assert plumber["source_score"] == 71.5
    assert plumber["tags"] == ["home-services", "worth-solving"]
    assert (
        plumber["content"] == "A problem worth solving in Home Services. Vote if you feel it too."
    )
    assert plumber["author"]["display_name"] == "Sparkboard"
    assert plumber["vote_count"] == 0
