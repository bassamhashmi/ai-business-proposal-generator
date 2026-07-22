from sqlalchemy.orm import Session, joinedload
from app.db.models import ProposalChunk
from app.services.embedding_service import embed_text

def retrieve_similar_chunks(db: Session, query_text: str, top_k: int = 5) -> list[ProposalChunk]:
    query_embedding = embed_text(query_text)
    return (
        db.query(ProposalChunk)
        .options(joinedload(ProposalChunk.proposal))
        .order_by(ProposalChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
        .all()
    )