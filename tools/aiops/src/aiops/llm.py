"""One narrow door to the model.

Every call returns a pydantic object or raises ``LLMUnavailable``. Callers MUST
have a deterministic fallback, so an AI outage can slow the pipeline down but
never block a deploy or a rollback.
"""

from __future__ import annotations

import os
from typing import Literal, TypeVar

import anthropic
from anthropic.types.beta import BetaOutputConfigParam
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)
Effort = Literal["low", "medium", "high"]

DEFAULT_MODEL = "claude-opus-5-5"
_FALLBACK_BETA = "server-side-fallback-2026-07-01"


class LLMUnavailableError(RuntimeError):
    """No key, provider error, refusal or unparseable output."""


class LLM:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        key = api_key if api_key is not None else os.environ.get("ANTHROPIC_API_KEY", "")
        self.model = model or os.environ.get("AIOPS_MODEL", DEFAULT_MODEL)
        self._client = anthropic.Anthropic(api_key=key, max_retries=2) if key else None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def structured(self, system: str, prompt: str, schema: type[T], effort: Effort = "medium") -> T:
        if self._client is None:
            raise LLMUnavailableError("ANTHROPIC_API_KEY is not set")
        config: BetaOutputConfigParam = {"effort": effort}
        try:
            response = self._client.beta.messages.parse(
                model=self.model,
                max_tokens=16000,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_format=schema,
                output_config=config,
                betas=[_FALLBACK_BETA],
                fallbacks="default",
            )
        except anthropic.APIError as exc:
            raise LLMUnavailableError(f"model call failed: {exc}") from exc
        if response.stop_reason == "refusal" or response.parsed_output is None:
            raise LLMUnavailableError("model declined or returned no structured output")
        return response.parsed_output
