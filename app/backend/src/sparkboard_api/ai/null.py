"""Provider used when AI is switched off. Every call fails fast and clearly."""

from __future__ import annotations

from sparkboard_api.ai.provider import AIUnavailableError, T


class NullProvider:
    name = "none"

    @property
    def enabled(self) -> bool:
        return False

    async def structured(self, system: str, prompt: str, schema: type[T]) -> T:  # noqa: ARG002
        raise AIUnavailableError("AI features are not configured")
