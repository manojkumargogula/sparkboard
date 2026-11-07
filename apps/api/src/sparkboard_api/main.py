"""Application factory. ``app`` is the ASGI entry point for uvicorn and Vercel."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from sparkboard_api import __version__
from sparkboard_api.ai import build_provider
from sparkboard_api.api.routers import ai, auth, health, ideas, me, meta
from sparkboard_api.core.config import Settings, get_settings
from sparkboard_api.core.db import Database
from sparkboard_api.core.google import GoogleVerifier
from sparkboard_api.core.logging import configure_logging
from sparkboard_api.core.ratelimit import RateLimiter
from sparkboard_api.middleware import ObservabilityMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield
        await app.state.db.dispose()

    app = FastAPI(
        title="Sparkboard API",
        version=__version__,
        description="Ideas, votes and comments for Sparkboard by Infrenic.",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.db = Database(settings)
    app.state.ai = build_provider(settings)
    app.state.google_verifier = (
        GoogleVerifier(settings.google_client_id) if settings.google_client_id else None
    )
    window = settings.rate_limit_window_seconds
    app.state.write_limiter = RateLimiter(settings.rate_limit_writes, window)
    app.state.ai_limiter = RateLimiter(settings.rate_limit_ai, window)

    app.add_middleware(ObservabilityMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Device-Token", "X-Admin-Token", "X-Request-Id"],
        expose_headers=["X-Next-Offset", "X-Request-Id"],
    )

    for router in (health.router, ideas.router, meta.router, me.router, auth.router, ai.router):
        app.include_router(router)
    return app


app = create_app()
