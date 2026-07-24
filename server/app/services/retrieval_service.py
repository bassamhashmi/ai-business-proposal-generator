from sqlalchemy.orm import Session, joinedload
from app.db.models import ProposalChunk
from app.services.embedding_service import embed_text
from app.core.config import settings

def retrieve_similar_chunks(db: Session, query_text: str, top_k: int = 5) -> list[ProposalChunk]:
    query_embedding = embed_text(query_text)
    distance = ProposalChunk.embedding.cosine_distance(query_embedding).label("distance")
    candidates = (
        db.query(ProposalChunk)
        .options(joinedload(ProposalChunk.proposal))
        .add_columns(distance)
        .order_by(distance)
        .limit(settings.retrieval_candidate_count)
        .all()
    )
    selected: list[ProposalChunk] = []
    seen_proposals: set[int] = set()
    for chunk, chunk_distance in candidates:
        if float(chunk_distance) > settings.retrieval_max_distance:
            continue
        if chunk.proposal_id in seen_proposals:
            continue
        chunk.retrieval_score = round(1 - float(chunk_distance), 4)
        selected.append(chunk)
        seen_proposals.add(chunk.proposal_id)
        if len(selected) >= top_k:
            break
    return selected
