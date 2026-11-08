"""Pluggable LLM providers. The rest of the app depends only on ``LLMProvider``."""

from sparkboard_api.ai.factory import build_provider
from sparkboard_api.ai.provider import AIUnavailableError, LLMProvider

__all__ = ["AIUnavailableError", "LLMProvider", "build_provider"]
