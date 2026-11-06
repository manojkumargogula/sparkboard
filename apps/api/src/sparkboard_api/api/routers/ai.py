"""/api/ai: optional AI helpers. Hidden by the UI when ``enabled`` is false."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from sparkboard_api.ai.provider import AIUnavailableError
from sparkboard_api.api.deps import AssistantDep, SettingsDep, ai_limit
from sparkboard_api.core.logging import get_logger
from sparkboard_api.schemas import AiStatus, SharpenIn, SharpenOut

router = APIRouter(prefix="/api/ai", tags=["ai"])
log = get_logger(__name__)


@router.get("/status", response_model=AiStatus)
async def ai_status(assistant: AssistantDep, settings: SettingsDep) -> AiStatus:
    return AiStatus(
        enabled=assistant.enabled,
        provider=settings.ai_provider if assistant.enabled else "none",
    )


@router.post("/sharpen", response_model=SharpenOut, dependencies=[Depends(ai_limit)])
async def sharpen(data: SharpenIn, assistant: AssistantDep) -> SharpenOut:
    if not assistant.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "AI features are not enabled")
    try:
        return await assistant.sharpen(data.content)
    except AIUnavailableError as exc:
        log.warning("ai.sharpen_failed", reason=str(exc))
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
