"""Choose the provider from settings."""

from __future__ import annotations

from sparkboard_api.ai.anthropic import AnthropicProvider
from sparkboard_api.ai.null import NullProvider
from sparkboard_api.ai.openai_compat import OpenAICompatProvider
from sparkboard_api.ai.provider import LLMProvider
from sparkboard_api.core.config import Settings


def build_provider(settings: Settings) -> LLMProvider:
    if not settings.ai_enabled or settings.ai_api_key is None:
        return NullProvider()
    key = settings.ai_api_key.get_secret_value()
    if settings.ai_provider == "anthropic":
        return AnthropicProvider(
            key, settings.ai_model, settings.ai_effort, settings.ai_timeout_seconds
        )
    if settings.ai_base_url is None:
        return NullProvider()
    return OpenAICompatProvider(
        key, settings.ai_base_url, settings.ai_model, settings.ai_timeout_seconds
    )
