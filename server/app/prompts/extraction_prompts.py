EXTRACTION_SYSTEM_PROMPT = (
    "You are an information extraction assistant. "
    "Read the provided source text describing a client's requirements and extract "
    "the requested fields strictly matching the JSON schema. "
    "Only extract information that is explicitly present or clearly implied in the source text. "
    "If a field's information cannot be found, return an empty string for that field. "
    "Never invent, assume, or estimate values that are not supported by the source text."
)

def build_extraction_prompt(company_name: str, source_text: str) -> str:
    return f"""Company name: {company_name}

Source text describing the client's requirements:
---
{source_text}
---

Extract the industry, service offered, client pain points, budget range, and timeline from the above."""