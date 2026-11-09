import json

import httpx
import pytest
from pydantic import BaseModel

from aiops import llm as llm_mod
from aiops.llm import LLM, LLMUnavailableError, extract_json


class Verdict(BaseModel):
    healthy: bool
    confidence: float


def nvidia(handler: httpx.MockTransport) -> LLM:
    http = httpx.Client(base_url="https://nim.test/v1", transport=handler)
    return LLM(api_key="nvapi-test", provider="nvidia", http=http)


def reply(content: str, status: int = 200) -> httpx.MockTransport:
    def handle(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert request.url.path == "/v1/chat/completions"
        assert body["model"] == "z-ai/glm-5.3-flash"
        assert "JSON Schema" in body["messages"][0]["content"]
        return httpx.Response(status, json={"choices": [{"message": {"content": content}}]})

    return httpx.MockTransport(handle)


def test_openai_compatible_reply_is_validated() -> None:
    text = '<think>checking logs</think>\n```json\n{"healthy": true, "confidence": 0.9}\n```'
    out = nvidia(reply(text)).structured("sys", "prompt", Verdict)
    assert out == Verdict(healthy=True, confidence=0.9)


def test_reply_that_breaks_the_schema_is_unavailable() -> None:
    with pytest.raises(LLMUnavailableError, match="did not match"):
        nvidia(reply('{"healthy": "maybe"}')).structured("s", "p", Verdict)


def test_http_errors_and_prose_are_unavailable() -> None:
    with pytest.raises(LLMUnavailableError, match="model call failed"):
        nvidia(reply("{}", status=503)).structured("s", "p", Verdict)
    with pytest.raises(LLMUnavailableError, match="no JSON object"):
        extract_json("I think it is fine.")


def test_provider_is_picked_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in ("AIOPS_PROVIDER", "ANTHROPIC_API_KEY", "NVIDIA_API_KEY", "AIOPS_MODEL"):
        monkeypatch.delenv(var, raising=False)
    assert LLM().enabled is False
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-x")
    nim = LLM()
    assert (nim.provider, nim.model) == ("nvidia", "z-ai/glm-5.3-flash")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-x")
    assert LLM().provider == "anthropic"
    monkeypatch.setenv("AIOPS_PROVIDER", "nvidia")
    assert LLM().provider == "nvidia"
    assert llm_mod.DEFAULT_MODELS["nvidia"] == "z-ai/glm-5.3-flash"
