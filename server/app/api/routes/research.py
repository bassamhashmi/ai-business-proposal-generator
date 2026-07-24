from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.models import Job, Proposal
from app.db.session import get_db
from app.schemas.job import JobResponse
from app.services.job_service import run_research_job
from app.services.agent_service import research_with_cache
from app.llm.factory import get_llm_provider

router = APIRouter()

class ResearchRequest(BaseModel):
    company_name: Optional[str] = None
    website_url: Optional[str] = None
    proposal_id: Optional[str] = None

@router.post("/research-company")
async def research_company_route(
    req: ResearchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not req.company_name and not req.website_url:
        raise HTTPException(status_code=400, detail="Provide a company name or a website URL.")

    if req.proposal_id:
        if db.get(Proposal, req.proposal_id) is None:
            raise HTTPException(status_code=404, detail="Proposal not found.")
        job = Job(
            proposal_id=req.proposal_id,
            job_type="research",
            input_data={
                "company_name": req.company_name,
                "website_url": req.website_url,
            },
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        background_tasks.add_task(run_research_job, job.id)
        return JobResponse.model_validate(job)

    return await research_with_cache(
        req.company_name, req.website_url, get_llm_provider("research")
    )
