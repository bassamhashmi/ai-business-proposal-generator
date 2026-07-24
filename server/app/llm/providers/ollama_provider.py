import httpx
import json
import logging
import time
from app.llm.base import LLMProvider
from app.core.logging import log_event
from app.core.config import settings

logger = logging.getLogger(__name__)

class OllamaProvider(LLMProvider):
    def __init__(self, model: str, base_url: str):
        self.model = model
        self.chat_url = f"{base_url}/api/chat"

    async def generate_structured(self, system_prompt, user_prompt, schema, temperature=0.3, num_predict=600):
        timeout = httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=10.0)
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=timeout) as client:
            log_event(
                logger,
                "llm_structured_generation_started",
                model=self.model,
                temperature=temperature,
                num_predict=num_predict,
            )
            response = await client.post(self.chat_url, json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "format": schema,
                "stream": False,
                "think": False,
                "keep_alive": "30m",
                "options": {
                    "temperature": temperature,
                    "num_predict": num_predict,
                    "num_ctx": 4096,
                },
            })
            response.raise_for_status()
            raw = response.json()["message"]["content"]
            if not raw or not raw.strip():
                raise ValueError("Empty response from Ollama")
            if settings.log_llm_responses:
                log_event(
                    logger,
                    "llm_structured_generation_raw_response",
                    model=self.model,
                    response=raw,
                )
            log_event(
                logger,
                "llm_structured_generation_completed",
                model=self.model,
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            return json.loads(raw)

    async def chat_with_tools(self, messages: list[dict], tools: list[dict], temperature: float = 0.2) -> dict:
        timeout = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=timeout) as client:
            log_event(
                logger,
                "llm_tool_chat_started",
                model=self.model,
                temperature=temperature,
            )
            response = await client.post(self.chat_url, json={
                "model": self.model,
                "messages": messages,
                "tools": tools,
                "stream": False,
                "keep_alive": "30m",
                "options": {"temperature": temperature, "num_predict": 400},
            })
            response.raise_for_status()
            message = response.json()["message"]
            if settings.log_llm_responses:
                log_event(
                    logger,
                    "llm_tool_chat_raw_response",
                    model=self.model,
                    response=message,
                )
            log_event(
                logger,
                "llm_tool_chat_completed",
                model=self.model,
                duration_ms=round((time.perf_counter() - started) * 1000),
            )
            return message
