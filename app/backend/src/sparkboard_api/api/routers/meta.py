"""Supporting reads for the UI: tags, stats and near-duplicate lookup."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from sparkboard_api.api.deps import IdeaServiceDep
from sparkboard_api.schemas import SimilarIdea, Stats, TagCount

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/tags", response_model=list[TagCount])
async def tags(service: IdeaServiceDep) -> list[TagCount]:
    return await service.tags()


@router.get("/stats", response_model=Stats)
async def stats(service: IdeaServiceDep) -> Stats:
    return await service.stats()


@router.get("/similar", response_model=list[SimilarIdea])
async def similar(
    service: IdeaServiceDep,
    q: Annotated[str, Query(min_length=8, max_length=1000)],
) -> list[SimilarIdea]:
    return await service.similar(q)
