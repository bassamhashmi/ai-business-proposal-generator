from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_research_model: str | None = None
    ollama_extraction_model: str | None = None
    ollama_generation_model: str | None = None
    next_public_api_url: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/proposal_generator"
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384
    max_request_body_bytes: int = 10 * 1024 * 1024
    max_upload_bytes: int = 8 * 1024 * 1024
    max_pdf_pages: int = 100
    max_extracted_text_chars: int = 250_000
    website_max_response_bytes: int = 8 * 1024 * 1024
    website_max_redirects: int = 3
    # Temporary local-development diagnostic. Set to false before handling
    # sensitive production proposal data.
    log_llm_responses: bool = True
    research_cache_ttl_seconds: int = 3600
    research_cache_max_entries: int = 200

    class Config:
        env_file = ".env"

settings = Settings()
