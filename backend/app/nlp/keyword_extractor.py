from __future__ import annotations

from collections import Counter

from app.nlp.term_normalizer import TermNormalizer


# Words that carry no useful signal in a job description or resume.
COMMON_STOPWORDS = frozenset({
    # Articles / prepositions / conjunctions
    "a", "an", "and", "are", "as", "at", "be", "been", "being",
    "by", "for", "from", "in", "into", "is", "it", "its",
    "of", "on", "or", "our", "the", "this", "to", "we", "with",
    "you", "your", "that", "not", "but", "has", "have",
    # Common HR / JD filler words
    "role", "team", "job", "about", "position", "opportunity",
    "candidate", "candidates", "looking", "seeking", "required",
    "preferred", "must", "minimum", "least", "plus", "bonus", "ideal",
    # Seniority / generic job terms
    "senior", "junior", "mid", "software", "engineer", "developer",
    # Generic verbs that appear in JDs but carry no skill signal
    "build", "building", "built", "design", "designed",
    "use", "used", "using", "join", "joining", "help", "helping",
    "need", "needs", "lead", "leading", "manage", "managing",
    "ensure", "maintain", "provide", "improve", "deploy", "deploying",
    "work", "working", "worked", "develop", "development",
    "review", "reviews", "include", "includes", "including",
    "make", "making", "take", "collaborate", "collaborating",
    # Adjectives that add no value
    "strong", "good", "great", "excellent", "ideal", "new", "high",
    "full", "proficient", "hands", "deep", "solid", "proven",
    "understanding", "knowledge", "ability", "abilities", "skills",
    "skill", "experience", "years", "year",
    # Other noise
    "such", "like", "well", "also", "own", "time", "within",
    "across", "between", "will", "would", "should", "could", "may",
    "can", "solutions", "solution", "quality", "delivery",
    "platform", "platforms",
    # Contraction fragments (e.g. "we're" → "we" + "re")
    "re", "ll", "ve", "nt", "em", "s",
})


class KeywordExtractor:
    def __init__(self) -> None:
        self.normalizer = TermNormalizer()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_core_terms(self, text: str, *, limit: int = 50) -> list[str]:
        """Extract up to `limit` unique non-stopword tokens, ranked by frequency.

        Previously the limit was 15 and tokens were returned in encounter order
        (meaning important skills appearing late in the JD would be missed).
        Now we return the top-N by frequency so the most mentioned skills
        surface first, and the default limit is 50.
        """
        if not text.strip():
            return []

        tokens = self.normalizer.normalize_tokens(text)
        filtered: list[str] = [
            t for t in tokens
            if len(t) > 2 and t not in COMMON_STOPWORDS and not t.isdigit()
        ]

        counts = Counter(filtered)
        # Sort: (frequency desc, length desc) — longer multi-word tech terms
        # come before shorter ones when frequency is equal.
        ranked = sorted(counts.keys(), key=lambda t: (counts[t], len(t)), reverse=True)
        return ranked[:limit]

    def extract(self, text: str, *, limit: int = 60) -> list[str]:
        """Extended extraction that also surfaces bigrams and trigrams."""
        if not text.strip():
            return []

        tokens = self.normalizer.normalize_tokens(text)
        filtered: list[str] = [
            t for t in tokens
            if len(t) > 2 and t not in COMMON_STOPWORDS and not t.isdigit()
        ]

        phrase_candidates: list[str] = []
        for i, token in enumerate(filtered):
            phrase_candidates.append(token)
            if i + 1 < len(filtered):
                phrase_candidates.append(f"{token} {filtered[i + 1]}")
            if i + 2 < len(filtered):
                phrase_candidates.append(f"{token} {filtered[i + 1]} {filtered[i + 2]}")

        counts = Counter(phrase_candidates)
        ranked = sorted(
            counts.keys(),
            key=lambda item: (item.count(" "), counts[item], len(item)),
            reverse=True,
        )

        unique: list[str] = []
        seen: set[str] = set()
        for kw in ranked:
            if kw in seen:
                continue
            seen.add(kw)
            unique.append(kw)
            if len(unique) >= limit:
                break

        return unique
