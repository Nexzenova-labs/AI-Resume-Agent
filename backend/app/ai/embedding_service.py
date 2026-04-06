from __future__ import annotations

import math
from collections import Counter

import httpx

from app.core.config import get_settings
from app.nlp.term_normalizer import TermNormalizer

settings = get_settings()


class LocalEmbeddingProvider:
    def __init__(self, *, dimensions: int = 256) -> None:
        self.dimensions = dimensions
        self.normalizer = TermNormalizer()

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_text(text) for text in texts]

    def _embed_text(self, text: str) -> list[float]:
        tokens = self.normalizer.normalize_tokens(text)
        if not tokens:
            return [0.0] * self.dimensions

        vector = [0.0] * self.dimensions
        counts = Counter(tokens)
        for token, weight in counts.items():
            index = hash(token) % self.dimensions
            sign = 1.0 if hash(f"{token}:sign") % 2 == 0 else -1.0
            vector[index] += weight * sign

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]


class OpenAIEmbeddingProvider:
    def __init__(self, *, fallback_provider: LocalEmbeddingProvider) -> None:
        self.fallback_provider = fallback_provider

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not settings.openai_api_key:
            return await self.fallback_provider.embed_texts(texts)

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {settings.openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.openai_embedding_model,
                        "input": texts,
                    },
                )
                response.raise_for_status()
        except Exception:
            return await self.fallback_provider.embed_texts(texts)

        payload = response.json()
        data = payload.get("data", [])
        if not data:
            return await self.fallback_provider.embed_texts(texts)

        ordered = sorted(data, key=lambda item: item["index"])
        return [item["embedding"] for item in ordered]


class EmbeddingService:
    def __init__(self) -> None:
        self.local_provider = LocalEmbeddingProvider(
            dimensions=settings.embedding_dimensions
        )
        self.openai_provider = OpenAIEmbeddingProvider(
            fallback_provider=self.local_provider
        )

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        provider = settings.embedding_provider.lower()
        if provider == "openai":
            return await self.openai_provider.embed_texts(texts)
        return await self.local_provider.embed_texts(texts)

