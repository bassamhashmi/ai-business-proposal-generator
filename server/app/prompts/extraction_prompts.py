from typing import Optional

EXTRACTION_SYSTEM_PROMPT = (
    "You are an information extraction assistant. "
    "Read the provided source text describing a client's requirements and extract "
    "the requested fields strictly matching the JSON schema. "
    "Only extract information that is explicitly present or clearly implied in the source text. "
    "If a field's information cannot be found, return an empty string for that field. "
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

Extract the industry, service offered, client pain points, budget range, and timeline from the above. Prefer the source text over background research when they conflict. Only use the additional research findings if they are clear and the source text does not provide conflicting information."""