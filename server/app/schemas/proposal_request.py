from typing import Optional
from pydantic import BaseModel

class ProposalRequest(BaseModel):
    proposal_id: Optional[str] = None
    business_name: str
    industry: str
    service_offered: str
    client_pain_points: str
    budget_range: str
    timeline: str
