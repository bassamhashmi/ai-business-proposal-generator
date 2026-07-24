from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.providers.ollama_provider import OllamaProvider

def get_llm_provider(purpose: str = "generation") -> LLMProvider:
    if settings.llm_provider == "ollama":
        models = {
            "research": settings.ollama_research_model,
            "extraction": settings.ollama_extraction_model,
            "generation": settings.ollama_generation_model,
        }
        if purpose not in models:
            raise ValueError(f"Unknown LLM purpose: {purpose}")
        return OllamaProvider(
            model=models[purpose] or settings.ollama_model,
            base_url=settings.ollama_base_url,
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")
