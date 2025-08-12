# app/llm_providers/factory.py
import os
from functools import lru_cache
from .base import BaseLLMProvider
from .anthropic_provider import AnthropicProvider

@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    provider_name = os.getenv("LLM_PROVIDER", "anthropic").lower()
    if provider_name == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set.")
        return AnthropicProvider(api_key=api_key)
    raise ValueError(f"Unsupported LLM provider: {provider_name}")
