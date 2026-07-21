from pydantic import BaseModel

class ProposalOutput(BaseModel):
    executive_summary: str
    scope_of_work: str
    timeline: str
    pricing_overview: str
    next_steps: str