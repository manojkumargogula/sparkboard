"""Liveness, readiness and Prometheus metrics."""

from __future__ import annotations

from fastapi import APIRouter, Response, status
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text

from sparkboard_api.api.deps import SessionDep, SettingsDep
from sparkboard_api.schemas import Health

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=Health)
@router.get("/api/healthz", response_model=Health, include_in_schema=False)
async def healthz(settings: SettingsDep) -> Health:
    """Process is up. Never touches dependencies, so it cannot cascade failures."""
    return Health(status="ok", release=settings.release)


@router.get("/readyz", response_model=Health)
@router.get("/api/readyz", response_model=Health, include_in_schema=False)
async def readyz(session: SessionDep, settings: SettingsDep, response: Response) -> Health:
    """Ready to serve traffic: the database answers."""
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return Health(status="degraded", release=settings.release, checks={"database": "down"})
    return Health(status="ok", release=settings.release, checks={"database": "up"})


@router.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
