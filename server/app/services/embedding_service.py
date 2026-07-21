from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.core.config import settings

# @lru_cache means the model loads from disk into memory exactly once (on first call), not on every request 
# — loading it repeatedly would add seconds of latency per request.
@lru_cache
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)

def embed_text(text: str) -> list[float]:
    model = get_embedding_model()
    # normalize_embeddings=True scales each vector to unit length, 
    # which is what makes cosine similarity comparisons well-behaved.
    return model.encode(text, normalize_embeddings=True).tolist()