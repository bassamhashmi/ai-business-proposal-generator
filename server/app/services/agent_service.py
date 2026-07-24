from typing import Optional
import logging
from app.llm.base import LLMProvider
from app.tools.tool_definitions import COMPANY_RESEARCH_TOOLS, TOOL_FUNCTIONS
from app.services.website_service import fetch_website_text
from app.prompts.research_prompts import WEBSITE_SUMMARY_SYSTEM_PROMPT, build_website_summary_prompt
from app.schemas.research_output import ResearchOutput
from app.core.logging import log_event

logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = (
    "You are a research assistant gathering background on a business before a proposal is written for them. "
    "Use the search_web tool as needed to find what the company does, their industry, and relevant public details. "
    "Once you have enough information, respond with a plain 2-4 sentence summary and do not call any more tools. "
    "If you find nothing useful after searching, say so honestly rather than guessing."
)

async def research_company(company_name: str, llm: LLMProvider, max_iterations: int = 3) -> str:
    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": f"Research the company: {company_name}"},
    ]

    for _ in range(max_iterations):
        response = await llm.chat_with_tools(messages, COMPANY_RESEARCH_TOOLS)
        messages.append(response)

        tool_calls = response.get("tool_calls")
        if not tool_calls:
            return (response.get("content") or "").strip()

        for call in tool_calls:
            fn_name = call["function"]["name"]
            fn_args = call["function"]["arguments"]
            fn = TOOL_FUNCTIONS.get(fn_name)
            result = fn(**fn_args) if fn else f"Unknown tool: {fn_name}"
            messages.append({"role": "tool", "content": result})

    return "Research inconclusive after multiple attempts — try providing company details manually."

async def research_by_website(url: str, llm: LLMProvider) -> dict:
    try:
        website_text = await fetch_website_text(url)
    except Exception as exc:
        log_event(
            logger,
            "website_research_fetch_failed",
            error_type=type(exc).__name__,
            error_message=str(exc),
        )
        return {"business_name": "", "company_context": "Couldn't fetch that website — check the URL or try researching by company name instead."}

    if not website_text.strip():
        return {"business_name": "", "company_context": "The website returned no readable text."}

    prompt = build_website_summary_prompt(url, website_text)
    schema = ResearchOutput.model_json_schema()

    try:
        raw = await llm.generate_structured(WEBSITE_SUMMARY_SYSTEM_PROMPT, prompt, schema, temperature=0.2)
        parsed = ResearchOutput(**raw)
        return {
            "business_name": parsed.business_name,
            "company_context": parsed.summary,
            "industry": parsed.industry,
            "service_offered": parsed.service_offered
        }
    except Exception:
        return {"business_name": "", "company_context": "Couldn't summarize that website."}
