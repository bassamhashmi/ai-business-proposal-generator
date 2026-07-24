from app.schemas.proposal_request import ProposalRequest
from app.schemas.strategy import ProposalStrategy

OUTLINE_SYSTEM_PROMPT = (
    "You are a senior proposal strategist. Create a concise, persuasive proposal outline "
    "based only on approved client and agency information. Do not invent claims, pricing, "
    "case studies, or commitments. Return only the requested JSON schema."
)


def build_outline_prompt(req: ProposalRequest, strategy: ProposalStrategy) -> str:
    return f"""Client: {req.business_name}
Industry: {req.industry}
Service: {req.service_offered}
Pain points: {req.client_pain_points}
Budget: {req.budget_range}
Timeline: {req.timeline}

Template: {strategy.template}
Tone: {strategy.tone}
Differentiators: {strategy.differentiators}
Approved case studies: {strategy.case_studies}
Standard terms: {strategy.standard_terms}
Pricing notes: {strategy.pricing_notes}

Create an outline that opens with the client's needs, maps delivery sections to their pain points, and includes commercial assumptions only when supplied above."""
