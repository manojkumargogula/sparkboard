"""A small fixed-window rate limiter keyed by client identity.

In-process by design: it protects a single replica from bursts without a
Redis dependency. Global limits belong at the edge (Vercel firewall, Ingress).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class _Window:
    started: float
    count: int = 0


@dataclass
class RateLimiter:
    limit: int
    window_seconds: int
    _windows: dict[str, _Window] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock)

    def hit(self, key: str, now: float | None = None) -> tuple[bool, int]:
        """Record a request. Returns (allowed, seconds_until_reset)."""
        current = time.monotonic() if now is None else now
        with self._lock:
            window = self._windows.get(key)
            if window is None or current - window.started >= self.window_seconds:
                window = _Window(started=current)
                self._windows[key] = window
                if len(self._windows) > 10_000:
                    self._evict(current)
            window.count += 1
            retry_after = max(0, int(self.window_seconds - (current - window.started)))
            return window.count <= self.limit, retry_after

    def _evict(self, now: float) -> None:
        stale = [k for k, w in self._windows.items() if now - w.started >= self.window_seconds]
        for key in stale:
            del self._windows[key]
