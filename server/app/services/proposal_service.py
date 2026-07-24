import json
import logging
import time
from sqlalchemy.orm import Session
from pydantic import ValidationError
from app.llm.base import LLMProvider
from app.schemas.proposal_request import ProposalRequest
from app.schemas.proposal_output import ProposalOutput
from app.prompts.proposal_prompts import SYSTEM_PROMPT, build_user_prompt, build_retrieval_query
from app.services.retrieval_service import retrieve_similar_chunks
from app.core.logging import log_event

logger = logging.getLogger(__name__)

class ProposalGenerationError(Exception):
    pass

async def generate_proposal(req: ProposalRequest, llm: LLMProvider, db: Session, retries: int = 1) -> ProposalOutput:
    retrieval_query = build_retrieval_query(req)
    
    chunks = retrieve_similar_chunks(db, retrieval_query, top_k=5)
    prompt = build_user_prompt(req, chunks)
    
    schema = ProposalOutput.model_json_schema()

    last_error = None
    for attempt in range(retries + 1):
        started = time.perf_counter()
        try:
            raw = await llm.generate_structured(SYSTEM_PROMPT, prompt, schema, num_predict=4000)
            log_event(
                logger,
                "proposal_generation_completed",
                attempt=attempt + 1,
                chunk_count=len(chunks),
                retrieval_scores=[getattr(chunk, "retrieval_score", None) for chunk in chunks],
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            return ProposalOutput(**raw)
        except (json.JSONDecodeError, ValidationError) as e:
            log_event(
                logger,
                "proposal_generation_attempt_failed",
                attempt=attempt + 1,
                error_type=type(e).__name__,
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            last_error = e
            continue
        except Exception as e:
            log_event(
                logger,
                "proposal_generation_attempt_failed",
                attempt=attempt + 1,
                error_type=type(e).__name__,
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            last_error = e
            continue

    raise ProposalGenerationError(
        f"Model failed to produce valid structured output after {retries + 1} attempts: {last_error}"
    )
