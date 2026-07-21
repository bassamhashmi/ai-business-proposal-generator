from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.proposal_request import ProposalRequest
from app.services.proposal_service import generate_proposal, ProposalGenerationError
from app.llm.factory import get_llm_provider
from app.db.session import get_db

router = APIRouter()

@router.post("/generate-proposal")
async def generate_proposal_route(req: ProposalRequest, db: Session = Depends(get_db)):
    llm = get_llm_provider()
    try:
        result = await generate_proposal(req, llm, db)
    except ProposalGenerationError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result.model_dump()