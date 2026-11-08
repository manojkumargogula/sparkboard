"""Vercel Python entry point: exposes the FastAPI ASGI app as a serverless function.

All /api/* requests are rewritten here by vercel.json. The app package lives in
app/backend/src and is bundled into the function via `includeFiles`.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "app" / "backend" / "src"))

from sparkboard_api.main import app  # noqa: E402

__all__ = ["app"]
