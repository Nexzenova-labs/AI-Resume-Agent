"""PDF → structured resume extractor.

Pulls raw text from each page, then uses regex heuristics to locate
common section headings and extract personal info, skills, experience, etc.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field


# ── Section-heading patterns ──────────────────────────────────────────────────
# Matches common resume section titles (case-insensitive).
SECTION_RE = re.compile(
    r"^(?P<heading>"
    r"experience|work experience|employment|career|professional experience"
    r"|education|academic|qualifications"
    r"|skills|technical skills|core skills|competencies|expertise"
    r"|tools|technologies|tech stack"
    r"|projects|portfolio|side projects"
    r"|summary|profile|objective|about"
    r"|certifications|certificates|awards|achievements"
    r"|contact|links"
    r")\s*[:\-–]?\s*$",
    re.IGNORECASE,
)

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"[\+\(]?[\d\s\-\(\)]{7,15}")
URL_RE = re.compile(r"https?://[^\s]+|linkedin\.com/[^\s]+|github\.com/[^\s]+")


@dataclass
class ParsedResume:
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""
    links: list[str] = field(default_factory=list)
    skills: list[str] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    experience_text: str = ""
    education_text: str = ""
    projects_text: str = ""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Return all text from a PDF, page by page, joined with newlines."""
    try:
        import pdfplumber  # type: ignore
    except ImportError:
        return ""

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def parse_resume_from_text(raw_text: str) -> ParsedResume:
    """Heuristically parse raw resume text into structured fields."""
    parsed = ParsedResume()
    if not raw_text.strip():
        return parsed

    lines = [line.strip() for line in raw_text.splitlines()]
    non_empty = [l for l in lines if l]

    # ── Personal info from the first few lines ────────────────────────────────
    header_block = "\n".join(non_empty[:8])

    email_match = EMAIL_RE.search(header_block)
    if email_match:
        parsed.email = email_match.group()

    phone_match = PHONE_RE.search(header_block)
    if phone_match:
        phone_candidate = phone_match.group().strip()
        # Must have at least 7 digits to be a phone number
        if sum(c.isdigit() for c in phone_candidate) >= 7:
            parsed.phone = phone_candidate

    for url_match in URL_RE.finditer(header_block):
        parsed.links.append(url_match.group().rstrip(".,)"))

    # First non-empty line that doesn't look like email/phone/url is likely the name
    for line in non_empty[:5]:
        if (
            not EMAIL_RE.search(line)
            and not URL_RE.search(line)
            and not PHONE_RE.fullmatch(line.strip())
            and len(line.split()) <= 6
            and len(line) > 2
        ):
            parsed.full_name = line
            break

    # Also grab location (City, State pattern or City, Country)
    location_re = re.compile(r"\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,})\b")
    for line in non_empty[:10]:
        loc = location_re.search(line)
        if loc:
            parsed.location = loc.group()
            break

    # ── Section segmentation ─────────────────────────────────────────────────
    sections: dict[str, list[str]] = {}
    current_section = "header"
    sections[current_section] = []

    for line in lines:
        heading_match = SECTION_RE.match(line) if line else None
        if heading_match:
            current_section = heading_match.group("heading").lower().split()[0]
            sections.setdefault(current_section, [])
        else:
            sections.setdefault(current_section, []).append(line)

    def section_text(*names: str) -> str:
        for name in names:
            for key, content in sections.items():
                if name in key:
                    return " ".join(l for l in content if l).strip()
        return ""

    # ── Summary ───────────────────────────────────────────────────────────────
    parsed.summary = section_text("summary", "profile", "objective", "about")[:600]

    # ── Experience ────────────────────────────────────────────────────────────
    parsed.experience_text = section_text("experience", "employment", "career", "professional")[:1200]

    # ── Education ─────────────────────────────────────────────────────────────
    parsed.education_text = section_text("education", "academic", "qualification")[:600]

    # ── Projects ─────────────────────────────────────────────────────────────
    parsed.projects_text = section_text("project", "portfolio")[:800]

    # ── Skills extraction ─────────────────────────────────────────────────────
    raw_skills = section_text("skills", "competencies", "expertise", "technical")
    raw_tools = section_text("tools", "technologies", "tech stack")

    # Split on common delimiters
    def split_items(text: str) -> list[str]:
        items: list[str] = []
        for part in re.split(r"[,|•·\n]+", text):
            cleaned = part.strip(" •·\t-–|")
            # Keep only short items (likely a skill, not a sentence)
            if 1 < len(cleaned) <= 40 and not cleaned.isdigit():
                items.append(cleaned)
        return items

    parsed.skills = split_items(raw_skills)[:30]
    parsed.tools = split_items(raw_tools)[:20]

    # If skills section was empty, try to extract tech keywords from entire text
    if not parsed.skills:
        tech_keywords = _extract_tech_keywords(raw_text)
        parsed.skills = tech_keywords[:20]

    return parsed


# ── Known tech keywords for fallback extraction ───────────────────────────────
TECH_KEYWORDS = {
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "ruby", "swift", "kotlin", "scala", "r", "matlab", "php", "perl",
    "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
    "node.js", "express", "fastapi", "django", "flask", "spring", "rails",
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "dynamodb", "elasticsearch",
    "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible",
    "git", "github", "gitlab", "ci/cd", "jenkins", "github actions",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
    "pandas", "numpy", "spark", "hadoop", "kafka", "airflow",
    "graphql", "rest", "grpc", "microservices", "linux", "bash",
    "figma", "jira", "confluence", "agile", "scrum",
}


def _extract_tech_keywords(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []
    for keyword in sorted(TECH_KEYWORDS, key=len, reverse=True):
        # Whole-word match
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, lower):
            found.append(keyword)
    return found
