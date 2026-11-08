"""/api/auth: Google sign-in for this device, and sign-out."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from sparkboard_api.api.deps import DeviceHashDep, SessionDep, SettingsDep, write_limit
from sparkboard_api.api.routers.me import to_me
from sparkboard_api.core.google import InvalidTokenError, TokenVerifier
from sparkboard_api.core.logging import get_logger
from sparkboard_api.repositories.authors import AuthorRepository
from sparkboard_api.schemas import AuthConfig, GoogleSignIn, MeOut

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = get_logger(__name__)


@router.get("/config", response_model=AuthConfig)
async def auth_config(settings: SettingsDep) -> AuthConfig:
    """Public: the frontend reads the Google client ID at runtime (no rebuild per env)."""
    return AuthConfig(
        google_client_id=settings.google_client_id, auth_required=settings.auth_required
    )


@router.post("/google", response_model=MeOut, dependencies=[Depends(write_limit)])
async def google_sign_in(
    data: GoogleSignIn, request: Request, session: SessionDep, digest: DeviceHashDep
) -> MeOut:
    verifier: TokenVerifier | None = request.app.state.google_verifier
    if verifier is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Google sign-in is not configured")
    if digest is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-Device-Token header required")
    try:
        profile = await verifier(data.credential)
    except InvalidTokenError as exc:
        log.info("auth.google_rejected", reason=str(exc))
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in failed") from exc
    author = await AuthorRepository(session).sign_in_google(digest, profile)
    await session.commit()
    return to_me(author)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(session: SessionDep, digest: DeviceHashDep) -> None:
    """Forget this device; the account and its votes stay."""
    if digest is not None:
        await AuthorRepository(session).unlink_device(digest)
        await session.commit()
