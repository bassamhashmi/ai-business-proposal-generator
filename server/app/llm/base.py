from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: dict,
        temperature: float = 0.3,
    ) -> dict:
        """Returns a dict matching the given JSON schema."""
        ...