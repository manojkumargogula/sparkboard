"""Any OpenAI-compatible chat endpoint (LiteLLM, OpenRouter, vLLM, Azure OpenAI)."""

from __future__ import annotations

import json

import httpx
from pydantic import ValidationError

from sparkboard_api.ai.provider import AIUnavailableError, T


class OpenAICompatProvider:
    name = "openai"

    def __init__(self, api_key: str, base_url: str, model: str, timeout: float) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )
        self._model = model

    @property
    def enabled(self) -> bool:
        return True

    async def structured(self, system: str, prompt: str, schema: type[T]) -> T:
        body = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema()},
            },
        }
        try:
            resp = await self._client.post("/chat/completions", json=body)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return schema.model_validate(json.loads(content))
        except httpx.HTTPError as exc:
            raise AIUnavailableError("AI provider unreachable") from exc
        except (KeyError, IndexError, json.JSONDecodeError, ValidationError) as exc:
            raise AIUnavailableError("AI returned an unexpected answer") from exc
