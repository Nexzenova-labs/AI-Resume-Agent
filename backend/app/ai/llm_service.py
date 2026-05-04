"""
LLM-powered resume tailoring service.

Primary   : Google Gemini 2.0 Flash (GEMINI_API_KEY)
Secondary : OpenAI gpt-4o-mini (OPENAI_API_KEY)
Fallback  : Regex-based heuristics (no API key needed)
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

from app.schemas.resume import ResumeBase

logger = logging.getLogger(__name__)


# ─── Output schema ────────────────────────────────────────────────────────────

@dataclass
class ExperienceEnhancement:
    index: int
    added_highlights: list[str]


@dataclass
class TailoringDiff:
    job_title: str
    summary: str
    added_skills: list[str] = field(default_factory=list)
    added_tools: list[str] = field(default_factory=list)
    experience_enhancements: list[ExperienceEnhancement] = field(default_factory=list)
    added_project: Optional[dict] = None


# ─── Display-casing lookup for common tech terms ──────────────────────────────

_DISPLAY: dict[str, str] = {
    "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript",
    "java": "Java", "golang": "Go", "go": "Go", "rust": "Rust", "scala": "Scala",
    "ruby": "Ruby", "php": "PHP", "swift": "Swift", "kotlin": "Kotlin",
    "c++": "C++", "c#": "C#", "r": "R",
    "react": "React", "angular": "Angular", "vue": "Vue.js", "svelte": "Svelte",
    "nextjs": "Next.js", "next.js": "Next.js", "gatsby": "Gatsby",
    "tailwind": "Tailwind CSS", "bootstrap": "Bootstrap", "jquery": "jQuery",
    "html": "HTML", "css": "CSS", "sass": "Sass",
    "nodejs": "Node.js", "node.js": "Node.js", "express": "Express.js",
    "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
    "spring": "Spring", "rails": "Rails", "laravel": "Laravel", "nestjs": "NestJS",
    "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch", "cassandra": "Cassandra",
    "sqlite": "SQLite", "dynamodb": "DynamoDB", "firestore": "Firestore",
    "snowflake": "Snowflake", "bigquery": "BigQuery", "databricks": "Databricks",
    "redshift": "Redshift",
    "aws": "AWS", "gcp": "GCP", "azure": "Azure", "heroku": "Heroku",
    "vercel": "Vercel", "netlify": "Netlify", "cloudflare": "Cloudflare",
    "ec2": "EC2", "s3": "S3", "lambda": "AWS Lambda", "rds": "RDS",
    "docker": "Docker", "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "terraform": "Terraform", "ansible": "Ansible", "helm": "Helm",
    "jenkins": "Jenkins", "argocd": "ArgoCD", "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI", "ci/cd": "CI/CD",
    "pytorch": "PyTorch", "tensorflow": "TensorFlow", "keras": "Keras",
    "scikit-learn": "scikit-learn", "pandas": "Pandas", "numpy": "NumPy",
    "scipy": "SciPy", "matplotlib": "Matplotlib", "xgboost": "XGBoost",
    "lightgbm": "LightGBM", "catboost": "CatBoost",
    "langchain": "LangChain", "llamaindex": "LlamaIndex", "openai": "OpenAI",
    "hugging face": "Hugging Face", "transformers": "Transformers",
    "chroma": "Chroma DB", "pinecone": "Pinecone", "weaviate": "Weaviate",
    "qdrant": "Qdrant", "faiss": "FAISS",
    "mlflow": "MLflow", "wandb": "W&B", "dvc": "DVC",
    "spark": "Apache Spark", "kafka": "Apache Kafka", "airflow": "Apache Airflow",
    "dbt": "dbt", "fivetran": "Fivetran", "airbyte": "Airbyte",
    "grafana": "Grafana", "prometheus": "Prometheus", "datadog": "Datadog",
    "sentry": "Sentry", "cloudwatch": "CloudWatch",
    "n8n": "n8n", "zapier": "Zapier",
    "selenium": "Selenium", "playwright": "Playwright", "puppeteer": "Puppeteer",
    "tableau": "Tableau", "power bi": "Power BI", "looker": "Looker",
    "git": "Git", "github": "GitHub", "gitlab": "GitLab",
    "nginx": "Nginx", "rabbitmq": "RabbitMQ", "celery": "Celery",
    "jira": "Jira", "confluence": "Confluence", "figma": "Figma", "postman": "Postman",
    "graphql": "GraphQL", "grpc": "gRPC",
    "machine learning": "Machine Learning", "deep learning": "Deep Learning",
    "nlp": "NLP", "natural language processing": "Natural Language Processing",
    "computer vision": "Computer Vision",
    "reinforcement learning": "Reinforcement Learning",
    "llm": "LLM", "llms": "LLMs", "rag": "RAG",
    "generative ai": "Generative AI",
    "large language models": "Large Language Models",
    "retrieval augmented generation": "Retrieval-Augmented Generation",
    "prompt engineering": "Prompt Engineering",
    "fine-tuning": "Fine-tuning",
    "embeddings": "Embeddings", "vector search": "Vector Search",
    "semantic search": "Semantic Search",
    "data science": "Data Science", "data engineering": "Data Engineering",
    "data analysis": "Data Analysis", "data analytics": "Data Analytics",
    "etl": "ETL", "data pipeline": "Data Pipeline",
    "data warehouse": "Data Warehouse",
    "system design": "System Design", "microservices": "Microservices",
    "distributed systems": "Distributed Systems",
    "api design": "API Design",
    "devops": "DevOps", "mlops": "MLOps",
    "cloud computing": "Cloud Computing",
    "serverless": "Serverless",
    "web development": "Web Development",
    "sql": "SQL", "nosql": "NoSQL",
    "linux": "Linux", "bash": "Bash",
    "rest": "REST", "restful": "RESTful",
    "jwt": "JWT", "oauth": "OAuth",
    "agile": "Agile", "scrum": "Scrum",
    "tdd": "TDD",
    "ci/cd pipelines": "CI/CD Pipelines",
    "infrastructure as code": "Infrastructure as Code",
    "real-time": "Real-Time Processing",
    "object oriented": "Object-Oriented Programming",
    "version control": "Version Control",
    "software development": "Software Development",
    "software engineering": "Software Engineering",
    "performance optimization": "Performance Optimization",
    "high availability": "High Availability",
    "scalable systems": "Scalable Systems",
    "model deployment": "Model Deployment",
    "data visualization": "Data Visualization",
    "a/b testing": "A/B Testing",
    "vertex ai": "Vertex AI", "gemini": "Gemini API",
    "bedrock": "AWS Bedrock",
    "lora": "LoRA", "rlhf": "RLHF",
    "sagemaker": "AWS SageMaker",
    "redux": "Redux", "zustand": "Zustand",
    "jest": "Jest", "vitest": "Vitest", "cypress": "Cypress",
    "langsmith": "LangSmith", "crewai": "CrewAI",
}

_KNOWN_TOOLS_LOWER: set[str] = {
    "python", "javascript", "typescript", "java", "golang", "go", "rust", "scala",
    "ruby", "php", "swift", "kotlin", "c++", "c#",
    "react", "angular", "vue", "svelte", "nextjs", "next.js", "gatsby",
    "tailwind", "bootstrap", "jquery", "sass",
    "nodejs", "node.js", "express", "django", "flask", "fastapi", "spring",
    "rails", "laravel", "nestjs",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "sqlite", "dynamodb", "firestore", "snowflake", "bigquery", "databricks", "redshift",
    "aws", "gcp", "azure", "heroku", "vercel", "netlify", "cloudflare",
    "ec2", "s3", "lambda", "rds",
    "docker", "kubernetes", "k8s", "terraform", "ansible", "helm", "jenkins",
    "argocd", "github actions", "gitlab ci",
    "pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy",
    "scipy", "matplotlib", "xgboost", "lightgbm", "catboost",
    "langchain", "llamaindex", "openai", "hugging face", "transformers",
    "chroma", "pinecone", "weaviate", "qdrant", "faiss",
    "mlflow", "wandb", "dvc",
    "spark", "kafka", "airflow", "dbt", "fivetran", "airbyte",
    "grafana", "prometheus", "datadog", "sentry", "cloudwatch",
    "n8n", "zapier", "selenium", "playwright", "puppeteer",
    "tableau", "power bi", "looker",
    "git", "github", "gitlab",
    "nginx", "rabbitmq", "celery",
    "jira", "confluence", "figma", "postman",
    "graphql", "grpc",
    "redux", "zustand", "jest", "vitest", "cypress",
    "langsmith", "crewai", "sagemaker",
    "vertex ai", "bedrock",
}

_STOP_WORDS: set[str] = {
    "the", "and", "for", "with", "you", "our", "are", "not", "all", "any",
    "this", "that", "from", "into", "will", "have", "been", "team", "role",
    "join", "must", "can", "what", "how", "who", "company", "position", "job",
    "candidate", "resume", "cv", "work", "working", "years", "year", "strong",
    "good", "great", "excellent", "plus", "well", "ability", "knowledge",
    "understanding", "responsible", "required", "preferred", "minimum",
    "opportunity", "looking", "build", "develop", "design", "manage",
    "experience", "background", "skills", "skill", "tools", "tool",
    "requirements", "qualifications", "responsibilities",
}


def _display(term: str) -> str:
    return _DISPLAY.get(term.lower().strip(), term.strip())


def _is_tool(term: str) -> bool:
    return term.lower().strip() in _KNOWN_TOOLS_LOWER


# ─── Keyword extraction ───────────────────────────────────────────────────────

def extract_jd_keywords(jd_text: str) -> tuple[list[str], list[str]]:
    raw: set[str] = set()
    text_lower = jd_text.lower()

    for term in _DISPLAY:
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, text_lower):
            raw.add(term)

    for m in re.finditer(r'\b([A-Z][a-z]+(?:[A-Z][a-z]*)+)\b', jd_text):
        word = m.group(1)
        skip = {"Requirements", "Responsibilities", "Qualifications", "Experience",
                "Bachelor", "Master", "Doctor", "University", "Candidate", "Company"}
        if word not in skip and len(word) >= 3:
            raw.add(word.lower())

    skip_caps = {"THE", "AND", "FOR", "WITH", "YOU", "OUR", "ARE", "NOT",
                 "ALL", "ANY", "THIS", "THAT", "FROM", "INTO", "WILL", "HAVE", "BEEN"}
    for m in re.finditer(r'\b([A-Z]{2,}(?:[/-][A-Z]+)?)\b', jd_text):
        w = m.group(1)
        if w not in skip_caps and len(w) <= 12:
            raw.add(w.lower())

    _TOO_GENERIC = {"ai", "ml", "it", "api", "sdk", "ui", "ux", "db", "os", "id"}

    skills: list[str] = []
    tools: list[str] = []
    seen_lower: set[str] = set()
    seen_display_lower: set[str] = set()

    for term_lower in raw:
        if not term_lower or term_lower in _STOP_WORDS or term_lower in _TOO_GENERIC:
            continue
        if term_lower in seen_lower:
            continue
        seen_lower.add(term_lower)
        display = _display(term_lower)
        d_low = display.lower()
        if d_low in seen_display_lower:
            continue
        seen_display_lower.add(d_low)
        if _is_tool(term_lower):
            tools.append(display)
        else:
            skills.append(display)

    return skills, tools


def _get_resume_text(resume: ResumeBase) -> str:
    parts: list[str] = []
    if resume.personal_info:
        pi = resume.personal_info if isinstance(resume.personal_info, dict) else resume.personal_info.model_dump()
        parts.append(pi.get("summary", "") or "")
    for exp in (resume.experience or []):
        e = exp if isinstance(exp, dict) else exp.model_dump()
        parts.append(e.get("role") or "")
        parts.extend(h for h in (e.get("highlights") or []) if h)
    for edu in (resume.education or []):
        ed = edu if isinstance(edu, dict) else edu.model_dump()
        parts.append(ed.get("degree") or "")
    for proj in (resume.projects or []):
        p = proj if isinstance(proj, dict) else proj.model_dump()
        parts.append(p.get("name") or "")
        parts.append(p.get("description") or "")
        parts.extend(t for t in (p.get("technologies") or []) if t)
    parts.extend(s for s in (resume.skills or []) if s)
    parts.extend(t for t in (resume.tools or []) if t)
    return " ".join(parts).lower()


def _get_personal_info_dict(resume: ResumeBase) -> dict:
    pi = resume.personal_info
    if pi is None:
        return {}
    if isinstance(pi, dict):
        return pi
    return pi.model_dump()


def _get_existing_summary(resume: ResumeBase) -> str:
    if not resume.personal_info:
        return ""
    pi = (resume.personal_info if isinstance(resume.personal_info, dict)
          else resume.personal_info.model_dump())
    return (pi.get("summary") or "").strip()


def _extract_jd_title(jd_text: str) -> str:
    first = jd_text.strip()[:200]
    match = re.search(
        r"(?:hiring|looking for|seeking|position[:\s]+|role[:\s]+|title[:\s]+)?\s*"
        r"((?:senior|lead|staff|principal|junior|mid[\s-]?level)?\s*"
        r"(?:ai|ml|data|frontend|back[\s-]?end|full[\s-]?stack|cloud|devops|software|platform|machine learning|nlp|automation)?\s*"
        r"(?:engineer|developer|scientist|analyst|architect|manager|specialist|consultant)\b)",
        first, re.IGNORECASE,
    )
    if match:
        return match.group(1).strip().title()
    first_line = jd_text.strip().split("\n")[0].strip()
    if len(first_line) <= 60:
        return first_line.title()
    return "Software Engineer"


# ─── AI prompt ───────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an expert ATS resume optimizer and career coach. Your job is to aggressively tailor a resume to a specific job description to maximize ATS keyword match (target 85%+) while making the resume genuinely compelling.

WHAT YOU MUST DO:
1. Rewrite the professional summary to powerfully align with the JD — weave in the most important JD keywords naturally
2. Add ALL missing skills and tools from the JD to added_skills / added_tools
3. Enhance experience bullet points by adding 1-2 new highlights per role that incorporate key JD terms
4. Use EXACT keyword spelling from the JD for maximum ATS match

CLASSIFICATION:
- added_skills: concepts, methodologies, domain knowledge (Machine Learning, RAG, CI/CD, Agile)
- added_tools: named products, frameworks, libraries (React, Docker, LangChain)

STRICT RULES:
- NEVER change name, email, phone, location, links, company names, job titles, or dates
- NEVER remove existing content — only add and enhance
- Experience highlights you add must be realistic, specific, and directly tied to JD requirements
- Write highlights in past tense action-verb format: "Built X using Y to achieve Z"

Return ONLY valid JSON (no markdown fences):
{
  "job_title": "exact job title from JD",
  "summary": "Rewritten summary (2-4 sentences) powerfully aligned to the JD role",
  "added_skills": ["skill1", "skill2", ...],
  "added_tools": ["tool1", "tool2", ...],
  "experience_enhancements": [
    {
      "index": 0,
      "added_highlights": [
        "Implemented X feature using Y technology, achieving Z measurable outcome relevant to this role"
      ]
    }
  ]
}"""


def _build_user_message(resume: ResumeBase, jd_text: str) -> str:
    pi_dict = _get_personal_info_dict(resume)
    resume_dict = {
        "personal_info": {k: v for k, v in pi_dict.items() if v},
        "experience": [
            {k: v for k, v in (exp if isinstance(exp, dict) else exp.model_dump()).items() if v}
            for exp in (resume.experience or [])
        ],
        "education": [
            {k: v for k, v in (edu if isinstance(edu, dict) else edu.model_dump()).items() if v}
            for edu in (resume.education or [])
        ],
        "skills": resume.skills or [],
        "tools": resume.tools or [],
        "projects": [
            {k: v for k, v in (p if isinstance(p, dict) else p.model_dump()).items() if v}
            for p in (resume.projects or [])
        ],
    }

    return (
        f"CANDIDATE RESUME:\n{json.dumps(resume_dict, indent=2)}\n\n"
        f"JOB DESCRIPTION:\n{jd_text[:4000]}\n\n"
        "Tailor this resume to the job description. "
        "Rewrite the summary, add all missing skills/tools, and enhance experience bullets with JD-relevant highlights. "
        "Return ONLY valid JSON."
    )


def _parse_llm_response(raw: str, jd_text: str) -> TailoringDiff:
    """Parse JSON from LLM response, stripping markdown fences if present."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw.strip())
    raw = raw.strip()

    data: dict = json.loads(raw)

    enhancements = []
    for enh in (data.get("experience_enhancements") or []):
        if isinstance(enh, dict):
            idx = enh.get("index", 0)
            highlights = enh.get("added_highlights") or []
            if highlights:
                enhancements.append(ExperienceEnhancement(index=idx, added_highlights=highlights))

    return TailoringDiff(
        job_title=data.get("job_title") or _extract_jd_title(jd_text),
        summary=data.get("summary", ""),
        added_skills=data.get("added_skills") or [],
        added_tools=data.get("added_tools") or [],
        experience_enhancements=enhancements,
    )


# ─── Gemini tailoring (primary) ───────────────────────────────────────────────

async def _gemini_tailor(resume: ResumeBase, jd_text: str, api_key: str) -> TailoringDiff:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    user_message = _build_user_message(resume, jd_text)
    full_prompt = f"{_SYSTEM_PROMPT}\n\n{user_message}"

    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model="gemini-2.0-flash",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        ),
    )

    raw = response.text or "{}"
    return _parse_llm_response(raw, jd_text)


# ─── OpenAI tailoring (secondary) ────────────────────────────────────────────

async def _openai_tailor(resume: ResumeBase, jd_text: str, api_key: str) -> TailoringDiff:
    import openai

    user_message = _build_user_message(resume, jd_text)
    client = openai.AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=2500,
    )

    raw = response.choices[0].message.content or "{}"
    return _parse_llm_response(raw, jd_text)


# ─── Heuristic fallback (no API key) ─────────────────────────────────────────

_BROAD_STOPWORDS: set[str] = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "must", "can",
    "that", "this", "these", "those", "we", "you", "they", "he", "she", "it",
    "our", "your", "their", "its", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "not", "only", "same", "so", "than",
    "too", "very", "just", "who", "which", "what", "how", "when", "where", "why",
    "as", "if", "then", "because", "while", "also", "well", "us", "me", "my",
    "job", "work", "team", "join", "role", "position", "candidate", "company",
    "opportunity", "looking", "seeking", "help", "take", "use", "able", "need",
    "want", "day", "time", "year", "years", "minimum", "required", "preferred",
    "nice", "plus", "description", "overview", "benefits", "salary", "location",
    "remote", "hybrid", "full", "part", "etc", "please", "apply", "make", "get",
    "new", "one", "two", "three", "responsible", "responsibilities",
    "requirements", "qualifications", "bonus", "must", "excellent", "great",
    "good", "strong", "high", "key", "fast", "ship", "build", "data", "web",
    "apis", "code", "test", "base", "core", "open", "run",
    "senior", "junior", "mid", "entry", "principal", "staff",
    "using", "working", "building", "developing", "designing", "leading",
    "model", "prompt", "vector", "database", "databases", "deployment",
    "development", "engineering", "application", "applications",
    "solution", "solutions", "service", "services", "platform",
    "system", "systems", "framework", "frameworks", "library",
    "environment", "infrastructure", "architecture",
}


def _heuristic_tailor(resume: ResumeBase, jd_text: str) -> TailoringDiff:
    text_lower = jd_text.lower()
    clean = re.sub(r"[^\w\s\-\/\+\#\.]", " ", text_lower)
    tokens = clean.split()

    terms: set[str] = set()
    for t in tokens:
        t = t.strip(".-/")
        # Only keep alphabetic/hyphenated terms of reasonable length
        if (len(t) >= 4
                and t not in _BROAD_STOPWORDS
                and not t.isdigit()
                and re.match(r"^[a-z][a-z\-\/\+\#\.]*$", t)):
            terms.add(t)
    for phrase in _DISPLAY:
        if " " in phrase and re.search(r"\b" + re.escape(phrase) + r"\b", text_lower):
            terms.add(phrase)

    _, tech_tools = extract_jd_keywords(jd_text)
    resume_text = _get_resume_text(resume)

    existing_skills_lower = {s.lower() for s in (resume.skills or [])}
    existing_tools_lower = {t.lower() for t in (resume.tools or [])}

    missing_tools: list[str] = []
    seen_tools: set[str] = set(existing_tools_lower)
    for t in tech_tools:
        if t.lower() not in resume_text and t.lower() not in seen_tools:
            missing_tools.append(t)
            seen_tools.add(t.lower())
    missing_tools = missing_tools[:15]

    tools_set = seen_tools | {t.lower() for t in missing_tools}
    skills_to_add: list[str] = []
    seen_skills: set[str] = set(existing_skills_lower)
    for term in sorted(terms):
        t_l = term.lower()
        if t_l in resume_text or t_l in seen_skills or t_l in tools_set:
            continue
        display = _display(t_l) if t_l in _DISPLAY else term.title()
        d_l = display.lower()
        if d_l not in seen_skills:
            skills_to_add.append(display)
            seen_skills.add(d_l)
    skills_to_add = skills_to_add[:30]

    existing_summary = _get_existing_summary(resume)
    job_title = _extract_jd_title(jd_text)
    top_kw = ", ".join((missing_tools + skills_to_add)[:10])
    summary = (
        f"{existing_summary} Experienced in {top_kw} with a strong background aligned to {job_title} roles."
        if existing_summary else
        f"Experienced professional with skills in {top_kw}, aligned to {job_title} roles."
    )

    return TailoringDiff(
        job_title=job_title,
        summary=summary,
        added_skills=skills_to_add,
        added_tools=missing_tools,
        experience_enhancements=[],
    )


# ─── Public entry point ───────────────────────────────────────────────────────

class LLMService:
    def __init__(self) -> None:
        from app.core.config import get_settings
        self._settings = get_settings()

    async def tailor_resume(self, resume: ResumeBase, jd_text: str) -> TailoringDiff:
        gemini_key = (self._settings.gemini_api_key or "").strip()
        openai_key = (self._settings.openai_api_key or "").strip()

        # Gemini is the primary path
        if gemini_key:
            try:
                return await _gemini_tailor(resume=resume, jd_text=jd_text, api_key=gemini_key)
            except Exception as exc:
                logger.error("Gemini tailoring failed: %s", exc, exc_info=True)

        if openai_key:
            try:
                return await _openai_tailor(resume=resume, jd_text=jd_text, api_key=openai_key)
            except Exception as exc:
                logger.error("OpenAI tailoring failed: %s", exc, exc_info=True)

        logger.warning("No AI keys available — using heuristic tailoring.")
        return _heuristic_tailor(resume=resume, jd_text=jd_text)


# ─── Apply diff to resume ─────────────────────────────────────────────────────

def apply_tailoring(resume: ResumeBase, diff: TailoringDiff) -> ResumeBase:
    """Merge a TailoringDiff into a resume copy. Existing content is never removed."""
    data = resume.model_dump()

    if not data.get("personal_info"):
        data["personal_info"] = {}
    data["skills"] = data.get("skills") or []
    data["tools"] = data.get("tools") or []
    data["experience"] = data.get("experience") or []
    data["education"] = data.get("education") or []
    data["projects"] = data.get("projects") or []
    # Preserve custom sections (Certifications, Languages, Soft Skills) from original resume
    data["custom_sections"] = data.get("custom_sections") or []

    # Update summary
    if diff.summary:
        data["personal_info"]["summary"] = diff.summary

    # Add missing skills (deduplicated)
    existing_skills_lower = {s.lower() for s in data["skills"]}
    for skill in diff.added_skills:
        if skill.lower() not in existing_skills_lower:
            data["skills"].append(skill)
            existing_skills_lower.add(skill.lower())

    # Add missing tools (deduplicated)
    existing_tools_lower = {t.lower() for t in data["tools"]}
    for tool in diff.added_tools:
        if tool.lower() not in existing_tools_lower:
            data["tools"].append(tool)
            existing_tools_lower.add(tool.lower())

    # Apply experience enhancements — append new highlights to each role
    for enh in diff.experience_enhancements:
        idx = enh.index
        if 0 <= idx < len(data["experience"]):
            exp = data["experience"][idx]
            existing = exp.get("highlights") or []
            # Avoid duplicating already-present highlights
            existing_lower = {h.lower() for h in existing}
            for h in enh.added_highlights:
                if h.lower() not in existing_lower:
                    existing.append(h)
                    existing_lower.add(h.lower())
            exp["highlights"] = existing

    return ResumeBase.model_validate(data)
