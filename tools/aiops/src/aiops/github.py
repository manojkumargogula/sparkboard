"""Tiny helpers for GitHub Actions I/O (outputs, step summary)."""

from __future__ import annotations

import os
import uuid
from pathlib import Path


def set_output(name: str, value: str) -> None:
    """Write a (possibly multi-line) step output; no-op outside Actions."""
    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    delimiter = f"EOF_{uuid.uuid4().hex}"
    with Path(path).open("a", encoding="utf-8") as fh:
        fh.write(f"{name}<<{delimiter}\n{value}\n{delimiter}\n")


def summary(markdown: str) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with Path(path).open("a", encoding="utf-8") as fh:
            fh.write(markdown + "\n")
