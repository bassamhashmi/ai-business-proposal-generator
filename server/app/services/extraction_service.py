import json
from pydantic import ValidationError
from app.llm.base import LLMProvider
from app.schemas.extraction_output import ExtractedFields
from app.prompts.extraction_prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_prompt

class ExtractionError(Exception):
    pass

async def extract_fields(company_name: str, source_text: str, llm: LLMProvider, retries: int = 1) -> ExtractedFields:
    prompt = build_extraction_prompt(company_name, source_text)
    schema = ExtractedFields.model_json_schema()

    last_error = None
    for attempt in range(retries + 1):
        try:
            raw = await llm.generate_structured(EXTRACTION_SYSTEM_PROMPT, prompt, schema, temperature=0.1)
            return ExtractedFields(**raw)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            continue

    raise ExtractionError(f"Failed to extract fields after {retries + 1} attempts: {last_error}")