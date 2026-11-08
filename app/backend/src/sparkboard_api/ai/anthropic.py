"""Claude via the official Anthropic SDK, with schema-validated output."""

from __future__ import annotations

import anthropic

from sparkboard_api.ai.provider import AIUnavailableError, Effort, T

# Server-side fallback reroutes a safety decline to a suitable model in the same call.
_FALLBACK_BETA = "server-side-fallback-2026-07-01"


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str, effort: Effort, timeout: float) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key, timeout=timeout, max_retries=1)
        self._model = model
        self._effort: Effort = effort

    @property
    def enabled(self) -> bool:
        return True

    async def structured(self, system: str, prompt: str, schema: type[T]) -> T:
        try:
            response = await self._client.beta.messages.parse(
                model=self._model,
                max_tokens=4000,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_format=schema,
                output_config={"effort": self._effort},
                betas=[_FALLBACK_BETA],
                fallbacks="default",
            )
        except anthropic.RateLimitError as exc:
            raise AIUnavailableError("AI is busy, try again in a moment") from exc
        except anthropic.APIStatusError as exc:
            raise AIUnavailableError(f"AI provider error ({exc.status_code})") from exc
        except anthropic.APIConnectionError as exc:
            raise AIUnavailableError("AI provider unreachable") from exc

        if response.stop_reason == "refusal" or response.parsed_output is None:
            raise AIUnavailableError("AI declined this request")
        return response.parsed_output
