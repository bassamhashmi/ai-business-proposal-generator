from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.providers.ollama_provider import OllamaProvider

def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "ollama":
        return OllamaProvider(model=settings.ollama_model, base_url=settings.ollama_base_url)
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")