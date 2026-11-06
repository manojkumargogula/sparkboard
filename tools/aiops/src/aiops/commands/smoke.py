"""Synthetic probe of a deployment: read-only requests, latency and error rate."""

from __future__ import annotations

import statistics
import time

import httpx
from pydantic import BaseModel

PATHS = ["/", "/api/healthz", "/api/readyz", "/api/ideas?limit=20", "/api/stats", "/api/tags"]


class PathStats(BaseModel):
    path: str
    requests: int
    errors: int
    p95_ms: float


class SmokeResult(BaseModel):
    base_url: str
    requests: int
    errors: int
    error_rate: float
    p50_ms: float
    p95_ms: float
    paths: list[PathStats]
    failures: list[str]


def _p95(values: list[float]) -> float:
    if len(values) < 2:
        return values[0] if values else 0.0
    return statistics.quantiles(values, n=20)[-1]


def run(
    base_url: str,
    rounds: int = 5,
    client: httpx.Client | None = None,
    headers: dict[str, str] | None = None,
) -> SmokeResult:
    """Probe ``base_url``. ``headers`` carries e.g. a Vercel protection-bypass token."""
    http = client or httpx.Client(timeout=10, follow_redirects=True, headers=headers or {})
    latencies: dict[str, list[float]] = {p: [] for p in PATHS}
    errors: dict[str, int] = dict.fromkeys(PATHS, 0)
    failures: list[str] = []
    for _ in range(rounds):
        for path in PATHS:
            started = time.perf_counter()
            try:
                resp = http.get(base_url.rstrip("/") + path)
                ok = resp.status_code < 400
                detail = f"{path} → {resp.status_code}"
            except httpx.HTTPError as exc:
                ok, detail = False, f"{path} → {type(exc).__name__}"
            latencies[path].append((time.perf_counter() - started) * 1000)
            if not ok:
                errors[path] += 1
                failures.append(detail)
    every = [ms for values in latencies.values() for ms in values]
    total = len(every)
    err = sum(errors.values())
    return SmokeResult(
        base_url=base_url,
        requests=total,
        errors=err,
        error_rate=round(err / total, 4) if total else 1.0,
        p50_ms=round(statistics.median(every), 1) if every else 0.0,
        p95_ms=round(_p95(every), 1),
        paths=[
            PathStats(path=p, requests=len(v), errors=errors[p], p95_ms=round(_p95(v), 1))
            for p, v in latencies.items()
        ],
        failures=failures[:20],
    )
