"""Vercel Python entry point: exposes the FastAPI ASGI app as a serverless function.

All /api/* requests are rewritten here by vercel.json. The app package lives in
apps/api/src and is bundled into the function via `includeFiles`.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api" / "src"))

from sparkboard_api.main import app  # noqa: E402

__all__ = ["app"]
