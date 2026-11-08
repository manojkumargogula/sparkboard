"""HTTP-level tests for the OpenAI-compatible adapter (no network)."""

from __future__ import annotations

import json

import httpx
import pytest
import respx
from pydantic import BaseModel

from sparkboard_api.ai.openai_compat import OpenAICompatProvider
from sparkboard_api.ai.provider import AIUnavailableError


class Answer(BaseModel):
    title: str


@respx.mock
async def test_openai_compat_success() -> None:
    route = respx.post("http://llm/v1/chat/completions").mock(
        return_value=httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps({"title": "ok"})}}]}
        )
    )
    provider = OpenAICompatProvider("k", "http://llm/v1/", "m", 5)
    assert (await provider.structured("s", "p", Answer)).title == "ok"
    sent = json.loads(route.calls[0].request.content)
    assert sent["response_format"]["json_schema"]["name"] == "Answer"


@respx.mock
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(500),
        httpx.Response(200, json={"choices": []}),
        httpx.Response(200, json={"choices": [{"message": {"content": "not json"}}]}),
        httpx.Response(200, json={"choices": [{"message": {"content": "{}"}}]}),
    ],
)
async def test_openai_compat_failures(response: httpx.Response) -> None:
    respx.post("http://llm/v1/chat/completions").mock(return_value=response)
    provider = OpenAICompatProvider("k", "http://llm/v1", "m", 5)
    with pytest.raises(AIUnavailableError):
        await provider.structured("s", "p", Answer)
