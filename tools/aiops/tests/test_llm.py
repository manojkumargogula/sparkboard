import json

import httpx
import pytest
from pydantic import BaseModel, Field

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
        assert body["chat_template_kwargs"] == {"enable_thinking": False}
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
    assert (nim.provider, nim.model) == ("nvidia", llm_mod.DEFAULT_MODELS["nvidia"])
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-x")
    assert LLM().provider == "anthropic"
    monkeypatch.setenv("AIOPS_PROVIDER", "nvidia")
    assert LLM().provider == "nvidia"


def test_streamed_reply_is_assembled() -> None:
    chunks = ['{"healthy": ', "false, ", '"confidence": 0.85}']
    sse = (
        "".join(f"data: {json.dumps({'choices': [{'delta': {'content': c}}]})}\n\n" for c in chunks)
        + "data: [DONE]\n\n"
    )

    def handle(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, text=sse)

    out = nvidia(httpx.MockTransport(handle)).structured("s", "p", Verdict)
    assert out == Verdict(healthy=False, confidence=0.85)


class Short(BaseModel):
    reasons: list[str] = Field(max_length=2)
    summary: str = Field(max_length=5)
    healthy: bool


def test_overlong_fields_are_trimmed_but_wrong_types_still_fail() -> None:
    raw = '{"reasons": ["a", "b", "c"], "summary": "too long", "healthy": true}'
    out = llm_mod.validate_lenient(Short, raw)
    assert out == Short(reasons=["a", "b"], summary="too l", healthy=True)
    with pytest.raises(ValueError):
        llm_mod.validate_lenient(Short, '{"reasons": [], "summary": "x", "healthy": "maybe"}')


def test_one_repair_round_fixes_a_bad_reply() -> None:
    replies = iter(
        ['{"healthy": "maybe", "confidence": 0.5}', '{"healthy": false, "confidence": 0.5}']
    )
    seen: list[int] = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(len(json.loads(request.content)["messages"]))
        return httpx.Response(200, json={"choices": [{"message": {"content": next(replies)}}]})

    out = nvidia(httpx.MockTransport(handle)).structured("s", "p", Verdict)
    assert out == Verdict(healthy=False, confidence=0.5)
    assert seen == [2, 4]  # second call carries the bad answer and the errors
