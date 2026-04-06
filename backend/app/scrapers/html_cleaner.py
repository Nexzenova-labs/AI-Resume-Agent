from __future__ import annotations

import re


class HtmlCleaner:
    def normalize_text(self, text: str) -> str:
        compact = re.sub(r"\s+", " ", text or "").strip()
        return compact

