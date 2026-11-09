"""One narrow door to the model.

Every call returns a pydantic object or raises ``LLMUnavailableError``. Callers MUST
have a deterministic fallback, so an AI outage can slow the pipeline down but
never block a deploy or a rollback.

Providers (picked from the environment, or forced with ``AIOPS_PROVIDER``):

- ``anthropic``: Claude with native structured outputs (``ANTHROPIC_API_KEY``).
- ``nvidia``: any OpenAI-compatible endpoint, by default NVIDIA's API catalog
  serving GLM (``NVIDIA_API_KEY``). The model is asked for JSON matching the
  schema, and the reply is validated against it.
- neither key set: disabled, so every feature uses its rules.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from typing import Literal, TypeVar

import anthropic
import httpx
from anthropic.types.beta import BetaOutputConfigParam
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)
Effort = Literal["low", "medium", "high"]
Provider = Literal["anthropic", "nvidia"]

DEFAULT_MODELS: dict[Provider, str] = {
    "anthropic": "claude-opus-5-5",
    # Fast and reliable on NVIDIA's API catalog with thinking off (measured 2026-11-09;
    # z-ai/glm-5.3-flash timed out on every request that day). Override with AIOPS_MODEL.
    "nvidia": "nvidia/nemotron-3.5-lightning-30b-a3b",
}
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEADLINE_SECONDS = 180
_FALLBACK_BETA = "server-side-fallback-2026-07-01"
_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)
_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$")


class LLMUnavailableError(RuntimeError):
    """No key, provider error, refusal or unparseable output."""


def _pick_provider() -> tuple[Provider | None, str]:
    forced = os.environ.get("AIOPS_PROVIDER", "").strip().lower()
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    nvidia_key = os.environ.get("NVIDIA_API_KEY", "")
    if forced == "nvidia" or (forced != "anthropic" and not anthropic_key and nvidia_key):
        return ("nvidia", nvidia_key) if nvidia_key else (None, "")
    if anthropic_key:
        return "anthropic", anthropic_key
    return None, ""


def extract_json(text: str) -> str:
    """Pull the JSON object out of a chat reply (drops reasoning and code fences)."""
    cleaned = _FENCE.sub("", _THINK.sub("", text).strip()).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end <= start:
        raise LLMUnavailableError("model reply contained no JSON object")
    return cleaned[start : end + 1]


_TOO_LONG = {"too_long", "string_too_long"}


def validate_lenient[M: BaseModel](schema: type[M], raw: str) -> M:
    """Validate, trimming only over-long lists/strings (the usual JSON-mode overshoot).

    Anything else that breaks the schema still raises, so the caller uses its rules.
    """
    data = json.loads(raw)
    try:
        return schema.model_validate(data)
    except ValidationError as exc:
        errors = exc.errors()
        if not errors or any(e["type"] not in _TOO_LONG for e in errors):
            raise
        for err in errors:
            *path, last = err["loc"]
            node = data
            for key in path:
                node = node[key]
            node[last] = node[last][: err["ctx"]["max_length"]]
        return schema.model_validate(data)


class LLM:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        provider: Provider | None = None,
        http: httpx.Client | None = None,
    ) -> None:
        self.provider: Provider | None
        if api_key is not None:  # explicit key: tests and callers that know the provider
            self.provider = (provider or "anthropic") if api_key else None
            key = api_key
        else:
            self.provider, key = _pick_provider()
        default = DEFAULT_MODELS[self.provider] if self.provider else ""
        self.model = model or os.environ.get("AIOPS_MODEL") or default
        self._anthropic: anthropic.Anthropic | None = None
        self._http: httpx.Client | None = None
        if self.provider == "anthropic":
            self._anthropic = anthropic.Anthropic(api_key=key, max_retries=2)
        elif self.provider == "nvidia":
            self._http = http or httpx.Client(
                base_url=os.environ.get("AIOPS_BASE_URL", NVIDIA_BASE_URL),
                headers={"Authorization": f"Bearer {key}"},
                timeout=httpx.Timeout(DEADLINE_SECONDS, read=60),
            )

    @property
    def enabled(self) -> bool:
        return self.provider is not None

    def structured(self, system: str, prompt: str, schema: type[T], effort: Effort = "medium") -> T:
        try:
            if self._anthropic is not None:
                return self._anthropic_structured(self._anthropic, system, prompt, schema, effort)
            if self._http is not None:
                return self._openai_structured(self._http, system, prompt, schema)
        except LLMUnavailableError as exc:
            # Visible in the Actions log and as a run annotation; the caller falls back to rules.
            reason = str(exc).replace("\n", " ")[:500]
            print(f"::warning title=AI fallback ({schema.__name__})::{reason}", file=sys.stderr)
            raise
        raise LLMUnavailableError("no model configured (set NVIDIA_API_KEY or ANTHROPIC_API_KEY)")

    def _anthropic_structured(
        self, client: anthropic.Anthropic, system: str, prompt: str, schema: type[T], effort: Effort
    ) -> T:
        config: BetaOutputConfigParam = {"effort": effort}
        try:
            response = client.beta.messages.parse(
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

    def _openai_structured(
        self, client: httpx.Client, system: str, prompt: str, schema: type[T]
    ) -> T:
        contract = (
            "\n\nReply with ONE JSON object and nothing else (no prose, no code fences). "
            "It must validate against this JSON Schema:\n"
            + json.dumps(schema.model_json_schema(), separators=(",", ":"))
        )
        messages: list[dict[str, str]] = [
            {"role": "system", "content": system + contract},
            {"role": "user", "content": prompt},
        ]
        body: dict[str, object] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 4096,
            "stream": True,
        }
        if os.environ.get("AIOPS_THINKING", "off") != "on":
            # Reasoning models otherwise spend the token budget thinking before answering.
            body["chat_template_kwargs"] = {"enable_thinking": False}
        text = _complete(client, body)
        try:
            return validate_lenient(schema, extract_json(text))
        except (ValidationError, ValueError, LLMUnavailableError) as first:
            # One repair round: show the model its answer and the exact errors.
            body["messages"] = [
                *messages,
                {"role": "assistant", "content": text},
                {
                    "role": "user",
                    "content": "That JSON failed validation:\n"
                    + str(first)[:2000]
                    + "\nReturn the corrected JSON object only.",
                },
            ]
            text = _complete(client, body)
        try:
            return validate_lenient(schema, extract_json(text))
        except (ValidationError, ValueError) as exc:
            raise LLMUnavailableError(f"model output did not match the schema: {exc}") from exc


def _complete(client: httpx.Client, body: dict[str, object]) -> str:
    try:
        with client.stream("POST", "/chat/completions", json=body) as response:
            response.raise_for_status()
            return _read_reply(response)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise LLMUnavailableError(f"model call failed: {exc}") from exc


def _read_reply(response: httpx.Response) -> str:
    """Collect the answer from a streamed (SSE) or plain JSON chat completion.

    Streaming keeps a slow-but-working model distinguishable from a dead one, and a
    hard deadline stops a model that keeps streaming without finishing.
    """
    if "text/event-stream" not in response.headers.get("content-type", ""):
        response.read()
        return str(response.json()["choices"][0]["message"]["content"] or "")
    deadline = time.monotonic() + DEADLINE_SECONDS
    parts: list[str] = []
    for line in response.iter_lines():
        if time.monotonic() > deadline:
            raise LLMUnavailableError(f"model did not finish within {DEADLINE_SECONDS}s")
        if not line.startswith("data: ") or line == "data: [DONE]":
            continue
        for choice in json.loads(line[6:]).get("choices") or []:
            parts.append(choice.get("delta", {}).get("content") or "")
    return "".join(parts)
