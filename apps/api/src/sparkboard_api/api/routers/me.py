"""/api/me: the current visitor's profile (anonymous or Google-signed-in)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from sparkboard_api.api.deps import DeviceHashDep, SessionDep, SettingsDep, write_limit
from sparkboard_api.models import Author
from sparkboard_api.repositories.authors import AuthorRepository
from sparkboard_api.schemas import MeIn, MeOut

router = APIRouter(prefix="/api/me", tags=["me"])


def _require_token(digest: str | None) -> str:
    if digest is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-Device-Token header required")
    return digest


def to_me(author: Author) -> MeOut:
    return MeOut(
        display_name=author.display_name,
        avatar_seed=author.avatar_seed,
        picture_url=author.picture_url,
        signed_in=author.google_sub is not None,
    )


@router.get("", response_model=MeOut)
async def get_me(session: SessionDep, digest: DeviceHashDep) -> MeOut:
    author = await AuthorRepository(session).by_device(_require_token(digest))
    if author is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No profile yet")
    return to_me(author)


@router.put("", response_model=MeOut, dependencies=[Depends(write_limit)])
async def put_me(
    data: MeIn, session: SessionDep, digest: DeviceHashDep, settings: SettingsDep
) -> MeOut:
    """Anonymous display names. Disabled when Google sign-in is required."""
    if settings.auth_required:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sign in with Google instead")
    author = await AuthorRepository(session).save_anonymous(
        _require_token(digest), data.display_name, data.avatar_seed
    )
    await session.commit()
    return to_me(author)
