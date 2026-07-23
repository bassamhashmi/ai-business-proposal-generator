from typing import Optional
from pydantic import BaseModel

class ResearchOutput(BaseModel):
    business_name: str
    summary: str
    industry: Optional[str] = None
    service_offered: Optional[str] = None