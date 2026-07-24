from pydantic import BaseModel, Field


class ProposalStrategy(BaseModel):
    template: str = "Business proposal"
    tone: str = "Confident and consultative"
    differentiators: str = ""
    case_studies: str = ""
    standard_terms: str = ""
    pricing_notes: str = ""


class OutlineSection(BaseModel):
    heading: str
    purpose: str


class ProposalOutline(BaseModel):
    title: str
    sections: list[OutlineSection] = Field(min_length=3, max_length=10)
