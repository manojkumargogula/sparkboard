"""The provider contract every LLM backend implements."""

from __future__ import annotations

from typing import Literal, Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

Effort = Literal["low", "medium", "high"]


class AIUnavailableError(RuntimeError):
    """Raised when the provider is disabled, misconfigured or failing."""


class LLMProvider(Protocol):
    name: str

    @property
    def enabled(self) -> bool: ...

    async def structured(self, system: str, prompt: str, schema: type[T]) -> T:
        """Return the model's answer, validated against ``schema``."""
        ...
