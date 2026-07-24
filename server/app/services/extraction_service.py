import json
import logging
import time
from typing import Optional
from pydantic import ValidationError
from app.llm.base import LLMProvider
from app.schemas.extraction_output import ExtractedFields
from app.prompts.extraction_prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_prompt
from app.core.logging import log_event

logger = logging.getLogger(__name__)

class ExtractionError(Exception):
    pass

async def extract_fields(
    company_name: str,
    source_text: str,
    llm: LLMProvider,
    company_context: str = "",
    research_industry: Optional[str] = None,
    research_service_offered: Optional[str] = None,
    retries: int = 1
) -> ExtractedFields:
    prompt = build_extraction_prompt(
        company_name,
        source_text,
        company_context,
        research_industry=research_industry,
        research_service_offered=research_service_offered
    )
    schema = ExtractedFields.model_json_schema()

    last_error = None
    for attempt in range(retries + 1):
        started = time.perf_counter()
        try:
            raw = await llm.generate_structured(EXTRACTION_SYSTEM_PROMPT, prompt, schema, temperature=0.1)
            log_event(
                logger,
                "extraction_completed",
                attempt=attempt + 1,
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            return ExtractedFields(**raw)
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            log_event(
                logger,
                "extraction_attempt_failed",
                attempt=attempt + 1,
                error_type=type(e).__name__,
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            last_error = e
            continue

    raise ExtractionError(f"Failed to extract fields after {retries + 1} attempts: {last_error}")
