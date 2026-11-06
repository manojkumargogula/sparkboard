"""The brief's contract (GET/POST /api/ideas) and the feed behaviour around it."""

from __future__ import annotations

import httpx

from tests.conftest import make_author


async def test_contract_post_and_get(client: httpx.AsyncClient) -> None:
    resp = await client.post("/api/ideas", json={"content": "My new idea"})
    assert resp.status_code == 201
    created = resp.json()
    assert created["content"] == "My new idea"
    assert {"id", "content", "created_at"} <= created.keys()

    listing = await client.get("/api/ideas")
    assert listing.status_code == 200
    body = listing.json()
    assert isinstance(body, list)
    assert body[0]["id"] == created["id"]
    assert body[0]["author"] is None


async def test_validation_rejects_short_and_long(client: httpx.AsyncClient) -> None:
    assert (await client.post("/api/ideas", json={"content": "hi"})).status_code == 422
    assert (await client.post("/api/ideas", json={"content": "x" * 1001})).status_code == 422
    assert (await client.post("/api/ideas", json={})).status_code == 422


async def test_tags_are_normalised_and_filterable(client: httpx.AsyncClient) -> None:
    await client.post(
        "/api/ideas", json={"content": "Dark mode please", "tags": ["UI", "ui", " Dark Mode "]}
    )
    await client.post("/api/ideas", json={"content": "Faster search", "tags": ["perf"]})

    ui = (await client.get("/api/ideas", params={"tag": "ui"})).json()
    assert [i["content"] for i in ui] == ["Dark mode please"]
    assert ui[0]["tags"] == ["ui", "dark-mode"]

    tags = (await client.get("/api/tags")).json()
    assert {t["tag"] for t in tags} == {"ui", "dark-mode", "perf"}


async def test_sorting_search_and_paging(client: httpx.AsyncClient) -> None:
    ids = [
        (await client.post("/api/ideas", json={"content": word})).json()["id"]
        for word in ("alpha idea", "beta idea", "gamma idea")
    ]
    voter = await make_author(client)
    await client.put(f"/api/ideas/{ids[0]}/vote", headers=voter)

    new = (await client.get("/api/ideas", params={"sort": "new"})).json()
    assert [i["id"] for i in new] == ids[::-1]
    top = (await client.get("/api/ideas", params={"sort": "top"})).json()
    assert top[0]["id"] == ids[0]
    trending = (await client.get("/api/ideas", params={"sort": "trending"})).json()
    assert trending[0]["id"] == ids[0]

    found = (await client.get("/api/ideas", params={"q": "beta"})).json()
    assert [i["id"] for i in found] == [ids[1]]

    page = await client.get("/api/ideas", params={"sort": "new", "limit": 2})
    assert page.headers["X-Next-Offset"] == "2"
    rest = (await client.get("/api/ideas", params={"sort": "new", "limit": 2, "offset": 2})).json()
    assert [i["id"] for i in rest] == [ids[0]]


async def test_get_one_and_404(client: httpx.AsyncClient) -> None:
    idea = (await client.post("/api/ideas", json={"content": "Single idea"})).json()
    assert (await client.get(f"/api/ideas/{idea['id']}")).json()["content"] == "Single idea"
    assert (await client.get("/api/ideas/999999")).status_code == 404


async def test_author_attached_when_profile_exists(client: httpx.AsyncClient) -> None:
    headers = await make_author(client, "Grace")
    idea = (
        await client.post("/api/ideas", json={"content": "Signed idea"}, headers=headers)
    ).json()
    assert idea["author"]["display_name"] == "Grace"


async def test_similar_finds_near_duplicates(client: httpx.AsyncClient) -> None:
    await client.post("/api/ideas", json={"content": "Add a dark mode to the dashboard"})
    await client.post("/api/ideas", json={"content": "Export ideas to CSV"})
    similar = (await client.get("/api/similar", params={"q": "dark mode for the dashboard"})).json()
    assert similar
    assert similar[0]["content"] == "Add a dark mode to the dashboard"


async def test_stats(client: httpx.AsyncClient) -> None:
    idea = (await client.post("/api/ideas", json={"content": "Count me"})).json()
    await client.post(f"/api/ideas/{idea['id']}/comments", json={"content": "yes"})
    stats = (await client.get("/api/stats")).json()
    assert stats == {
        "ideas": 1,
        "votes": 0,
        "comments": 1,
        "shipped": 0,
        "latest_idea_id": idea["id"],
    }
