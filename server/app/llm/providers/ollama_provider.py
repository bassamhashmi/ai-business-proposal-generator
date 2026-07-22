import httpx
import json
from app.llm.base import LLMProvider

class OllamaProvider(LLMProvider):
    def __init__(self, model: str, base_url: str):
        self.model = model
        self.url = f"{base_url}/api/chat"

    async def generate_structured(self, system_prompt, user_prompt, schema, temperature=0.3, num_predict=600):
        timeout = httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self.url, json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "format": schema,
                "stream": False,
                "keep_alive": "30m",
                "options": {
                    "temperature": temperature,
                    "num_predict": num_predict,
                    "num_ctx": 4096,
                },
            })
            response.raise_for_status()
            raw = response.json()["message"]["content"]
            return json.loads(raw)