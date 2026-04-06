from __future__ import annotations

import re


SYNONYM_MAP = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "postgres": "postgresql",
    "postgre": "postgresql",
    "node": "nodejs",
    "node.js": "nodejs",
    "reactjs": "react",
    "nextjs": "next.js",
    "ml": "machinelearning",
    "nlp": "naturallanguageprocessing",
    "ci/cd": "cicd",
    "llms": "llm",
}


class TermNormalizer:
    def normalize_text(self, text: str) -> str:
        lowered = text.lower()
        lowered = lowered.replace("node.js", "nodejs")
        lowered = lowered.replace("next.js", "next.js")
        lowered = re.sub(r"[^a-z0-9+#.\s/-]+", " ", lowered)
        lowered = re.sub(r"\s+", " ", lowered).strip()
        return lowered

    def normalize_token(self, token: str) -> str:
        normalized = self.normalize_text(token).replace("/", "")
        return SYNONYM_MAP.get(normalized, normalized)

    def normalize_tokens(self, text: str) -> list[str]:
        normalized = self.normalize_text(text)
        raw_tokens = re.findall(r"[a-z0-9+#.]+", normalized)
        
        tokens = []
        for token in raw_tokens:
            token = token.strip(".")
            if token:
                tokens.append(self.normalize_token(token))
        return tokens

    def normalize_term(self, term: str) -> str:
        tokens = self.normalize_tokens(term)
        return " ".join(tokens).strip()

