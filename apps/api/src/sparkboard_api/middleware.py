"""Request id, access logging and Prometheus RED metrics."""

from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from sparkboard_api.core.logging import get_logger

REQUESTS = Counter("sparkboard_http_requests_total", "HTTP requests", ["method", "route", "status"])
LATENCY = Histogram(
    "sparkboard_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "route"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
)
log = get_logger("http")


def _route_template(request: Request) -> str:
    """The matched route template (``/api/ideas/{idea_id}``), never the raw path,
    so metric cardinality stays bounded. The router records it on the scope."""
    route = request.scope.get("route")
    return str(getattr(route, "path", "unmatched"))


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        structlog.contextvars.bind_contextvars(request_id=request_id)
        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
        finally:
            route = _route_template(request)
            elapsed = time.perf_counter() - started
            REQUESTS.labels(request.method, route, str(status_code)).inc()
            LATENCY.labels(request.method, route).observe(elapsed)
            if route not in {"/healthz", "/readyz", "/metrics"}:
                log.info(
                    "request",
                    method=request.method,
                    route=route,
                    status=status_code,
                    duration_ms=round(elapsed * 1000, 1),
                )
            structlog.contextvars.clear_contextvars()
        response.headers["X-Request-Id"] = request_id
        return response
