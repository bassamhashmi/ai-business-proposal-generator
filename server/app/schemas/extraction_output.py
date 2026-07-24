from typing import Literal
from pydantic import BaseModel, Field


class EvidenceField(BaseModel):
    value: str = ""
    confidence: Literal["high", "medium", "low", "missing"] = "missing"
    source_reference: str = ""
    source_excerpt: str = ""


class ProposalBrief(BaseModel):
    industry: EvidenceField = Field(default_factory=EvidenceField)
    service_offered: EvidenceField = Field(default_factory=EvidenceField)
    client_pain_points: EvidenceField = Field(default_factory=EvidenceField)
    objectives: EvidenceField = Field(default_factory=EvidenceField)
    required_deliverables: EvidenceField = Field(default_factory=EvidenceField)
    decision_criteria: EvidenceField = Field(default_factory=EvidenceField)
    budget_range: EvidenceField = Field(default_factory=EvidenceField)
    timeline: EvidenceField = Field(default_factory=EvidenceField)
    stakeholders: EvidenceField = Field(default_factory=EvidenceField)
    assumptions: EvidenceField = Field(default_factory=EvidenceField)
    exclusions: EvidenceField = Field(default_factory=EvidenceField)
    missing_information: list[str] = Field(default_factory=list)


def brief_to_generation_fields(brief: ProposalBrief, business_name: str) -> dict[str, str]:
    return {
        "business_name": business_name,
        "industry": brief.industry.value,
        "service_offered": brief.service_offered.value,
        "client_pain_points": brief.client_pain_points.value,
        "budget_range": brief.budget_range.value,
        "timeline": brief.timeline.value,
    }
