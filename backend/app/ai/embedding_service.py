"""Embedding service with two providers:

- LocalEmbeddingProvider  : TF-IDF bag-of-words (no external calls required).
  Cosine similarity of TF-IDF vectors is a well-understood measure of lexical
  overlap and works reliably for ATS keyword matching without any API keys.
- OpenAIEmbeddingProvider : dense semantic embeddings via OpenAI API, with
  automatic fallback to the local provider when the key is absent or the call
  fails.
"""
from __future__ import annotations

import math
from collections import Counter

import httpx

from app.core.config import get_settings
from app.nlp.term_normalizer import TermNormalizer

settings = get_settings()


class LocalEmbeddingProvider:
    """TF-IDF bag-of-words embeddings.

    Builds a shared vocabulary across ALL input texts in a single batch, then
    produces a normalised TF-IDF vector for each text.  Cosine similarity on
    these vectors is fully deterministic and meaningful: two texts that share
    many of the same tokens will score high; completely unrelated texts will
    score near zero.
    """

    def __init__(self) -> None:
        self.normalizer = TermNormalizer()

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self._tfidf_batch(texts)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _tokenize(self, text: str) -> list[str]:
        return [t for t in self.normalizer.normalize_tokens(text) if len(t) > 1]

    def _tfidf_batch(self, texts: list[str]) -> list[list[float]]:
        tokenized: list[list[str]] = [self._tokenize(t) for t in texts]
        num_docs = len(tokenized)

        # Build global vocabulary
        vocab: list[str] = list({tok for doc in tokenized for tok in doc})
        vocab_index: dict[str, int] = {tok: i for i, tok in enumerate(vocab)}
        vocab_size = len(vocab)

        if vocab_size == 0:
            return [[0.0] for _ in texts]

        # Document-frequency: how many docs contain each token
        df: Counter[str] = Counter()
        for doc_tokens in tokenized:
            df.update(set(doc_tokens))

        embeddings: list[list[float]] = []
        for doc_tokens in tokenized:
            vector = [0.0] * vocab_size
            if not doc_tokens:
                embeddings.append(vector)
                continue

            tf = Counter(doc_tokens)
            doc_len = len(doc_tokens)

            for token, count in tf.items():
                if token not in vocab_index:
                    continue
                idx = vocab_index[token]
                # Normalised TF × log IDF
                tf_val = count / doc_len
                idf_val = math.log((num_docs + 1) / (df[token] + 1)) + 1.0
                vector[idx] = tf_val * idf_val

            # L2 normalise
            magnitude = math.sqrt(sum(v * v for v in vector))
            if magnitude > 0:
                vector = [v / magnitude for v in vector]

            embeddings.append(vector)

        return embeddings


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
        self.local_provider = LocalEmbeddingProvider()
        self.openai_provider = OpenAIEmbeddingProvider(
            fallback_provider=self.local_provider
        )

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        provider = settings.embedding_provider.lower()
        if provider == "openai":
            return await self.openai_provider.embed_texts(texts)
        return await self.local_provider.embed_texts(texts)
