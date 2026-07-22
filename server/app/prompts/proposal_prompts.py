from app.schemas.proposal_request import ProposalRequest
from app.db.models import ProposalChunk

SYSTEM_PROMPT = (
    "You are an expert business proposal writer. "
    "Use the example excerpts from past proposals provided as style and structure reference, "
    "but write entirely new content tailored to the current client's specific details. "
    "Generate proposal content strictly matching the requested JSON schema. "
    "Do not include markdown formatting, headers, or field labels inside the text — "
    "just the prose content for each field."
)

def build_retrieval_query(req: ProposalRequest) -> str:
    return f"{req.industry} {req.service_offered} {req.client_pain_points}"

def build_user_prompt(req: ProposalRequest, chunks: list[ProposalChunk]) -> str:
    examples_block = "\n\n".join(
        f"Excerpt from past proposal ({c.proposal.industry} — {c.proposal.service_offered}):\n{c.chunk_text}"
        for c in chunks
    ) or "No past examples available."

    return f"""Reference excerpts from past proposals for style and structure:

{examples_block}

---

Now generate business proposal content for this new engagement:

Client business: {req.business_name} ({req.industry})
Service being offered: {req.service_offered}
Client's stated pain points: {req.client_pain_points}
Budget range: {req.budget_range}
Timeline: {req.timeline}"""