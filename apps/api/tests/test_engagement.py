"""Votes, comments, profiles and admin status changes."""

from __future__ import annotations

import httpx

from tests.conftest import ADMIN_TOKEN, make_author, new_token


async def test_vote_is_idempotent_and_reversible(client: httpx.AsyncClient) -> None:
    idea = (await client.post("/api/ideas", json={"content": "Vote on me"})).json()
    voter = await make_author(client)
    url = f"/api/ideas/{idea['id']}/vote"

    first = (await client.put(url, headers=voter)).json()
    again = (await client.put(url, headers=voter)).json()
    assert first == again == {"idea_id": idea["id"], "vote_count": 1, "voted": True}

    listed = (await client.get("/api/ideas", headers=voter)).json()
    assert listed[0]["voted"] is True

    removed = (await client.delete(url, headers=voter)).json()
    assert removed["vote_count"] == 0
    assert (await client.delete(url, headers=voter)).json()["vote_count"] == 0


async def test_vote_requires_profile(client: httpx.AsyncClient) -> None:
    idea = (await client.post("/api/ideas", json={"content": "Vote on me"})).json()
    url = f"/api/ideas/{idea['id']}/vote"
    assert (await client.put(url)).status_code == 401
    assert (await client.put(url, headers={"X-Device-Token": new_token()})).status_code == 401
    assert (await client.put(url, headers={"X-Device-Token": "short"})).status_code == 400
    voter = await make_author(client)
    assert (await client.put("/api/ideas/424242/vote", headers=voter)).status_code == 404
    assert (await client.delete("/api/ideas/424242/vote", headers=voter)).status_code == 404


async def test_comments_flow(client: httpx.AsyncClient) -> None:
    idea = (await client.post("/api/ideas", json={"content": "Discuss me"})).json()
    author = await make_author(client, "Linus")
    url = f"/api/ideas/{idea['id']}/comments"
    made = await client.post(url, json={"content": "  Love it  "}, headers=author)
    assert made.status_code == 201
    assert made.json()["content"] == "Love it"
    comments = (await client.get(url)).json()
    assert [c["author"]["display_name"] for c in comments] == ["Linus"]
    assert (await client.get(f"/api/ideas/{idea['id']}")).json()["comment_count"] == 1
    assert (await client.get("/api/ideas/999/comments")).status_code == 404
    assert (await client.post("/api/ideas/999/comments", json={"content": "x"})).status_code == 404


async def test_profile_roundtrip(client: httpx.AsyncClient) -> None:
    token = {"X-Device-Token": new_token()}
    assert (await client.get("/api/me")).status_code == 401
    assert (await client.get("/api/me", headers=token)).status_code == 404
    await client.put("/api/me", json={"display_name": "Ada", "avatar_seed": "a"}, headers=token)
    await client.put("/api/me", json={"display_name": "Ada L", "avatar_seed": "b"}, headers=token)
    me = (await client.get("/api/me", headers=token)).json()
    assert me == {"display_name": "Ada L", "avatar_seed": "b"}
    assert (await client.put("/api/me", json={"display_name": "x"})).status_code == 401


async def test_status_change_needs_admin(client: httpx.AsyncClient) -> None:
    idea = (await client.post("/api/ideas", json={"content": "Ship me"})).json()
    url = f"/api/ideas/{idea['id']}/status"
    assert (await client.patch(url, json={"status": "shipped"})).status_code == 403
    wrong = {"X-Admin-Token": "nope"}
    assert (await client.patch(url, json={"status": "shipped"}, headers=wrong)).status_code == 403

    admin = {"X-Admin-Token": ADMIN_TOKEN}
    shipped = await client.patch(url, json={"status": "shipped"}, headers=admin)
    assert shipped.json()["status"] == "shipped"
    roadmap = (await client.get("/api/ideas", params={"status": "shipped"})).json()
    assert [i["id"] for i in roadmap] == [idea["id"]]
    missing = await client.patch("/api/ideas/9999/status", json={"status": "open"}, headers=admin)
    assert missing.status_code == 404
