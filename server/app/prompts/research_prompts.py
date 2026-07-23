WEBSITE_SUMMARY_SYSTEM_PROMPT = (
    "You are a research assistant analyzing a company's website content ahead of a business proposal. "
    "Identify the company's actual business name from the website content (e.g. from the title, headings, "
    "or 'About' text) — if it cannot be confidently determined, return an empty string for business_name. "
    "Write a concise 2-4 sentence summary covering what the company does, their industry, and anything "
    "relevant to a service provider writing a proposal for them. "
    "Base everything only on the provided website text; do not invent details. "
    "If the industry or what services the company offers are clearly stated in the text, extract them. "
    "Only populate these fields if the information is explicit and unambiguous; otherwise leave them null."
)

def build_website_summary_prompt(url: str, website_text: str) -> str:
    return f"""Website URL: {url}

Extracted website text:
---
{website_text}
---

Identify the business name and summarize this company based on the above."""