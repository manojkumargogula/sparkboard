"""/api/ideas: the brief's GET/POST contract plus votes, comments and status."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from sparkboard_api.api.deps import (
    IdeaServiceDep,
    RequiredViewerDep,
    ViewerDep,
    require_admin,
    write_limit,
)
from sparkboard_api.models import IdeaStatus
from sparkboard_api.repositories.ideas import IdeaQuery
from sparkboard_api.schemas import (
    CommentCreate,
    CommentOut,
    IdeaCreate,
    IdeaOut,
    SortOrder,
    StatusUpdate,
    VoteOut,
)
from sparkboard_api.services.ideas import NotFoundError

router = APIRouter(prefix="/api/ideas", tags=["ideas"])


def _not_found(idea_id: int) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"Idea {idea_id} not found")


def feed_query(
    *,
    sort: SortOrder = SortOrder.TRENDING,
    tag: Annotated[str | None, Query(max_length=24)] = None,
    idea_status: Annotated[IdeaStatus | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0, le=10_000)] = 0,
) -> IdeaQuery:
    return IdeaQuery(sort=sort, tag=tag, status=idea_status, search=q, limit=limit, offset=offset)


@router.get("", response_model=list[IdeaOut])
async def list_ideas(
    service: IdeaServiceDep,
    viewer: ViewerDep,
    response: Response,
    query: Annotated[IdeaQuery, Depends(feed_query)],
) -> list[IdeaOut]:
    """Return ideas as a JSON array. Paging is via ``limit``/``offset``;
    ``X-Next-Offset`` is set when another page may exist."""
    ideas = await service.feed(query, viewer)
    if len(ideas) == query.limit:
        response.headers["X-Next-Offset"] = str(query.offset + query.limit)
    return ideas


@router.post(
    "",
    response_model=IdeaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(write_limit)],
)
async def create_idea(data: IdeaCreate, service: IdeaServiceDep, viewer: ViewerDep) -> IdeaOut:
    return await service.create(data, viewer)


@router.get("/{idea_id}", response_model=IdeaOut)
async def get_idea(idea_id: int, service: IdeaServiceDep, viewer: ViewerDep) -> IdeaOut:
    try:
        return await service.get(idea_id, viewer)
    except NotFoundError:
        raise _not_found(idea_id) from None


@router.put("/{idea_id}/vote", response_model=VoteOut, dependencies=[Depends(write_limit)])
async def upvote(idea_id: int, service: IdeaServiceDep, viewer: RequiredViewerDep) -> VoteOut:
    try:
        return await service.vote(idea_id, viewer, up=True)
    except NotFoundError:
        raise _not_found(idea_id) from None


@router.delete("/{idea_id}/vote", response_model=VoteOut, dependencies=[Depends(write_limit)])
async def unvote(idea_id: int, service: IdeaServiceDep, viewer: RequiredViewerDep) -> VoteOut:
    try:
        return await service.vote(idea_id, viewer, up=False)
    except NotFoundError:
        raise _not_found(idea_id) from None


@router.get("/{idea_id}/comments", response_model=list[CommentOut])
async def list_comments(idea_id: int, service: IdeaServiceDep) -> list[CommentOut]:
    try:
        return await service.comments(idea_id)
    except NotFoundError:
        raise _not_found(idea_id) from None


@router.post(
    "/{idea_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(write_limit)],
)
async def add_comment(
    idea_id: int, data: CommentCreate, service: IdeaServiceDep, viewer: ViewerDep
) -> CommentOut:
    try:
        return await service.add_comment(idea_id, data.content, viewer)
    except NotFoundError:
        raise _not_found(idea_id) from None


@router.patch("/{idea_id}/status", response_model=IdeaOut, dependencies=[Depends(require_admin)])
async def set_status(idea_id: int, data: StatusUpdate, service: IdeaServiceDep) -> IdeaOut:
    try:
        return await service.set_status(idea_id, data.status)
    except NotFoundError:
        raise _not_found(idea_id) from None
