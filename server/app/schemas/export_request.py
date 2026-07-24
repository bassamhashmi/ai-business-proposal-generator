from pydantic import BaseModel
from typing import Optional
from app.schemas.proposal_output import ProposalOutput

class ExportRequest(BaseModel):
    proposal_id: Optional[str] = None
    version_id: Optional[str] = None
    business_name: str
    proposal: ProposalOutput
