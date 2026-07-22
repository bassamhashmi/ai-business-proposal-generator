from pydantic import BaseModel
from app.schemas.proposal_output import ProposalOutput

class ExportRequest(BaseModel):
    business_name: str
    proposal: ProposalOutput