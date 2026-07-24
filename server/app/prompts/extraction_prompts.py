from typing import Optional

EXTRACTION_SYSTEM_PROMPT = (
    "You are an information extraction assistant. "
    "Read the provided source text describing a client's requirements and extract "
    "the requested fields strictly matching the JSON schema. "
    "Only extract information that is explicitly present or clearly implied in the source text. "
    "For every field return a value, confidence, source_reference, and a short exact source_excerpt. "
    "Use confidence high for explicit requirements, medium for clear implications, low for research hints, and missing when unknown. "
    "If unknown, use an empty value and source fields. "
    "Never invent, assume, or estimate values that are not supported by the source text."
)

def build_extraction_prompt(
    company_name: str,
    source_text: str,
    company_context: str = "",
    research_industry: Optional[str] = None,
    research_service_offered: Optional[str] = None
) -> str:
    context_block = f"\nBackground research on the company:\n{company_context}\n" if company_context else ""
    
    research_hints = []
    if research_industry:
        research_hints.append(f"Industry: {research_industry}")
    if research_service_offered:
        research_hints.append(f"Service offered: {research_service_offered}")
    
    research_block = ""
    if research_hints:
        research_block = f"\nAdditional research findings (use only if clear and unambiguous):\n" + "\n".join(research_hints) + "\n"

    return f"""Company name: {company_name}
{context_block}
{research_block}
Source text describing the client's requirements:
---
{source_text}
---

Extract industry, service offered, client pain points, objectives, required deliverables, decision criteria, budget range, timeline, stakeholders, assumptions, exclusions, and missing information. Prefer source text over research; use `requirements` as source_reference for source text and `company research` only for unambiguous research hints."""
