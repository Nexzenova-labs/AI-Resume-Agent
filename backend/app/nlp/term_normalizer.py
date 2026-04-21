from __future__ import annotations

import re


# Maps abbreviated / variant forms → canonical form used for matching.
# Keep keys lowercase and stripped of punctuation.
SYNONYM_MAP: dict[str, str] = {
    # JavaScript ecosystem
    "js": "javascript",
    "ts": "typescript",
    "nodejs": "nodejs",
    "node": "nodejs",
    "reactjs": "react",
    "vuejs": "vue",
    "nextjs": "nextjs",
    # Python ecosystem
    "py": "python",
    "python2": "python",
    "python3": "python",
    # Databases
    "postgres": "postgresql",
    "postgre": "postgresql",
    "psql": "postgresql",
    "mongo": "mongodb",
    "mssql": "sqlserver",
    # Cloud
    "gcp": "googlecloud",
    "k8s": "kubernetes",
    "kube": "kubernetes",
    # ML / AI
    "ml": "machinelearning",
    "dl": "deeplearning",
    "nlp": "naturallanguageprocessing",
    "ai": "artificialintelligence",
    "llms": "llm",
    # DevOps
    "ci/cd": "cicd",
    "cicd": "cicd",
    "gh": "github",
    "tf": "terraform",
    # Other common abbreviations
    "api": "api",
    "apis": "api",
    "restful": "rest",
    "c++": "cpp",
    "c#": "csharp",
    ".net": "dotnet",
    "oop": "oop",
    "qa": "qa",
    "ui": "ui",
    "ux": "ux",
}

# Strip these trailing characters from tokens before looking them up
_STRIP_CHARS = ".,-+_"


class TermNormalizer:
    def normalize_text(self, text: str) -> str:
        lowered = text.lower()
        # Preserve node.js / next.js style tokens (convert to a single token)
        lowered = re.sub(r"\bnode\.js\b", "nodejs", lowered)
        lowered = re.sub(r"\bnext\.js\b", "nextjs", lowered)
        lowered = re.sub(r"\bexpress\.js\b", "expressjs", lowered)
        lowered = re.sub(r"\bvue\.js\b", "vuejs", lowered)
        lowered = re.sub(r"\bthree\.js\b", "threejs", lowered)
        # Strip characters that don't belong in identifiers
        lowered = re.sub(r"[^a-z0-9+#.\s/\-]+", " ", lowered)
        lowered = re.sub(r"\s+", " ", lowered).strip()
        return lowered

    def normalize_token(self, token: str) -> str:
        # 1. Run basic text normalisation
        normalized = self.normalize_text(token).replace("/", "").replace("-", "")
        normalized = normalized.strip(_STRIP_CHARS)
        # 2. Check synonym map
        return SYNONYM_MAP.get(normalized, normalized)

    def normalize_tokens(self, text: str) -> list[str]:
        normalized = self.normalize_text(text)
        # Find all alphanumeric+symbol tokens
        raw_tokens = re.findall(r"[a-z0-9+#.]+", normalized)
        tokens: list[str] = []
        for token in raw_tokens:
            token = token.strip(_STRIP_CHARS)
            if token:
                tokens.append(self.normalize_token(token))
        return tokens

    def normalize_term(self, term: str) -> str:
        """Return a single canonical string for a (possibly multi-word) term."""
        tokens = self.normalize_tokens(term)
        return " ".join(tokens).strip()
