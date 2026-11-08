"""Device identity and admin checks.

Sparkboard has no passwords. The browser generates a random device token and
sends it as ``X-Device-Token``; only its SHA-256 digest is ever stored, so a
database leak cannot be replayed as an identity.
"""

from __future__ import annotations

import hashlib
import hmac
import re

_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{32,128}$")


def is_valid_device_token(token: str) -> bool:
    return bool(_TOKEN_RE.fullmatch(token))


def hash_device_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_match(provided: str, expected: str) -> bool:
    return hmac.compare_digest(provided.encode(), expected.encode())
