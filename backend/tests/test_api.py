from pathlib import Path
from datetime import datetime, timedelta, timezone

from jose import jwt
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import create_refresh_token
from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.models import resume, user  # noqa: F401
from app.schemas.scrape import JobScrapeResponse

TEST_DB_PATH = Path("test_backend.db")


def setup_module() -> None:
    import asyncio

    async def prepare_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(prepare_database())


def teardown_module() -> None:
    import asyncio

    async def cleanup_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
        await engine.dispose()

    asyncio.run(cleanup_database())
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


def test_signup_login_and_resume_crud() -> None:
    with TestClient(app) as test_client:
        signup_response = test_client.post(
            "/api/auth/signup",
            json={
                "email": "lead.ai@example.com",
                "full_name": "Lead AI Engineer",
                "password": "securepass123",
            },
        )

        assert signup_response.status_code == 201
        signup_payload = signup_response.json()
        assert signup_payload["user"]["email"] == "lead.ai@example.com"
        assert signup_payload["access_token"] is None
        assert "access_token" in signup_response.cookies

        me_response = test_client.get(
            "/api/user/me",
        )
        assert me_response.status_code == 200
        assert me_response.json()["full_name"] == "Lead AI Engineer"

        login_response = test_client.post(
            "/api/auth/login",
            json={"email": "lead.ai@example.com", "password": "securepass123"},
        )
        assert login_response.status_code == 200

        resume_response = test_client.post(
            "/api/resume",
            json={
                "title": "AI Engineer Resume",
                "personal_info": {
                    "full_name": "Lead AI Engineer",
                    "email": "lead.ai@example.com",
                    "summary": "Builds production-ready AI products.",
                },
                "education": [
                    {
                        "institution": "OpenAI University",
                        "degree": "MS",
                        "field_of_study": "Computer Science",
                    }
                ],
                "skills": ["Python", "FastAPI"],
                "tools": ["PostgreSQL", "Redis"],
                "projects": [
                    {
                        "name": "AI Resume Agent",
                        "description": "Built a full-stack resume platform.",
                        "technologies": ["Next.js", "FastAPI"],
                    }
                ],
            },
        )
        assert resume_response.status_code == 201
        resume_payload = resume_response.json()
        resume_id = resume_payload["id"]
        assert resume_payload["skills"] == ["Python", "FastAPI"]

        get_resume_response = test_client.get(
            f"/api/resume/{resume_id}",
        )
        assert get_resume_response.status_code == 200
        assert get_resume_response.json()["title"] == "AI Engineer Resume"

        update_resume_response = test_client.put(
            f"/api/resume/{resume_id}",
            json={
                "skills": ["Python", "FastAPI", "System Design"],
                "tools": ["PostgreSQL", "Redis", "Celery"],
            },
        )
        assert update_resume_response.status_code == 200
        assert update_resume_response.json()["skills"][-1] == "System Design"


def test_ats_analysis_with_resume_id() -> None:
    with TestClient(app) as test_client:
        signup_response = test_client.post(
            "/api/auth/signup",
            json={
                "email": "ats.agent@example.com",
                "full_name": "ATS Analyst",
                "password": "securepass123",
            },
        )
        assert signup_response.status_code == 201

        resume_response = test_client.post(
            "/api/resume",
            json={
                "title": "Backend AI Resume",
                "personal_info": {
                    "full_name": "ATS Analyst",
                    "email": "ats.agent@example.com",
                    "summary": "Built Python FastAPI services with Redis and PostgreSQL.",
                },
                "skills": ["Python", "FastAPI", "System Design"],
                "tools": ["Redis", "PostgreSQL", "Docker"],
                "projects": [
                    {
                        "name": "Resume Platform",
                        "description": "Shipped async APIs and keyword analysis tooling.",
                        "technologies": ["Python", "FastAPI", "NLP"],
                    }
                ],
            },
        )
        assert resume_response.status_code == 201
        resume_id = resume_response.json()["id"]

        ats_response = test_client.post(
            "/api/ats/analyze",
            json={
                "resume_id": resume_id,
                "job_description_text": (
                    "We are hiring an AI backend engineer with Python, FastAPI, "
                    "PostgreSQL, Docker, Kubernetes, NLP, and system design experience."
                ),
                "job_link": "https://example.com/jobs/ai-backend-engineer",
            },
        )

        assert ats_response.status_code == 200
        ats_payload = ats_response.json()
        assert ats_payload["job_input_status"] == "text_and_link_ready"
        assert ats_payload["overall_ats_score"] > 0
        assert ats_payload["semantic_score"] > 0
        assert ats_payload["weighted_section_score"] > 0
        assert "skills" in ats_payload["section_scores"]
        assert "python" in " ".join(ats_payload["matched_keywords"])
        assert "kubernetes" in ats_payload["missing_skills"]
        assert ats_payload["ranked_missing_skills"][0]
        assert ats_payload["improvement_suggestions"]


def test_scrape_job_endpoint(monkeypatch) -> None:
    async def fake_scrape_job(self, *, job_link: str) -> JobScrapeResponse:
        return JobScrapeResponse(
            source_url=job_link,
            source_type="lever",
            job_title="Senior NLP Engineer",
            company="AI Resume Agent",
            job_description_text=(
                "We need Python, Playwright, BeautifulSoup, NLP, and ATS analysis experience."
            ),
            skills_requirements="Python Playwright BeautifulSoup NLP ATS",
        )

    monkeypatch.setattr(
        "app.services.job_scraper_service.JobScraperService.scrape_job",
        fake_scrape_job,
    )

    with TestClient(app) as test_client:
        signup_response = test_client.post(
            "/api/auth/signup",
            json={
                "email": "scraper.agent@example.com",
                "full_name": "Scraper Agent",
                "password": "securepass123",
            },
        )
        token = signup_response.json()["access_token"]
        assert token is None

        scrape_response = test_client.post(
            "/api/scrape-job",
            json={"job_link": "https://jobs.lever.co/company/ats-role"},
        )

        assert scrape_response.status_code == 200
        scrape_payload = scrape_response.json()
        assert scrape_payload["source_type"] == "lever"
        assert scrape_payload["job_title"] == "Senior NLP Engineer"
        assert "BeautifulSoup" in scrape_payload["job_description_text"]


def test_ats_analysis_auto_scrapes_job_link(monkeypatch) -> None:
    async def fake_scrape_job(self, *, job_link: str) -> JobScrapeResponse:
        return JobScrapeResponse(
            source_url=job_link,
            source_type="greenhouse",
            job_title="AI Backend Engineer",
            company="Example Co",
            job_description_text=(
                "Looking for Python FastAPI PostgreSQL Docker Playwright and BeautifulSoup experience."
            ),
            skills_requirements="Python FastAPI PostgreSQL Docker Playwright BeautifulSoup",
        )

    monkeypatch.setattr(
        "app.services.job_scraper_service.JobScraperService.scrape_job",
        fake_scrape_job,
    )

    with TestClient(app) as test_client:
        test_client.post(
            "/api/auth/signup",
            json={
                "email": "scrape.ats@example.com",
                "full_name": "Scrape ATS",
                "password": "securepass123",
            },
        )

        resume_response = test_client.post(
            "/api/resume",
            json={
                "title": "Scraper Resume",
                "personal_info": {
                    "full_name": "Scrape ATS",
                    "email": "scrape.ats@example.com",
                    "summary": "Built Python FastAPI data pipelines with PostgreSQL and Docker.",
                },
                "skills": ["Python", "FastAPI"],
                "tools": ["PostgreSQL", "Docker"],
                "projects": [
                    {
                        "name": "Scraper System",
                        "description": "Implemented job scraping and parsing flows.",
                        "technologies": ["Python", "BeautifulSoup"],
                    }
                ],
            },
        )
        resume_id = resume_response.json()["id"]

        ats_response = test_client.post(
            "/api/ats/analyze",
            json={
                "resume_id": resume_id,
                "job_link": "https://boards.greenhouse.io/example/jobs/123",
            },
        )

        assert ats_response.status_code == 200
        ats_payload = ats_response.json()
        assert ats_payload["job_input_status"] == "scraped_from_link"
        assert ats_payload["scraped_job"]["source_type"] == "greenhouse"
        assert "playwright" in ats_payload["missing_skills"]


def test_ats_synonym_normalization_with_inline_resume() -> None:
    with TestClient(app) as test_client:
        test_client.post(
            "/api/auth/signup",
            json={
                "email": "synonym.agent@example.com",
                "full_name": "Synonym Agent",
                "password": "securepass123",
            },
        )

        ats_response = test_client.post(
            "/api/ats/analyze",
            json={
                "job_description_text": (
                    "Looking for an engineer with JS, TS, Postgres, and NLP experience."
                ),
                "resume": {
                    "title": "Synonym Resume",
                    "personal_info": {
                        "full_name": "Synonym Agent",
                        "summary": "Built JavaScript and TypeScript systems with PostgreSQL and natural language processing pipelines."
                    },
                    "skills": ["JavaScript", "TypeScript"],
                    "tools": ["PostgreSQL"],
                    "projects": [
                        {
                            "name": "Language Platform",
                            "description": "Created NLP workflows for content intelligence.",
                            "technologies": ["Python", "NLP"],
                        }
                    ],
                },
            },
        )

        assert ats_response.status_code == 200
        ats_payload = ats_response.json()
        matched = " ".join(ats_payload["matched_keywords"])
        assert "javascript" in matched
        assert "typescript" in matched
        assert "postgresql" in matched
        assert ats_payload["semantic_score"] > 0
        assert ats_payload["overall_ats_score"] > 0


def test_interview_session_flow() -> None:
    with TestClient(app) as test_client:
        test_client.post(
            "/api/auth/signup",
            json={
                "email": "interview.agent@example.com",
                "full_name": "Interview Agent",
                "password": "securepass123",
            },
        )

        resume_response = test_client.post(
            "/api/resume",
            json={
                "title": "Interview Resume",
                "personal_info": {
                    "full_name": "Interview Agent",
                    "email": "interview.agent@example.com",
                    "summary": "Built Python FastAPI systems and delivered resume intelligence features.",
                },
                "skills": ["Python", "FastAPI"],
                "tools": ["PostgreSQL", "Redis"],
                "projects": [
                    {
                        "name": "Resume Agent",
                        "description": "Created backend APIs and automation workflows.",
                        "technologies": ["Python", "FastAPI", "Redis"],
                    }
                ],
            },
        )
        resume_id = resume_response.json()["id"]

        start_response = test_client.post(
            "/api/interview/start",
            json={
                "resume_id": resume_id,
                "difficulty": "medium",
                "question_count": 10,
            },
        )

        assert start_response.status_code == 200
        start_payload = start_response.json()
        session_id = start_payload["session_id"]
        assert start_payload["current_question"]["question_type"] in {"mcq", "short_answer"}

        current_question = start_payload["current_question"]
        answer_value = (
            current_question["options"][0]
            if current_question["question_type"] == "mcq"
            else "I used Python and FastAPI in production with clear delivery impact."
        )

        answer_response = test_client.post(
            "/api/interview/answer",
            json={
                "session_id": session_id,
                "answer": answer_value,
            },
        )

        assert answer_response.status_code == 200
        answer_payload = answer_response.json()
        assert "evaluation" in answer_payload
        assert answer_payload["progress"]["answered"] == 1

        result_response = test_client.get(
            f"/api/interview/result?session_id={session_id}",
        )

        assert result_response.status_code == 200
        result_payload = result_response.json()
        assert result_payload["question_count"] == 10
        assert result_payload["answered_questions"] == 1
        assert result_payload["strengths"]
        assert result_payload["weak_areas"]


def test_google_placeholder_and_health() -> None:
    with TestClient(app) as test_client:
        health_response = test_client.get("/api/health")
        placeholder_response = test_client.get("/api/auth/google")

        assert health_response.status_code == 200
        assert placeholder_response.status_code == 200
        assert placeholder_response.json()["provider"] == "google"


def test_protected_routes_reject_expired_tokens() -> None:
    settings = get_settings()
    expired_token = jwt.encode(
        {
            "sub": "expired-user",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    with TestClient(app) as test_client:
        me_response = test_client.get(
            "/api/user/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert me_response.status_code == 401
        assert me_response.json()["detail"] == "Invalid or expired token."


def test_refresh_endpoint_restores_cookie_session() -> None:
    with TestClient(app) as test_client:
        signup_response = test_client.post(
            "/api/auth/signup",
            json={
                "email": "refresh.agent@example.com",
                "full_name": "Refresh Agent",
                "password": "securepass123",
            },
        )

        user_id = signup_response.json()["user"]["id"]
        test_client.cookies.set("access_token", "expired-token")
        test_client.cookies.set("refresh_token", create_refresh_token(user_id), path="/api/auth")

        refresh_response = test_client.post("/api/auth/refresh")

        assert refresh_response.status_code == 200
        assert refresh_response.json()["access_token"] is None

        me_response = test_client.get("/api/user/me")
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "refresh.agent@example.com"


def test_ats_analysis_rejects_blank_job_description() -> None:
    with TestClient(app) as test_client:
        test_client.post(
            "/api/auth/signup",
            json={
                "email": "blank.ats@example.com",
                "full_name": "Blank ATS",
                "password": "securepass123",
            },
        )

        ats_response = test_client.post(
            "/api/ats/analyze",
            json={
                "job_description_text": "   ",
                "resume": {
                    "title": "Blank Resume",
                    "skills": ["Python"],
                    "tools": ["FastAPI"],
                    "education": [],
                    "projects": [],
                    "personal_info": {},
                },
            },
        )

        assert ats_response.status_code == 422
        assert "Provide job_description_text or job_link." in str(ats_response.json())


def test_interview_answer_rejects_blank_answer() -> None:
    with TestClient(app) as test_client:
        test_client.post(
            "/api/auth/signup",
            json={
                "email": "blank.interview@example.com",
                "full_name": "Blank Interview",
                "password": "securepass123",
            },
        )

        start_response = test_client.post(
            "/api/interview/start",
            json={
                "difficulty": "easy",
                "question_count": 10,
                "resume": {
                    "title": "Interview Resume",
                    "personal_info": {
                        "summary": "Built Python FastAPI APIs and shipped backend systems."
                    },
                    "skills": ["Python", "FastAPI"],
                    "tools": ["PostgreSQL"],
                    "education": [],
                    "projects": [
                        {
                            "name": "API Platform",
                            "description": "Built production APIs.",
                            "technologies": ["Python", "FastAPI"],
                            "highlights": [],
                        }
                    ],
                },
            },
        )

        session_id = start_response.json()["session_id"]
        answer_response = test_client.post(
            "/api/interview/answer",
            json={
                "session_id": session_id,
                "answer": "   ",
            },
        )

        assert answer_response.status_code == 422
