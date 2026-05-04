"""PDF → structured resume extractor.

Pulls raw text via pdfplumber, then uses regex heuristics to segment
sections and convert each block into typed schema objects:
  - ExperienceItem  (role, company, dates, highlights)
  - EducationItem   (degree, institution, field, dates)
  - ProjectItem     (name, description, technologies, highlights)
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from typing import Any


# ── Section-heading detector ──────────────────────────────────────────────────

SECTION_RE = re.compile(
    r"^(?P<heading>"
    r"experience|work experience|employment history|career history|professional experience"
    r"|education|academic background|qualifications|educational"
    r"|skills|technical skills|core skills|key skills|competencies|expertise"
    r"|tools|technologies|tech stack|tools & technologies"
    r"|projects|personal projects|portfolio|side projects|key projects|academic projects"
    r"|summary|professional summary|profile|objective|about me|profile summary"
    r"|certifications|certificates|awards|achievements|honors"
    r"|languages|language skills"
    r"|soft skills|interpersonal skills"
    r"|contact|links|social|website"
    r")\s*[:\-–]?\s*$",
    re.IGNORECASE,
)

EMAIL_RE    = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE    = re.compile(r"[\+\(]?[\d\s\-\(\)]{7,17}")
URL_RE      = re.compile(r"https?://[^\s]+|linkedin\.com/[^\s]+|github\.com/[^\s]+")
# Covers common PDF bullet glyphs including U+25CF (●), U+2022 (•), and more
BULLET_RE   = re.compile(r"^[\u25cf\u2022\u2023\u2043\u204C\u204D\u2219\u25aa\u25ab\u25e6\•\-\*\–\›◦▪]\s*|^\d+[\.\)]\s+")
DATE_RANGE_RE = re.compile(
    r"(?P<start>"
    r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\b"
    r"|\b\d{4}\b"
    r")"
    r"(?:\s*[-–—to]+\s*"
    r"(?P<end>"
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}"
    r"|\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow"
    r"))?",
    re.IGNORECASE,
)
YEAR_RE = re.compile(r"\b(20\d{2}|19\d{2})\b")

ROLE_TITLE_WORDS = re.compile(
    r"\b(engineer|developer|architect|analyst|scientist|consultant|manager|"
    r"intern|associate|lead|director|vp|cto|ceo|head|specialist|officer|"
    r"designer|administrator|coordinator|executive)\b",
    re.IGNORECASE,
)
DEGREE_RE = re.compile(
    r"\b(B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?|B\.?Sc\.?|M\.?Sc\.?|"
    r"B\.?S\.?|M\.?S\.?|Bachelor['\u2019]?s?|Master['\u2019]?s?|"
    r"MBA|Ph\.?D\.?|BCA|MCA|B\.?Com|Diploma|Associate)\b",
    re.IGNORECASE,
)
INSTITUTION_WORDS = re.compile(
    r"\b(University|College|Institute|School|Academy|"
    r"IIT|NIT|BITS|JNTU|Anna|Osmania|VTU|IIIT|IIT|IGNOU)\b",
    re.IGNORECASE,
)
TECH_DELIMITER_RE = re.compile(r"[,|•·\n]+")


# ── Public dataclass ──────────────────────────────────────────────────────────

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
    experience: list[dict[str, Any]] = field(default_factory=list)
    education: list[dict[str, Any]] = field(default_factory=list)
    projects: list[dict[str, Any]] = field(default_factory=list)
    custom_sections: list[dict[str, Any]] = field(default_factory=list)


# ── PDF text extraction ───────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
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


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_resume_from_text(raw_text: str) -> ParsedResume:
    parsed = ParsedResume()
    if not raw_text.strip():
        return parsed

    lines     = [ln.strip() for ln in raw_text.splitlines()]
    non_empty = [ln for ln in lines if ln]

    # ── Personal info (top 8 non-empty lines) ────────────────────────────────
    header_block = "\n".join(non_empty[:8])

    m = EMAIL_RE.search(header_block)
    if m:
        parsed.email = m.group()

    m = PHONE_RE.search(header_block)
    if m:
        candidate = m.group().strip()
        if sum(c.isdigit() for c in candidate) >= 7:
            parsed.phone = candidate

    for m in URL_RE.finditer(header_block):
        parsed.links.append(m.group().rstrip(".,)"))

    for ln in non_empty[:5]:
        if (
            not EMAIL_RE.search(ln)
            and not URL_RE.search(ln)
            and not PHONE_RE.fullmatch(ln)
            and len(ln.split()) <= 6
            and len(ln) > 2
        ):
            parsed.full_name = ln
            break

    loc_re = re.compile(r"\b([A-Z][a-zA-Z\s\-]+,\s*[A-Z][A-Za-z\s]{1,20})\b")
    for ln in non_empty[:10]:
        m = loc_re.search(ln)
        if m and not EMAIL_RE.search(ln):
            parsed.location = m.group()
            break

    # ── Section segmentation ─────────────────────────────────────────────────
    sections: dict[str, list[str]] = {}
    current = "header"
    sections[current] = []

    for ln in lines:
        m = SECTION_RE.match(ln) if ln else None
        if m:
            # Store the FULL heading (e.g. "professional experience") so substring
            # lookup ("experience" in "professional experience") works correctly.
            current = m.group("heading").lower()
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(ln)

    def get_section_lines(*names: str) -> list[str]:
        for name in names:
            for key, content in sections.items():
                if name in key:
                    return [l for l in content if l]
        return []

    def get_section_text(*names: str) -> str:
        return " ".join(get_section_lines(*names)).strip()

    # ── Summary ───────────────────────────────────────────────────────────────
    parsed.summary = get_section_text("summary", "profile", "objective", "about")[:600]

    # ── Skills & tools ────────────────────────────────────────────────────────
    raw_skills = get_section_text("skills", "competencies", "expertise", "technical")
    raw_tools  = get_section_text("tools", "technologies", "tech stack")

    def split_items(text: str) -> list[str]:
        items: list[str] = []
        for part in TECH_DELIMITER_RE.split(text):
            # Handle "Category: item1, item2" sub-labels by splitting on ":"
            sub_parts = re.split(r"(?<=[A-Za-z])\s*:\s*", part, maxsplit=1)
            candidates = sub_parts if len(sub_parts) == 1 else sub_parts[1:]
            for c in candidates:
                cleaned = c.strip(" •·\t-–|")
                if 1 < len(cleaned) <= 45 and not cleaned.isdigit():
                    # Each comma-separated item within a category
                    for item in re.split(r"\s*[,]\s*", cleaned):
                        item = item.strip()
                        if 1 < len(item) <= 40 and not item.isdigit():
                            items.append(item)
        return items

    parsed.skills = list(dict.fromkeys(split_items(raw_skills)))[:40]
    parsed.tools  = list(dict.fromkeys(split_items(raw_tools)))[:20]

    if not parsed.skills:
        parsed.skills = _extract_tech_keywords(raw_text)[:20]

    # ── Experience → structured entries ───────────────────────────────────────
    exp_lines = get_section_lines("experience", "employment", "career", "professional")
    parsed.experience = _parse_experience(exp_lines)

    # ── Education → structured entries ────────────────────────────────────────
    edu_lines = get_section_lines("education", "academic", "qualification")
    parsed.education = _parse_education(edu_lines)

    # ── Projects → structured entries ─────────────────────────────────────────
    proj_lines = get_section_lines("project", "portfolio", "academic")
    parsed.projects = _parse_projects(proj_lines)

    # ── Custom sections (certifications, languages, soft skills) ──────────────
    def _extract_custom_section(display_name: str, *keys: str) -> None:
        raw_lines = get_section_lines(*keys)
        if not raw_lines:
            return
        items: list[str] = []
        for ln in raw_lines:
            clean = BULLET_RE.sub("", ln).strip()
            if clean and len(clean) > 1:
                items.append(clean)
        if items:
            parsed.custom_sections.append({"name": display_name, "items": items})

    _extract_custom_section("Certifications", "certifications", "certificates", "awards", "achievements", "honors")
    _extract_custom_section("Languages", "languages", "language skills")
    _extract_custom_section("Soft Skills", "soft skills", "interpersonal skills")

    # Website / links section — merge into parsed.links
    link_lines = get_section_lines("website", "links", "social", "contact")
    for ln in link_lines:
        for m in URL_RE.finditer(ln):
            url = m.group().rstrip(".,)")
            if url not in parsed.links:
                parsed.links.append(url)

    return parsed


# ── Experience parser ─────────────────────────────────────────────────────────

def _parse_experience(lines: list[str]) -> list[dict[str, Any]]:
    """Convert raw experience text lines into structured ExperienceItem dicts."""
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    COMPANY_SUFFIX = re.compile(
        r"\b(Corp|Ltd|Inc|LLC|Pvt|PLC|Technologies|Solutions|Services|Systems|"
        r"Consulting|Group|Company|Co\.?|Infotech|Infosys|Wipro|TCS|Cognizant|"
        r"Accenture|Capgemini|HCL|Tech Mahindra)\b",
        re.IGNORECASE,
    )

    def _flush():
        nonlocal current
        if current:
            entries.append(current)
            current = None

    for line in lines:
        is_bullet = bool(BULLET_RE.match(line))
        has_role  = bool(ROLE_TITLE_WORDS.search(line))
        dr        = DATE_RANGE_RE.search(line)
        has_company = bool(COMPANY_SUFFIX.search(line))

        # Detect a new experience entry.
        # Require either:
        #   (a) a job-title keyword (engineer, developer, …), OR
        #   (b) a company suffix AND a date — prevents description sentences
        #       like "…email systems, reducing effort by 70%." from matching.
        is_new_entry = not is_bullet and len(line) < 120 and (
            has_role or (has_company and bool(dr))
        )
        if is_new_entry:
            _flush()

            # Parse dates
            start = dr.group("start").strip() if dr and dr.group("start") else None
            end   = dr.group("end").strip()   if dr and dr.group("end")   else None

            # Strip dates from line to isolate role/company text
            clean = DATE_RANGE_RE.sub("", line).strip(" |–-·\t")
            # Try splitting on separator characters: |  ·  –  "at"
            parts = re.split(r"\s*[|·–@]\s*|\s+at\s+", clean, maxsplit=1)
            role    = parts[0].strip() if parts else clean
            company = parts[1].strip() if len(parts) > 1 else ""

            current = {
                "role":       role,
                "company":    company,
                "start_date": start,
                "end_date":   end or "Present",
                "description": None,
                "highlights": [],
            }

        elif is_bullet and current:
            bullet = BULLET_RE.sub("", line).strip()
            if len(bullet) > 5:
                current["highlights"].append(bullet)

        elif current and not is_bullet and len(line) > 5:
            # Could be company name, continuation of a wrapped bullet, or description
            if not current["company"] and (has_company or len(line) < 60):
                current["company"] = line
            elif current["highlights"]:
                # Continuation of the last wrapped bullet line (PDF line-wrap)
                current["highlights"][-1] = current["highlights"][-1] + " " + line
            elif not current["description"] and len(line) > 20:
                current["description"] = line
            elif len(line) > 15:
                current["highlights"].append(line)

    _flush()
    return entries[:10]


# ── Education parser ──────────────────────────────────────────────────────────

def _parse_education(lines: list[str]) -> list[dict[str, Any]]:
    """Convert raw education text lines into structured EducationItem dicts.

    Handles the common pattern (esp. Indian CVs) where institution and degree
    appear on consecutive lines rather than the same line.
    """
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def _flush():
        nonlocal current
        if current:
            entries.append(current)
            current = None

    for line in lines:
        has_degree = bool(DEGREE_RE.search(line))
        has_inst   = bool(INSTITUTION_WORDS.search(line))
        years      = YEAR_RE.findall(line)

        dm = DEGREE_RE.search(line)

        if has_inst and not has_degree:
            # Pure institution line (no degree on this line).
            # Start a new entry; degree may follow on the next line.
            _flush()
            current = {
                "degree":         "",
                "field_of_study": "",
                "institution":    line,
                "start_date":     years[0] if years else None,
                "end_date":       years[1] if len(years) > 1 else None,
                "achievements":   [],
            }

        elif has_degree:
            degree = dm.group() if dm else ""
            field  = ""
            if dm:
                after = line[dm.end():].strip(" in,–-:of")
                fm = re.match(r"([A-Za-z\s&/]+)", after)
                if fm:
                    field = fm.group().strip()[:60]

            if current and not current["degree"]:
                # Merge into the institution-only entry above
                current["degree"]         = degree
                current["field_of_study"] = field
                if not current["start_date"] and years:
                    current["start_date"] = years[0]
                if not current["end_date"] and len(years) > 1:
                    current["end_date"] = years[1]
            else:
                _flush()
                current = {
                    "degree":         degree,
                    "field_of_study": field,
                    "institution":    line,
                    "start_date":     years[0] if years else None,
                    "end_date":       years[1] if len(years) > 1 else None,
                    "achievements":   [],
                }

        elif current:
            if years and not current["start_date"]:
                current["start_date"] = years[0]
                if len(years) > 1:
                    current["end_date"] = years[1]
            elif BULLET_RE.match(line):
                current["achievements"].append(BULLET_RE.sub("", line).strip())

    _flush()

    # Clean up: strip dates / extra pipe separators from institution strings
    CLEAN_RE = re.compile(r"\s*\|.*$|\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{4}.*$", re.IGNORECASE)
    for e in entries:
        e["institution"] = CLEAN_RE.sub("", e["institution"]).strip()
        if e["field_of_study"]:
            e["field_of_study"] = e["field_of_study"].strip()

    # Keep only entries with at least an institution name
    return [e for e in entries if e["institution"]][:5]


# ── Project parser ────────────────────────────────────────────────────────────

def _parse_projects(lines: list[str]) -> list[dict[str, Any]]:
    """Convert raw project text lines into structured ProjectItem dicts."""
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    TECH_MARKER = re.compile(
        r"^(technologies|tech stack|tools|built with|stack|tech|languages)\s*[:\-]\s*",
        re.IGNORECASE,
    )

    def _flush():
        nonlocal current
        if current and current["name"]:
            entries.append(current)

    for line in lines:
        is_bullet = bool(BULLET_RE.match(line))
        is_tech   = bool(TECH_MARKER.match(line))

        # Short non-bullet lines with title-casing → project name
        if (
            not is_bullet
            and not is_tech
            and 2 < len(line.split()) <= 10
            and len(line) <= 80
            and not DATE_RANGE_RE.search(line)
        ):
            # Heuristic: if the line looks like a title (most words start uppercase or all caps)
            words     = line.split()
            cap_count = sum(1 for w in words if w[0].isupper() or w.isupper())
            if cap_count >= len(words) * 0.5:
                _flush()
                current = {"name": line, "description": "", "technologies": [], "highlights": []}
                continue

        if current:
            if is_tech:
                tech_str = TECH_MARKER.sub("", line)
                current["technologies"] = [
                    t.strip() for t in re.split(r"[,|]", tech_str) if t.strip()
                ]
            elif is_bullet:
                bullet = BULLET_RE.sub("", line).strip()
                if bullet:
                    current["highlights"].append(bullet)
            elif len(line) > 10:
                if current["highlights"]:
                    # Continuation of last wrapped bullet line
                    current["highlights"][-1] = current["highlights"][-1] + " " + line
                elif not current["description"]:
                    current["description"] = line
                else:
                    current["highlights"].append(line)

    _flush()
    return entries[:8]


# ── Tech keyword fallback ─────────────────────────────────────────────────────

TECH_KEYWORDS = {
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "ruby", "swift", "kotlin", "scala", "php", "r",
    "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
    "node.js", "express", "fastapi", "django", "flask", "spring", "spring boot",
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "dynamodb", "elasticsearch",
    "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible",
    "git", "ci/cd", "jenkins", "github actions",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
    "pandas", "numpy", "spark", "kafka", "airflow",
    "rest", "graphql", "grpc", "microservices", "linux", "bash",
    "langchain", "openai", "hugging face", "llm", "rag",
}


def _extract_tech_keywords(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []
    for kw in sorted(TECH_KEYWORDS, key=len, reverse=True):
        if re.search(r"\b" + re.escape(kw) + r"\b", lower):
            found.append(kw)
    return found
