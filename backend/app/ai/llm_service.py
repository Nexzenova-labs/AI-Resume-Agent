"""
LLM-powered resume tailoring service.

Strategy: extract ACTUAL keywords from the JD text, find what's missing
from the resume, and inject exactly those keywords. Each JD produces a
unique tailored resume — not a preset template.

Primary path  : OpenAI gpt-4o-mini (OPENAI_API_KEY in .env)
Fallback path : Regex-based keyword extraction (no API key needed)
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
    # Languages
    "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript",
    "java": "Java", "golang": "Go", "go": "Go", "rust": "Rust", "scala": "Scala",
    "ruby": "Ruby", "php": "PHP", "swift": "Swift", "kotlin": "Kotlin",
    "c++": "C++", "c#": "C#", "r": "R",
    # Frontend
    "react": "React", "angular": "Angular", "vue": "Vue.js", "svelte": "Svelte",
    "nextjs": "Next.js", "next.js": "Next.js", "gatsby": "Gatsby",
    "tailwind": "Tailwind CSS", "bootstrap": "Bootstrap", "jquery": "jQuery",
    "html": "HTML", "css": "CSS", "sass": "Sass",
    # Backend
    "nodejs": "Node.js", "node.js": "Node.js", "express": "Express.js",
    "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
    "spring": "Spring", "rails": "Rails", "laravel": "Laravel", "nestjs": "NestJS",
    # Databases
    "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch", "cassandra": "Cassandra",
    "sqlite": "SQLite", "dynamodb": "DynamoDB", "firestore": "Firestore",
    "snowflake": "Snowflake", "bigquery": "BigQuery", "databricks": "Databricks",
    "redshift": "Redshift",
    # Cloud
    "aws": "AWS", "gcp": "GCP", "azure": "Azure", "heroku": "Heroku",
    "vercel": "Vercel", "netlify": "Netlify", "cloudflare": "Cloudflare",
    "ec2": "EC2", "s3": "S3", "lambda": "AWS Lambda", "rds": "RDS",
    # DevOps / CI-CD
    "docker": "Docker", "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "terraform": "Terraform", "ansible": "Ansible", "helm": "Helm",
    "jenkins": "Jenkins", "argocd": "ArgoCD", "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI", "ci/cd": "CI/CD",
    # AI / ML
    "pytorch": "PyTorch", "tensorflow": "TensorFlow", "keras": "Keras",
    "scikit-learn": "scikit-learn", "pandas": "Pandas", "numpy": "NumPy",
    "scipy": "SciPy", "matplotlib": "Matplotlib", "xgboost": "XGBoost",
    "lightgbm": "LightGBM", "catboost": "CatBoost",
    "langchain": "LangChain", "llamaindex": "LlamaIndex", "openai": "OpenAI",
    "hugging face": "Hugging Face", "transformers": "Transformers",
    "chroma": "Chroma DB", "pinecone": "Pinecone", "weaviate": "Weaviate",
    "qdrant": "Qdrant", "faiss": "FAISS", "annoy": "Annoy",
    "mlflow": "MLflow", "wandb": "W&B", "dvc": "DVC",
    # Data pipeline
    "spark": "Apache Spark", "kafka": "Apache Kafka", "airflow": "Apache Airflow",
    "dbt": "dbt", "fivetran": "Fivetran", "airbyte": "Airbyte",
    # Monitoring / Observability
    "grafana": "Grafana", "prometheus": "Prometheus", "datadog": "Datadog",
    "sentry": "Sentry", "cloudwatch": "CloudWatch",
    # Automation / Scraping
    "n8n": "n8n", "zapier": "Zapier", "make": "Make",
    "selenium": "Selenium", "playwright": "Playwright", "puppeteer": "Puppeteer",
    # BI
    "tableau": "Tableau", "power bi": "Power BI", "looker": "Looker",
    "metabase": "Metabase",
    # APIs / Protocols
    "rest": "REST", "restful": "RESTful", "graphql": "GraphQL", "grpc": "gRPC",
    "websocket": "WebSocket", "oauth": "OAuth", "jwt": "JWT",
    # Concepts / Skills (lowercase key → display name)
    "machine learning": "Machine Learning", "deep learning": "Deep Learning",
    "nlp": "NLP", "natural language processing": "Natural Language Processing",
    "computer vision": "Computer Vision",
    "reinforcement learning": "Reinforcement Learning",
    "llm": "LLM", "llms": "LLMs", "rag": "RAG",
    "generative ai": "Generative AI", "gen ai": "Generative AI",
    "large language models": "Large Language Models",
    "retrieval augmented generation": "Retrieval-Augmented Generation",
    "prompt engineering": "Prompt Engineering",
    "fine-tuning": "Fine-tuning", "fine tuning": "Fine-tuning",
    "embeddings": "Embeddings", "vector search": "Vector Search",
    "semantic search": "Semantic Search",
    "data science": "Data Science", "data engineering": "Data Engineering",
    "data analysis": "Data Analysis", "data analytics": "Data Analytics",
    "etl": "ETL", "elt": "ELT", "data pipeline": "Data Pipeline",
    "data warehouse": "Data Warehouse", "data modeling": "Data Modeling",
    "system design": "System Design", "microservices": "Microservices",
    "distributed systems": "Distributed Systems",
    "api design": "API Design", "api development": "API Development",
    "devops": "DevOps", "mlops": "MLOps", "dataops": "DataOps",
    "infrastructure as code": "Infrastructure as Code", "gitops": "GitOps",
    "agile": "Agile", "scrum": "Scrum", "kanban": "Kanban",
    "tdd": "TDD", "bdd": "BDD",
    "cloud computing": "Cloud Computing", "cloud architecture": "Cloud Architecture",
    "serverless": "Serverless", "cloud native": "Cloud Native",
    "web development": "Web Development", "web scraping": "Web Scraping",
    "sql": "SQL", "nosql": "NoSQL",
    "linux": "Linux", "bash": "Bash", "shell scripting": "Shell Scripting",
    "git": "Git", "github": "GitHub", "gitlab": "GitLab",
    "statistical modeling": "Statistical Modeling",
    "a/b testing": "A/B Testing", "feature engineering": "Feature Engineering",
    "time series": "Time Series Analysis", "forecasting": "Forecasting",
    "monitoring": "Monitoring & Observability",
    "automation": "Automation",
    "api": "API",
    "nginx": "Nginx", "apache": "Apache",
    "rabbitmq": "RabbitMQ", "celery": "Celery",
    "jira": "Jira", "confluence": "Confluence",
    "figma": "Figma", "postman": "Postman",
    # Additional commonly-missed terms
    "sagemaker": "AWS SageMaker", "aws sagemaker": "AWS SageMaker",
    "openai api": "OpenAI API",
    "redux": "Redux", "zustand": "Zustand", "mobx": "MobX",
    "jest": "Jest", "vitest": "Vitest", "cypress": "Cypress",
    "storybook": "Storybook",
    "wcag": "WCAG", "web accessibility": "Web Accessibility",
    "core web vitals": "Core Web Vitals",
    "web performance": "Web Performance Optimization",
    "a11y": "Accessibility (a11y)",
    "langsmith": "LangSmith", "crewai": "CrewAI", "autogen": "AutoGen",
    "dify": "Dify", "flowise": "Flowise",
    "vertex ai": "Vertex AI", "gemini": "Gemini API",
    "bedrock": "AWS Bedrock",
    "lora": "LoRA", "qlora": "QLoRA", "rlhf": "RLHF",
    "zero-shot": "Zero-shot Learning", "few-shot": "Few-shot Learning",
    "attention": "Attention Mechanism", "transformer": "Transformer Architecture",
    "bert": "BERT", "gpt": "GPT",
    "etl/elt": "ETL/ELT",
    "apache kafka": "Apache Kafka", "apache spark": "Apache Spark",
    "apache airflow": "Apache Airflow",
    "github actions": "GitHub Actions", "gitlab ci": "GitLab CI",
    "ci/cd pipelines": "CI/CD Pipelines",
    "infrastructure as code": "Infrastructure as Code",
    "power automate": "Power Automate",
    "low-code": "Low-code Platforms", "no-code": "No-code Platforms",
    # Common JD phrases Jobalytics flags
    "real time": "Real-Time Processing", "real-time": "Real-Time Processing",
    "real time data": "Real-Time Data", "real-time data": "Real-Time Data",
    "web development": "Web Development", "web application": "Web Applications",
    "web applications": "Web Applications", "web services": "Web Services",
    "web scraping": "Web Scraping",
    "problem solving": "Problem Solving", "analytical thinking": "Analytical Thinking",
    "communication skills": "Communication Skills",
    "cross functional": "Cross-Functional Collaboration",
    "data driven": "Data-Driven Decision Making",
    "end to end": "End-to-End Development", "end-to-end": "End-to-End Development",
    "object oriented": "Object-Oriented Programming",
    "test driven": "Test-Driven Development",
    "version control": "Version Control",
    "code review": "Code Review", "peer review": "Peer Review",
    "technical documentation": "Technical Documentation",
    "software development": "Software Development",
    "software engineering": "Software Engineering",
    "software design": "Software Design",
    "system integration": "System Integration",
    "performance optimization": "Performance Optimization",
    "load balancing": "Load Balancing",
    "fault tolerance": "Fault Tolerance",
    "high availability": "High Availability",
    "scalable architecture": "Scalable Architecture",
    "scalable systems": "Scalable Systems",
    "cloud deployment": "Cloud Deployment",
    "cloud infrastructure": "Cloud Infrastructure",
    "model deployment": "Model Deployment",
    "model training": "Model Training",
    "data processing": "Data Processing",
    "data collection": "Data Collection",
    "data visualization": "Data Visualization",
    "business intelligence": "Business Intelligence",
    "root cause analysis": "Root Cause Analysis",
    "api integration": "API Integration",
    "api development": "API Development",
    "api design": "API Design",
}

# Tools are named products/frameworks/libraries (things you "use")
# Everything else is classified as a skill concept
_KNOWN_TOOLS_LOWER: set[str] = {
    "python", "javascript", "typescript", "java", "golang", "go", "rust", "scala",
    "ruby", "php", "swift", "kotlin", "c++", "c#",
    "react", "angular", "vue", "svelte", "nextjs", "next.js", "gatsby",
    "tailwind", "bootstrap", "jquery", "sass",
    "nodejs", "node.js", "express", "django", "flask", "fastapi", "spring",
    "rails", "laravel", "nestjs",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "sqlite", "dynamodb", "firestore", "snowflake", "bigquery", "databricks",
    "redshift",
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
    "n8n", "zapier", "make", "selenium", "playwright", "puppeteer",
    "tableau", "power bi", "looker", "metabase",
    "git", "github", "gitlab", "bitbucket",
    "nginx", "apache", "rabbitmq", "celery",
    "jira", "confluence", "figma", "postman",
    "graphql", "grpc",
}

# Stopwords that should never appear as skills/tools
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
    """Return a properly cased display name for a keyword."""
    return _DISPLAY.get(term.lower().strip(), term.strip())


def _is_tool(term: str) -> bool:
    return term.lower().strip() in _KNOWN_TOOLS_LOWER


# ─── JD keyword extraction ────────────────────────────────────────────────────

def extract_jd_keywords(jd_text: str) -> tuple[list[str], list[str]]:
    """
    Extract skills and tools from a job description.
    Returns (skills_list, tools_list) with display-cased names.
    Each JD produces a unique set — this is what makes tailoring JD-specific.
    """
    raw: set[str] = set()
    text_lower = jd_text.lower()

    # 1. Match against every key in _DISPLAY (our comprehensive tech vocabulary)
    for term in _DISPLAY:
        # Use word boundary match; handle special chars in term
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, text_lower):
            raw.add(term)

    # 2. CamelCase named tools not in our dict (e.g. LangSmith, CrewAI, Dify)
    for m in re.finditer(r'\b([A-Z][a-z]+(?:[A-Z][a-z]*)+)\b', jd_text):
        word = m.group(1)
        skip = {"Requirements", "Responsibilities", "Qualifications", "Experience",
                "Bachelor", "Master", "Doctor", "University", "Institute",
                "Candidate", "Company", "Position", "Please", "About", "Apply"}
        if word not in skip and len(word) >= 3:
            raw.add(word.lower())

    # 3. ALL-CAPS acronyms (AWS, GCP, SQL, LLM, RAG, CI/CD …)
    skip_caps = {"THE", "AND", "FOR", "WITH", "YOU", "OUR", "ARE", "NOT",
                 "ALL", "ANY", "THIS", "THAT", "FROM", "INTO", "WILL",
                 "HAVE", "BEEN", "TEAM", "ROLE", "JOIN", "MUST", "CAN"}
    for m in re.finditer(r'\b([A-Z]{2,}(?:[/-][A-Z]+)?)\b', jd_text):
        w = m.group(1)
        if w not in skip_caps and len(w) <= 12:
            raw.add(w.lower())

    # 4. "X+ years of <term>" / "experience with/in <term>"
    # Limit to max 3 words to avoid capturing sentence fragments
    for pat in [
        r'\d+\+?\s*years?\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?([A-Za-z][A-Za-z0-9\./\+\#\-]*(?:\s[A-Za-z][A-Za-z0-9\./\+\#\-]*){0,2})(?:[,\.\n\(]|$)',
        r'(?:experience|expertise|proficiency|proficient|knowledge|familiar)\s+(?:with|in|of)\s+([A-Za-z][A-Za-z0-9\./\+\#\-]*(?:\s[A-Za-z][A-Za-z0-9\./\+\#\-]*){0,2})(?:[,\.\n\(]|$)',
        r'(?:strong|solid|working)\s+knowledge\s+(?:of|in)\s+([A-Za-z][A-Za-z0-9\./\+\#\-]*(?:\s[A-Za-z][A-Za-z0-9\./\+\#\-]*){0,2})(?:[,\.\n\(]|$)',
    ]:
        for m in re.finditer(pat, jd_text, re.IGNORECASE):
            term = m.group(1).strip().rstrip('.,;()')
            # Skip sentence fragments: must not start with conjunctions
            if (term and 2 <= len(term) <= 35
                    and not re.match(r'^(and|or|the|a|an|with|in|of|for)\b', term, re.IGNORECASE)):
                raw.add(term.lower())

    # 5. Comma-separated items in "Skills:" / "Required:" / "Technologies:" sections
    for m in re.finditer(
        r'(?:skills?|technologies?|tools?|stack|requirements?)\s*[:\-]\s*([^\n]{5,200})',
        jd_text, re.IGNORECASE
    ):
        line = m.group(1)
        for item in re.split(r'[,\|•·]', line):
            item = item.strip().strip('*-–()').strip().rstrip('.,')
            # Max 3 words, no conjunction start, reasonable length
            words = item.split()
            if (2 <= len(item) <= 35
                    and len(words) <= 4
                    and item.lower() not in _STOP_WORDS
                    and not re.match(r'^(and|or|the|a|an|etc)\b', item, re.IGNORECASE)):
                raw.add(item.lower())

    # Terms that are too generic to be useful as skills/tools
    _TOO_GENERIC = {"ai", "ml", "it", "api", "sdk", "ui", "ux", "db", "os", "id"}

    # Bucket into skills vs tools; deduplicate by display name
    skills: list[str] = []
    tools: list[str] = []
    seen_lower: set[str] = set()          # keyed on raw lowercase
    seen_display_lower: set[str] = set()  # keyed on display name lowercase (catches AWS SageMaker dups)

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
    """Flatten all resume content to one lowercase string for keyword matching."""
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
        parts.append(ed.get("field") or ed.get("field_of_study") or "")
    for proj in (resume.projects or []):
        p = proj if isinstance(proj, dict) else proj.model_dump()
        parts.append(p.get("name") or "")
        parts.append(p.get("description") or "")
        parts.extend(h for h in (p.get("highlights") or []) if h)
        parts.extend(t for t in (p.get("technologies") or []) if t)
    parts.extend(s for s in (resume.skills or []) if s)
    parts.extend(t for t in (resume.tools or []) if t)
    return " ".join(parts).lower()


def _deduplicate(existing: list[str], additions: list[str]) -> list[str]:
    """Return additions not already present (case-insensitive)."""
    existing_lower = {s.lower() for s in existing}
    resume_text_lower = " ".join(existing).lower()
    out = []
    for s in additions:
        if s.lower() not in existing_lower and s.lower() not in resume_text_lower:
            out.append(s)
            existing_lower.add(s.lower())
    return out


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
    # Fallback: first line if short enough
    first_line = jd_text.strip().split("\n")[0].strip()
    if len(first_line) <= 60:
        return first_line.title()
    return "Software Engineer"


# ─── Broad stopwords (for all-terms extraction) ───────────────────────────────

_BROAD_STOPWORDS: set[str] = {
    # English function words
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "must", "can",
    "that", "this", "these", "those", "we", "you", "they", "he", "she", "it",
    "our", "your", "their", "its", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "not", "only", "same", "so", "than",
    "too", "very", "just", "who", "which", "what", "how", "when", "where", "why",
    "as", "if", "then", "because", "while", "also", "well", "us", "me", "my",
    "her", "him", "his",
    # Job-posting boilerplate (not useful as resume keywords)
    "job", "work", "team", "join", "role", "position", "candidate", "company",
    "opportunity", "looking", "seeking", "help", "take", "use", "able", "need",
    "want", "day", "time", "year", "years", "minimum", "required", "preferred",
    "nice", "plus", "description", "overview", "benefits", "salary", "location",
    "remote", "hybrid", "full", "part", "etc", "please", "apply", "make", "get",
    "new", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "responsible", "responsibilities", "requirements", "qualifications",
    "bonus", "must", "excellent", "great", "good", "strong", "high", "key", "see",
    "set", "per", "own", "let", "even", "still", "back", "way", "end", "right",
    "old", "off", "out", "here", "long", "down", "after", "first", "last", "next",
    "days", "week", "month", "months", "across", "between", "within", "without",
    "around", "over", "under", "above", "below", "before", "during", "since",
    "until", "upon", "toward", "near", "including", "based", "driven", "oriented",
    "focused", "related", "given", "become", "both", "come", "also", "example",
    "like", "such", "sure", "real", "area", "areas", "feel", "free",
    # Generic single words that read poorly as standalone skills
    "fast", "ship", "build", "data", "web", "apis", "code", "test",
    "base", "core", "open", "run", "move", "stay", "grow", "lead",
    "plan", "goal", "type", "kind", "mode", "site", "page", "list",
    "form", "flow", "step", "case", "item", "line", "side", "hand",
    "mind", "idea", "term", "level", "value", "sense", "view", "scope",
    "drive", "impact", "action", "effort", "assumptions", "assumption",
    "things", "thing", "stuff", "scale", "ensure", "provide", "support",
    "create", "achieve", "maintain", "meet", "exceed", "continue",
    "increase", "reduce", "manage", "communicate", "collaborate",
    "implement", "apply", "improve", "deliver", "demonstrate",
    "establish", "deploy", "monitor", "review", "write",
    # Seniority/role modifiers (not skills)
    "senior", "junior", "mid", "entry", "principal", "staff",
    # Gerunds / prep words that slip through as tokens
    "using", "working", "building", "developing", "designing",
    "leading", "creating", "including", "powering",
    # Single-word versions of things we already capture as phrases
    "model", "prompt", "vector", "database", "databases", "deployment",
    "development", "engineering", "application", "applications",
    "solution", "solutions", "service", "services", "platform",
    "system", "systems", "framework", "frameworks", "library",
    "environment", "infrastructure", "architecture",
}


def _extract_all_jd_terms(jd_text: str) -> list[str]:
    """
    Extract significant terms from a JD:
      1. Every significant SINGLE WORD (broad — catches 'validate', 'prototype', 'pipeline')
      2. Known MULTI-WORD PHRASES from our curated _DISPLAY dict only
         (e.g. 'web development', 'real time', 'machine learning')
    Avoids generating nonsense 2-word combos like 'Apis Sql' or 'Build Assumptions'.
    """
    text_lower = jd_text.lower()
    clean = re.sub(r"[^\w\s\-\/\+\#\.]", " ", text_lower)
    tokens = clean.split()

    terms: set[str] = set()

    # Regex that catches compound adjectives like "python-based", "llm-powered"
    _compound_adj = re.compile(
        r"-(based|powered|driven|oriented|focused|ready|aware|first|native|facing)$",
        re.IGNORECASE,
    )

    # ── 1. Single significant words ──
    for t in tokens:
        t = t.strip(".-/")
        if (len(t) >= 3
                and t not in _BROAD_STOPWORDS
                and not t.isdigit()
                and not re.match(r"^\d", t)
                and not _compound_adj.search(t)):   # skip "python-based" etc.
            terms.add(t)

    # ── 2. Curated multi-word phrases from _DISPLAY (the safe list) ──
    for phrase, _display_name in _DISPLAY.items():
        if " " in phrase:                        # only multi-word entries
            pattern = r"\b" + re.escape(phrase) + r"\b"
            if re.search(pattern, text_lower):
                terms.add(phrase)

    return sorted(terms)


def _get_existing_summary(resume: ResumeBase) -> str:
    """Return the candidate's current professional summary (empty string if none)."""
    if not resume.personal_info:
        return ""
    pi = (resume.personal_info if isinstance(resume.personal_info, dict)
          else resume.personal_info.model_dump())
    return (pi.get("summary") or "").strip()


def _append_jd_keywords_to_summary(existing: str, job_title: str, key_terms: list[str]) -> str:
    """
    APPEND JD keywords to the existing summary — never replace the original text.
    This preserves all original words that were already matching the JD.
    """
    if not key_terms:
        return existing
    unique_terms: list[str] = []
    seen_terms: set[str] = set()
    for term in key_terms:
        normalized = term.strip()
        lowered = normalized.lower()
        if not normalized or lowered in seen_terms:
            continue
        seen_terms.add(lowered)
        unique_terms.append(normalized)

    if not unique_terms:
        return existing

    kw_str = ", ".join(unique_terms[:10])
    append = (
        f"Additional alignment keywords for {job_title} roles include {kw_str}."
    )
    if existing:
        # Avoid double-appending if we've already done it
        if append in existing:
            return existing
        return f"{existing} {append}"
    return append


# ─── Heuristic tailoring (no API key) ────────────────────────────────────────

def _heuristic_tailor(resume: ResumeBase, jd_text: str) -> TailoringDiff:
    """
    1. Extract EVERY significant term from the JD (broad approach)
    2. Find what's missing from the resume
    3. Inject ALL missing terms as skills/tools
    4. APPEND JD keywords to the existing summary — NEVER replace it
    5. Do NOT alter experience, education, projects, or identity fields
    """
    # ── Broad extraction (catches "web development", "validate", all domain terms)
    all_jd_terms = _extract_all_jd_terms(jd_text)

    # ── Tech-specific extraction for properly cased tool names
    _, tech_tools = extract_jd_keywords(jd_text)

    # ── Flatten resume to text for comparison
    resume_text = _get_resume_text(resume)

    # ── Existing collections
    existing_skills_lower = {s.lower() for s in (resume.skills or [])}
    existing_tools_lower  = {t.lower() for t in (resume.tools  or [])}

    # ── Missing tools (properly display-cased named products)
    missing_tools: list[str] = []
    seen_tools_lower: set[str] = set(existing_tools_lower)
    for t in tech_tools:
        t_l = t.lower()
        if t_l not in resume_text and t_l not in seen_tools_lower:
            missing_tools.append(t)
            seen_tools_lower.add(t_l)
    missing_tools = missing_tools[:12]

    # ── ALL missing JD terms → add to skills
    # Display-case them, deduplicate, exclude whatever is already in tools
    tools_lower_set = seen_tools_lower | {t.lower() for t in missing_tools}
    skills_to_add: list[str] = []
    seen_skills_lower: set[str] = set(existing_skills_lower)

    for term in all_jd_terms:
        t_l = term.lower()
        if (t_l in resume_text
                or t_l in seen_skills_lower
                or t_l in tools_lower_set):
            continue
        # Display casing: check our lookup first, else title-case
        display = _display(t_l) if t_l in _DISPLAY else term.title()
        d_l = display.lower()
        if d_l not in seen_skills_lower:
            skills_to_add.append(display)
            seen_skills_lower.add(d_l)

    skills_to_add = skills_to_add[:30]  # max 30 new skills

    # ── Summary: APPEND to existing (NEVER replace) — preserves original resume identity
    existing_summary = _get_existing_summary(resume)
    top_new = missing_tools + skills_to_add
    job_title = _extract_jd_title(jd_text)
    summary = _append_jd_keywords_to_summary(existing_summary, job_title, top_new)

    return TailoringDiff(
        job_title=job_title,
        summary=summary,
        added_skills=skills_to_add,
        added_tools=missing_tools,
        experience_enhancements=[],
        added_project=None,
    )


# ─── OpenAI tailoring (primary path) ─────────────────────────────────────────

_SYSTEM_PROMPT = """You are an expert ATS resume optimizer. Your PRIMARY goal is to inject keywords from the job description into the resume to maximize keyword match score (target: 90%+).

KEYWORD INJECTION RULES:
1. Extract EVERY significant word, phrase, skill, tool, framework, and domain term from the JD
2. Find ALL terms that are MISSING from the resume
3. Add missing terms to added_skills and added_tools using exact spelling from the JD
4. Append JD keywords to the summary only — do NOT rewrite or restructure the resume

SUMMARY RULE — CRITICAL:
- DO NOT rewrite or replace the existing summary
- Return the ORIGINAL summary text verbatim, then APPEND one sentence at the end
- The appended sentence should include as many high-value JD terms as possible without removing original text
- Format: "[original summary text]. Additional alignment keywords for [job title] roles include [key JD terms]."

STRICT RULES — never break:
- NEVER change name, email, phone, location, links
- NEVER change company names, job titles, or dates
- NEVER change experience bullets, education, projects, or custom sections
- NEVER remove any existing content — ONLY ADD keywords to summary, skills, and tools
- Use EXACT keyword spelling from the JD

CLASSIFICATION:
- added_skills: concepts, methodologies, domain knowledge (e.g., Machine Learning, RAG, CI/CD, Web Development)
- added_tools: named products, frameworks, libraries (e.g., LangChain, React, Docker)

Add as many keywords as needed — prioritize completeness over brevity.

Return ONLY valid JSON:
{
  "job_title": "job title from JD",
  "summary": "ORIGINAL summary text + appended sentence with JD keywords",
  "added_skills": ["all", "missing", "skill", "keywords", "from", "JD"],
  "added_tools": ["all", "missing", "tool", "names", "from", "JD"],
  "experience_enhancements": [],
  "added_project": null
}"""


def _get_personal_info_dict(resume: ResumeBase) -> dict:
    """Safely extract personal_info as a plain dict, handling None."""
    pi = resume.personal_info
    if pi is None:
        return {}
    if isinstance(pi, dict):
        return pi
    return pi.model_dump()


async def _openai_tailor(resume: ResumeBase, jd_text: str, api_key: str) -> TailoringDiff:
    import openai

    # Pre-extract all JD terms so the model can focus on injecting them
    all_jd_terms = _extract_all_jd_terms(jd_text)
    _, tech_tools = extract_jd_keywords(jd_text)
    resume_text = _get_resume_text(resume)

    missing_all   = [t for t in all_jd_terms if t not in resume_text][:40]
    missing_tools = [t for t in tech_tools if t.lower() not in resume_text][:15]
    existing_summary = _get_existing_summary(resume)

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
    }

    user_msg = (
        f"CANDIDATE RESUME:\n{json.dumps(resume_dict, indent=2)}\n\n"
        f"ORIGINAL SUMMARY (keep this verbatim, then append):\n{existing_summary}\n\n"
        f"JOB DESCRIPTION:\n{jd_text[:3000]}\n\n"
        f"ALL MISSING JD TERMS TO INJECT:\n{', '.join(missing_all)}\n\n"
        f"MISSING TOOLS:\n{', '.join(missing_tools)}\n\n"
        "Inject ALL missing keywords. Keep the original summary and append one sentence. "
        "Do not modify experience, education, projects, names, dates, or other existing content."
    )

    client = openai.AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
        max_tokens=2000,
    )

    raw = response.choices[0].message.content or "{}"
    data: dict = json.loads(raw)

    # Safety net: if GPT returned a summary that lost the original, restore it
    returned_summary = data.get("summary", "")
    if existing_summary and existing_summary[:50] not in returned_summary:
        returned_summary = _append_jd_keywords_to_summary(
            existing_summary, _extract_jd_title(jd_text),
            [*data.get("added_tools", missing_tools[:10]), *data.get("added_skills", missing_all[:20])]
        )

    return TailoringDiff(
        job_title=data.get("job_title", _extract_jd_title(jd_text)),
        summary=returned_summary,
        added_skills=data.get("added_skills", missing_all[:25]),
        added_tools=data.get("added_tools", missing_tools[:12]),
        experience_enhancements=[],
        added_project=None,
    )


# ─── Gemini tailoring ─────────────────────────────────────────────────────────

async def _gemini_tailor(resume: ResumeBase, jd_text: str, api_key: str) -> TailoringDiff:
    import google.generativeai as genai

    all_jd_terms = _extract_all_jd_terms(jd_text)
    _, tech_tools = extract_jd_keywords(jd_text)
    resume_text = _get_resume_text(resume)

    missing_all   = [t for t in all_jd_terms if t not in resume_text][:40]
    missing_tools = [t for t in tech_tools if t.lower() not in resume_text][:15]
    existing_summary = _get_existing_summary(resume)

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
    }

    prompt = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"CANDIDATE RESUME:\n{json.dumps(resume_dict, indent=2)}\n\n"
        f"ORIGINAL SUMMARY (keep this verbatim, then append):\n{existing_summary}\n\n"
        f"JOB DESCRIPTION:\n{jd_text[:3000]}\n\n"
        f"ALL MISSING JD TERMS TO INJECT:\n{', '.join(missing_all)}\n\n"
        f"MISSING TOOLS:\n{', '.join(missing_tools)}\n\n"
        "Inject ALL missing keywords. Keep the original summary and append one sentence. "
        "Do not modify experience, education, projects, names, dates, or other existing content."
    )

    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))

    raw = (response.text or "{}").strip()
    # Strip markdown fences if Gemini wraps the JSON
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    data: dict = json.loads(raw)

    returned_summary = data.get("summary", "")
    if existing_summary and existing_summary[:50] not in returned_summary:
        returned_summary = _append_jd_keywords_to_summary(
            existing_summary, _extract_jd_title(jd_text),
            [*data.get("added_tools", missing_tools[:10]), *data.get("added_skills", missing_all[:20])]
        )

    return TailoringDiff(
        job_title=data.get("job_title", _extract_jd_title(jd_text)),
        summary=returned_summary,
        added_skills=data.get("added_skills", missing_all[:25]),
        added_tools=data.get("added_tools", missing_tools[:12]),
        experience_enhancements=[],
        added_project=None,
    )


# ─── Public entry point ───────────────────────────────────────────────────────

class LLMService:
    def __init__(self) -> None:
        from app.core.config import get_settings
        self._settings = get_settings()
        # Configure Gemini once per instance — avoids per-request global mutation
        gemini_key = (self._settings.gemini_api_key or "").strip()
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
            except Exception:
                pass

    async def tailor_resume(self, resume: ResumeBase, jd_text: str) -> TailoringDiff:
        openai_key = (self._settings.openai_api_key or "").strip()
        gemini_key = (self._settings.gemini_api_key or "").strip()

        if openai_key:
            try:
                return await _openai_tailor(resume=resume, jd_text=jd_text, api_key=openai_key)
            except Exception as exc:
                logger.warning("OpenAI tailoring failed (%s) — trying Gemini.", exc)

        if gemini_key:
            try:
                return await _gemini_tailor(resume=resume, jd_text=jd_text, api_key=gemini_key)
            except Exception as exc:
                logger.warning("Gemini tailoring failed (%s) — using heuristics.", exc)

        return _heuristic_tailor(resume=resume, jd_text=jd_text)


# ─── Apply diff to resume ─────────────────────────────────────────────────────

def apply_tailoring(resume: ResumeBase, diff: TailoringDiff) -> ResumeBase:
    """
    Merge a TailoringDiff into a resume copy.
    Existing content is never removed.
    This flow only appends to summary and injects into skills/tools.
    """
    data = resume.model_dump()

    # Guard: any list/dict field may be None in DB rows with incomplete parse
    if not data.get("personal_info"):
        data["personal_info"] = {}
    data["skills"] = data.get("skills") or []
    data["tools"] = data.get("tools") or []
    data["experience"] = data.get("experience") or []
    data["education"] = data.get("education") or []
    data["projects"] = data.get("projects") or []
    data["custom_sections"] = data.get("custom_sections") or []

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

    return ResumeBase.model_validate(data)
