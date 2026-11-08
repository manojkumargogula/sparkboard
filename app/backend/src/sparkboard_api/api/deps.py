"""Request-scoped dependencies: DB session, viewer identity, rate limits, admin."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from sparkboard_api.ai.provider import LLMProvider
from sparkboard_api.core.config import Settings
from sparkboard_api.core.db import Database
from sparkboard_api.core.ratelimit import RateLimiter
from sparkboard_api.core.security import hash_device_token, is_valid_device_token, tokens_match
from sparkboard_api.repositories.authors import AuthorRepository
from sparkboard_api.services.assistant import Assistant
from sparkboard_api.services.ideas import IdeaService


def get_settings_dep(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    db: Database = request.app.state.db
    async for session in db.session():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings_dep)]


def get_idea_service(session: SessionDep) -> IdeaService:
    return IdeaService(session)


IdeaServiceDep = Annotated[IdeaService, Depends(get_idea_service)]


def get_assistant(request: Request) -> Assistant:
    provider: LLMProvider = request.app.state.ai
    return Assistant(provider)


AssistantDep = Annotated[Assistant, Depends(get_assistant)]


def device_hash(
    x_device_token: Annotated[str | None, Header()] = None,
) -> str | None:
    if x_device_token is None:
        return None
    if not is_valid_device_token(x_device_token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed X-Device-Token header")
    return hash_device_token(x_device_token)


DeviceHashDep = Annotated[str | None, Depends(device_hash)]


@dataclass(frozen=True)
class Viewer:
    id: uuid.UUID
    signed_in: bool


async def current_viewer(session: SessionDep, digest: DeviceHashDep) -> Viewer | None:
    if digest is None:
        return None
    author = await AuthorRepository(session).by_device(digest)
    return Viewer(id=author.id, signed_in=author.google_sub is not None) if author else None


CurrentViewerDep = Annotated[Viewer | None, Depends(current_viewer)]


async def viewer_id(viewer: CurrentViewerDep) -> uuid.UUID | None:
    """The current author's id, or None for anonymous callers."""
    return viewer.id if viewer else None


ViewerDep = Annotated[uuid.UUID | None, Depends(viewer_id)]

SIGN_IN_REQUIRED = "Sign in with Google to post, vote or comment"


async def writer_id(viewer: CurrentViewerDep, settings: SettingsDep) -> uuid.UUID | None:
    """Who is writing. With AUTH_REQUIRED only signed-in Google accounts may write;
    otherwise anonymous writes stay allowed (the brief's curl contract)."""
    if settings.auth_required and (viewer is None or not viewer.signed_in):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, SIGN_IN_REQUIRED)
    return viewer.id if viewer else None


WriterDep = Annotated[uuid.UUID | None, Depends(writer_id)]


async def require_viewer(writer: WriterDep) -> uuid.UUID:
    """Votes always need an identity, so each person counts once."""
    if writer is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Pick a display name first (PUT /api/me)")
    return writer


RequiredViewerDep = Annotated[uuid.UUID, Depends(require_viewer)]


def _client_key(request: Request, digest: str | None) -> str:
    if digest:
        return f"d:{digest}"
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "?")
    return f"ip:{ip}"  # nosemgrep: directly-returned-format-string (rate-limit key, never HTML)


def _enforce(limiter: RateLimiter, key: str) -> None:
    allowed, retry_after = limiter.hit(key)
    if not allowed:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Slow down a little, then try again",
            headers={"Retry-After": str(retry_after)},
        )


def write_limit(request: Request, digest: DeviceHashDep) -> None:
    _enforce(request.app.state.write_limiter, _client_key(request, digest))


def ai_limit(request: Request, digest: DeviceHashDep) -> None:
    _enforce(request.app.state.ai_limiter, _client_key(request, digest))


def require_admin(
    settings: SettingsDep,
    x_admin_token: Annotated[str | None, Header()] = None,
) -> None:
    expected = settings.admin_token.get_secret_value() if settings.admin_token else None
    if not expected or not x_admin_token or not tokens_match(x_admin_token, expected):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin token required")
