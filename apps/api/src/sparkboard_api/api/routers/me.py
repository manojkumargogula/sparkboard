"""/api/me: the anonymous device profile (display name + avatar)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from sparkboard_api.api.deps import DeviceHashDep, SessionDep, write_limit
from sparkboard_api.repositories.authors import AuthorRepository
from sparkboard_api.schemas import MeIn, MeOut

router = APIRouter(prefix="/api/me", tags=["me"])


def _require_token(digest: str | None) -> str:
    if digest is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-Device-Token header required")
    return digest


@router.get("", response_model=MeOut)
async def get_me(session: SessionDep, digest: DeviceHashDep) -> MeOut:
    author = await AuthorRepository(session).by_device(_require_token(digest))
    if author is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No profile yet")
    return MeOut.model_validate(author)


@router.put("", response_model=MeOut, dependencies=[Depends(write_limit)])
async def put_me(data: MeIn, session: SessionDep, digest: DeviceHashDep) -> MeOut:
    author = await AuthorRepository(session).upsert(
        _require_token(digest), data.display_name, data.avatar_seed
    )
    await session.commit()
    return MeOut.model_validate(author)
