from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    proposal_id: Optional[str]
    job_type: str
    status: str
    stage: str
    result_data: Optional[dict[str, Any]]
    error_type: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
