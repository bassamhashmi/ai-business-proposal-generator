from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    next_public_api_url: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/proposal_generator"
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384

    class Config:
        env_file = ".env"

settings = Settings()