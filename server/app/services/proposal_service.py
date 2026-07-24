import json
from sqlalchemy.orm import Session
from pydantic import ValidationError
from app.llm.base import LLMProvider
from app.schemas.proposal_request import ProposalRequest
from app.schemas.proposal_output import ProposalOutput
from app.prompts.proposal_prompts import SYSTEM_PROMPT, build_user_prompt, build_retrieval_query
from app.services.retrieval_service import retrieve_similar_chunks

class ProposalGenerationError(Exception):
    pass

async def generate_proposal(req: ProposalRequest, llm: LLMProvider, db: Session, retries: int = 1) -> ProposalOutput:
    retrieval_query = build_retrieval_query(req)
    
    chunks = retrieve_similar_chunks(db, retrieval_query, top_k=5)
    prompt = build_user_prompt(req, chunks)
    
    schema = ProposalOutput.model_json_schema()

    last_error = None
    for attempt in range(retries + 1):
        try:
            raw = await llm.generate_structured(SYSTEM_PROMPT, prompt, schema, num_predict=4000)
            return ProposalOutput(**raw)
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Attempt {attempt + 1} failed: {type(e).__name__}: {e}")
            last_error = e
            continue
        except Exception as e:
            print(f"Unexpected error on attempt {attempt + 1}: {type(e).__name__}: {e}")
            last_error = e
            continue

    raise ProposalGenerationError(
        f"Model failed to produce valid structured output after {retries + 1} attempts: {last_error}"
    )