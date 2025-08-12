# app/llm_providers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any
from pydantic import BaseModel

class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_structured_response(
        self, system_prompt: str, user_prompt: str, response_model: BaseModel
    ) -> Dict[str, Any]:
        pass
