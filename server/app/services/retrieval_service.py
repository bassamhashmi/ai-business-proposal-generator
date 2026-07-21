from sqlalchemy.orm import Session
from app.db.models import PastProposal
from app.services.embedding_service import embed_text


# SQLAlchemy + pgvector do the nearest-neighbor search inside Postgres itself, not in Python.
def retrieve_similar_proposals(db: Session, query_text: str, top_k: int = 3) -> list[PastProposal]:
    query_embedding = embed_text(query_text)
    return (
        db.query(PastProposal)
        .order_by(PastProposal.embedding.cosine_distance(query_embedding))
        .limit(top_k)
        .all()
    )