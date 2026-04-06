from __future__ import annotations

from collections import Counter

from app.nlp.term_normalizer import TermNormalizer


COMMON_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "build",
    "building",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "of",
    "on",
    "or",
    "our",
    "role",
    "team",
    "the",
    "this",
    "to",
    "we",
    "with",
    "you",
    "your",
    "looking",
    "senior",
    "software",
    "engineer",
    "experience",
    "years",
    "work",
    "working",
    "skills",
    "strong",
    "knowledge",
    "ability",
    "development",
    "using",
    "seeking",
    "required",
    "preferred",
    "design",
    "new",
    "job",
    "about",
    "that",
    "it",
    "not",
    "have",
    "has",
    "but",
    "can",
    "will",
    "would",
    "should",
    "understanding",
    "good",
    "great",
    "excellent",
    "developer",
}


class KeywordExtractor:
    def __init__(self) -> None:
        self.normalizer = TermNormalizer()

    def normalize_text(self, text: str) -> str:
        return self.normalizer.normalize_text(text)

    def tokenize(self, text: str) -> list[str]:
        return self.normalizer.normalize_tokens(text)

    def extract(self, text: str, *, limit: int = 25) -> list[str]:
        if not text.strip():
            return []

        tokens = self.tokenize(text)
        filtered_tokens = [
            token
            for token in tokens
            if len(token) > 1 and token not in COMMON_STOPWORDS and not token.isdigit()
        ]

        phrase_candidates: list[str] = []
        for index, token in enumerate(filtered_tokens):
            phrase_candidates.append(token)
            if index + 1 < len(filtered_tokens):
                phrase_candidates.append(f"{token} {filtered_tokens[index + 1]}")
            if index + 2 < len(filtered_tokens):
                phrase_candidates.append(
                    f"{token} {filtered_tokens[index + 1]} {filtered_tokens[index + 2]}"
                )

        scored = Counter(phrase_candidates)
        ranked = sorted(
            scored,
            key=lambda item: (item.count(" "), scored[item], len(item)),
            reverse=True,
        )

        unique_keywords: list[str] = []
        seen: set[str] = set()
        for keyword in ranked:
            if keyword in seen:
                continue
            seen.add(keyword)
            unique_keywords.append(keyword)
            if len(unique_keywords) >= limit:
                break

        return unique_keywords

    def extract_core_terms(self, text: str, *, limit: int = 15) -> list[str]:
        if not text.strip():
            return []

        core_terms: list[str] = []
        seen: set[str] = set()
        for token in self.tokenize(text):
            if len(token) <= 1 or token in COMMON_STOPWORDS or token.isdigit():
                continue
            if token in seen:
                continue
            seen.add(token)
            core_terms.append(token)
            if len(core_terms) >= limit:
                break

        return core_terms
