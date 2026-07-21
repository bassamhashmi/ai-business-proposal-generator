import httpx
import json
from app.llm.base import LLMProvider

class OllamaProvider(LLMProvider):
    def __init__(self, model: str, base_url: str):
        self.model = model
        self.url = f"{base_url}/api/chat"

    async def generate_structured(self, system_prompt, user_prompt, schema, temperature=0.3):
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(self.url, json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "format": schema,
                "stream": False,
                "options": {"temperature": temperature},
            })
            response.raise_for_status()
            raw = response.json()["message"]["content"]
            return json.loads(raw)