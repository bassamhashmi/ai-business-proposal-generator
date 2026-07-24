from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class SourceDocumentCreate(BaseModel):
    file_name: str
    media_type: Optional[str] = None
    size_bytes: Optional[int] = None
    source_type: str = "upload"
    extraction_status: str = "pending"


class SourceDocumentResponse(SourceDocumentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ResearchResultCreate(BaseModel):
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    summary: str
    structured_data: dict[str, Any] = Field(default_factory=dict)


class ResearchResultResponse(ResearchResultCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ProposalCreate(BaseModel):
    business_name: str = "Untitled proposal"
    website_url: Optional[str] = None
    input_data: dict[str, Any] = Field(default_factory=dict)
    source_documents: list[SourceDocumentCreate] = Field(default_factory=list)


class ProposalUpdate(BaseModel):
    business_name: Optional[str] = None
    website_url: Optional[str] = None
    status: Optional[str] = None
    input_data: Optional[dict[str, Any]] = None
    ai_brief: Optional[dict[str, Any]] = None
    job_reference: Optional[str] = None
    model_versions: Optional[dict[str, Any]] = None


class ProposalVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_number: int
    label: str
    content: dict[str, Any]
    created_at: datetime


class ProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_name: str
    website_url: Optional[str]
    status: str
    input_data: dict[str, Any]
    ai_brief: Optional[dict[str, Any]]
    job_reference: Optional[str]
    model_versions: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    source_documents: list[SourceDocumentResponse] = Field(default_factory=list)
    research_results: list[ResearchResultResponse] = Field(default_factory=list)
    versions: list[ProposalVersionResponse] = Field(default_factory=list)
