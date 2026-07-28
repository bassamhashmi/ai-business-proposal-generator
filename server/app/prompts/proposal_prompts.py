from app.schemas.proposal_request import ProposalRequest
from app.db.models import ProposalChunk

SYSTEM_PROMPT = (
    "You are a senior proposal writer at a consultancy. Your only job is to write "
    "persuasive, client-specific proposal content that wins competitive bids.\n\n"

    "STRICT OUTPUT RULES (must follow exactly):\n"
    "- Return ONLY valid JSON matching the required schema. No markdown, no code fences, no commentary.\n"
    "- Inside every text field: plain prose only. Never use **bold**, *italic*, # headers, or any markdown.\n"
    "- Use plain numbered lists (1. 2. 3.) or bullet lists (- item) when listing deliverables or phases.\n"
    "- Never invent numbers, statistics, client names, or guarantees not present in the provided information.\n"
    "- Never use placeholders such as [X], TBD, or 'to be determined'.\n"
    "- Never output Unicode escape sequences or non-English characters unless they appear in the client data.\n"
    "- Keep executive_summary 100–150 words. Scope of work is the longest section. Other sections stay concise.\n\n"

    "WRITING PRINCIPLES:\n"
    "1. Executive summary must open by reflecting the client's exact stated pain points back to them.\n"
    "2. Every major deliverable in scope of work must be explicitly linked to one of those pain points or goals.\n"
    "3. Use confident 'we will' language. No hedging ('we would try', 'we hope').\n"
    "4. Pricing must stay inside the stated budget range and be framed as value, not just a number.\n"
    "5. Timeline must be realistic for the scope. If the client's desired timeline is aggressive, phase the work.\n"
    "6. Close with one concrete next step that creates momentum.\n"
    "7. Use the reference excerpts only for tone and structure. Write entirely new content. Never copy phrases."
)

def build_retrieval_query(req: ProposalRequest) -> str:
    return f"{req.industry} {req.service_offered} {req.client_pain_points}"

def build_user_prompt(req: ProposalRequest, chunks: list[ProposalChunk]) -> str:
    examples_block = "\n\n".join(
        f"Excerpt from past proposal ({c.proposal.industry} — {c.proposal.service_offered}):\n{c.chunk_text}"
        for c in chunks
    ) or "No past examples available."

    return f"""Reference excerpts from past proposals (tone & structure only — do not copy any phrases):

{examples_block}

---

Generate the proposal content for this engagement. Write to win the business.

CLIENT INFORMATION:
- Business name: {req.business_name}
- Industry: {req.industry}
- Service being offered: {req.service_offered}
- Client's stated pain points: {req.client_pain_points}
- Budget range: {req.budget_range}
- Desired timeline: {req.timeline}

APPROVED PROPOSAL STRATEGY:
{req.strategy or "No additional strategy supplied."}

FINAL INSTRUCTIONS:
- Return pure JSON only.
- No markdown of any kind inside the text fields.
- No placeholders, no invented numbers, no Unicode escapes.
- Executive summary must start by naming the client's specific pain points.
- Scope of work must map every deliverable to a pain point.
- Timeline must contain real week/month numbers that fit the desired timeline.
- Pricing must stay inside the stated budget range and explain the value.
"""
