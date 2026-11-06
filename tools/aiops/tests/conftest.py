from __future__ import annotations

from typing import Any, TypeVar

import pytest
from pydantic import BaseModel

from aiops.llm import LLM, LLMUnavailableError

T = TypeVar("T", bound=BaseModel)


class FakeLLM(LLM):
    """Returns canned answers keyed by schema name; raises when none is given."""

    def __init__(self, answers: dict[str, dict[str, Any]] | None = None) -> None:
        super().__init__(api_key="")
        self.answers = answers or {}
        self.prompts: list[str] = []

    @property
    def enabled(self) -> bool:
        return bool(self.answers)

    def structured(self, system: str, prompt: str, schema: type[T], effort: str = "medium") -> T:  # type: ignore[override]
        self.prompts.append(prompt)
        if schema.__name__ not in self.answers:
            raise LLMUnavailableError("no canned answer")
        return schema.model_validate(self.answers[schema.__name__])


@pytest.fixture
def offline() -> FakeLLM:
    return FakeLLM()
