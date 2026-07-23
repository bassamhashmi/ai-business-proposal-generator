from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.agent_service import research_company, research_by_website
from app.llm.factory import get_llm_provider

router = APIRouter()

class ResearchRequest(BaseModel):
    company_name: Optional[str] = None
    website_url: Optional[str] = None

@router.post("/research-company")
async def research_company_route(req: ResearchRequest):
    if not req.company_name and not req.website_url:
        raise HTTPException(status_code=400, detail="Provide a company name or a website URL.")

    llm = get_llm_provider()

    if req.website_url:
        result = await research_by_website(req.website_url, llm)
    else:
        summary = await research_company(req.company_name, llm)
        result = {"business_name": req.company_name, "company_context": summary}

    return result