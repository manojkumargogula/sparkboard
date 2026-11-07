"""Request and response contracts. Validation happens here, at the edge."""

from __future__ import annotations

import re
from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from sparkboard_api.models import IdeaStatus

_TAG_RE = re.compile(r"[^a-z0-9-]+")

Tag = Annotated[str, StringConstraints(min_length=1, max_length=24)]


def normalize_tags(raw: list[str]) -> list[str]:
    """Lower-case, slugify and de-duplicate tags while keeping their order."""
    seen: dict[str, None] = {}
    for tag in raw:
        slug = _TAG_RE.sub("-", tag.strip().lower()).strip("-")[:24]
        if slug:
            seen.setdefault(slug, None)
    return list(seen)[:5]


class SortOrder(StrEnum):
    TRENDING = "trending"
    NEW = "new"
    TOP = "top"


class AuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    display_name: str
    avatar_seed: str


class MeIn(BaseModel):
    display_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)
    ]
    avatar_seed: Annotated[str, StringConstraints(min_length=1, max_length=40)] = "spark"


class MeOut(AuthorOut):
    pass


class IdeaCreate(BaseModel):
    """The brief's contract is ``{"content": "..."}``; every other field is optional."""

    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=1000)]
    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] | None = None
    tags: list[Tag] = Field(default_factory=list, max_length=10)

    @field_validator("tags")
    @classmethod
    def _normalize(cls, value: list[str]) -> list[str]:
        return normalize_tags(value)

    @field_validator("title")
    @classmethod
    def _blank_title_is_none(cls, value: str | None) -> str | None:
        return value or None


class IdeaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_at: datetime
    title: str | None
    tags: list[str]
    status: IdeaStatus
    vote_count: int
    comment_count: int
    author: AuthorOut | None
    source: str | None = None
    source_rank: int | None = None
    source_score: float | None = None
    voted: bool = False


class StatusUpdate(BaseModel):
    status: IdeaStatus


class VoteOut(BaseModel):
    idea_id: int
    vote_count: int
    voted: bool


class CommentCreate(BaseModel):
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    idea_id: int
    content: str
    created_at: datetime
    author: AuthorOut | None


class TagCount(BaseModel):
    tag: str
    count: int


class Stats(BaseModel):
    ideas: int
    votes: int
    comments: int
    shipped: int
    latest_idea_id: int | None


class SimilarIdea(BaseModel):
    id: int
    title: str | None
    content: str
    vote_count: int
    score: float


class SharpenIn(BaseModel):
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=1000)]


class SharpenOut(BaseModel):
    title: Annotated[str, StringConstraints(max_length=120)]
    content: Annotated[str, StringConstraints(max_length=1000)]
    tags: list[str]

    @field_validator("tags")
    @classmethod
    def _normalize(cls, value: list[str]) -> list[str]:
        return normalize_tags(value)


class AiStatus(BaseModel):
    enabled: bool
    provider: str


class Health(BaseModel):
    status: str
    release: str
    checks: dict[str, str] = Field(default_factory=dict)
