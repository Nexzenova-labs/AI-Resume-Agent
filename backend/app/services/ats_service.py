from __future__ import annotations

from collections import Counter
from typing import Union

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding_service import EmbeddingService
from app.models.user import User
from app.nlp.keyword_extractor import KeywordExtractor
from app.nlp.semantic_similarity import cosine_similarity
from app.nlp.term_normalizer import TermNormalizer
from app.repositories.resume_repository import ResumeRepository
from app.schemas.ats import (
    AtsAnalysisResponse,
    AtsAnalyzeRequest,
    ResumeQualityRequest,
    ResumeQualityResponse,
    SectionQuality,
)
from app.schemas.resume import ResumeCreate, ResumeResponse
from app.schemas.scrape import JobScrapeResponse
from app.services.job_scraper_service import JobScraperService

SECTION_WEIGHTS = {
    "skills": 0.30,
    "tools": 0.20,
    "experience": 0.30,
    "projects": 0.20,
}


def _clamp(value: float, lo: int = 0, hi: int = 100) -> int:
    """Round a float and clamp to [lo, hi]."""
    return max(lo, min(hi, round(value)))


class AtsService:
    def __init__(self, session: AsyncSession) -> None:
        self.resume_repository = ResumeRepository(session)
        self.keyword_extractor = KeywordExtractor()
        self.term_normalizer = TermNormalizer()
        self.embedding_service = EmbeddingService()
        self.job_scraper_service = JobScraperService()

    # ─────────────────────────────────────────────────────────────────────────
    # Public: ATS match (resume vs JD)
    # ─────────────────────────────────────────────────────────────────────────

    async def analyze(self, *, payload: AtsAnalyzeRequest, user: User) -> AtsAnalysisResponse:
        resume_snapshot = await self._resolve_resume(payload=payload, user=user)
        scraped_job = await self._resolve_job_input(payload)
        job_description_text = self._build_job_description_surface(
            payload=payload,
            scraped_job=scraped_job,
        )

        extracted_keywords = self.keyword_extractor.extract_core_terms(job_description_text)
        normalized_resume_terms = self._build_normalized_resume_terms(resume_snapshot)
        exact_skill_terms = self._build_exact_skill_terms(resume_snapshot)

        matched_keywords = [
            keyword
            for keyword in extracted_keywords
            if self._is_keyword_matched(
                keyword=keyword,
                normalized_resume_terms=normalized_resume_terms,
                exact_skill_terms=exact_skill_terms,
            )
        ]

        ranked_missing_skills = self._rank_missing_skills(
            extracted_keywords=extracted_keywords,
            matched_keywords=matched_keywords,
            job_description_text=job_description_text,
            scraped_job=scraped_job,
        )
        missing_skills = ranked_missing_skills[:10]
        keyword_match_score = self._compute_ratio_score(
            matched=len(matched_keywords),
            total=len(extracted_keywords),
        )

        section_surfaces = self._build_section_surfaces(resume_snapshot)
        semantic_score, weighted_section_score, section_scores = await self._score_sections(
            job_description_text=job_description_text,
            section_surfaces=section_surfaces,
            extracted_keywords=extracted_keywords,
        )
        overall_ats_score = _clamp(
            (keyword_match_score * 0.30)
            + (semantic_score * 0.25)
            + (weighted_section_score * 0.45)
        )

        return AtsAnalysisResponse(
            job_input_status=self._determine_job_input_status(payload),
            extracted_keywords=extracted_keywords,
            matched_keywords=matched_keywords,
            missing_skills=missing_skills,
            ranked_missing_skills=ranked_missing_skills,
            keyword_match_score=keyword_match_score,
            semantic_score=semantic_score,
            weighted_section_score=weighted_section_score,
            section_scores=section_scores,
            overall_ats_score=overall_ats_score,
            improvement_suggestions=self._build_suggestions(
                ranked_missing_skills=ranked_missing_skills,
                keyword_match_score=keyword_match_score,
                semantic_score=semantic_score,
                section_scores=section_scores,
                payload=payload,
                scraped_job=scraped_job,
            ),
            resume_snapshot=resume_snapshot,
            scraped_job=scraped_job,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Public: Resume quality score (no JD required)
    # ─────────────────────────────────────────────────────────────────────────

    async def score_resume_quality(
        self,
        *,
        payload: ResumeQualityRequest,
        user: User,
    ) -> ResumeQualityResponse:
        """Score a resume on its own merits — completeness, keyword richness, structure."""
        resume = await self._resolve_resume_quality(payload=payload, user=user)

        section_breakdown: dict[str, SectionQuality] = {}
        total_earned = 0
        total_max = 0

        # ── Personal Info (20 pts) ────────────────────────────────────────────
        pi = resume.personal_info
        pi_notes: list[str] = []
        pi_score = 0
        if pi.full_name and pi.full_name.strip():
            pi_score += 5
        else:
            pi_notes.append("Add your full name.")
        if pi.email and pi.email.strip():
            pi_score += 5
        else:
            pi_notes.append("Add a professional email address.")
        if pi.phone and pi.phone.strip():
            pi_score += 3
        else:
            pi_notes.append("Add a phone number.")
        if pi.location and pi.location.strip():
            pi_score += 2
        else:
            pi_notes.append("Add your city / country.")
        if pi.links:
            pi_score += 5
        else:
            pi_notes.append("Add LinkedIn or GitHub links.")
        section_breakdown["contact"] = SectionQuality(
            score=pi_score, max_score=20,
            present=bool(pi.full_name or pi.email),
            notes=pi_notes,
        )
        total_earned += pi_score
        total_max += 20

        # ── Summary (10 pts) ─────────────────────────────────────────────────
        summary_score = 0
        summary_notes: list[str] = []
        if pi.summary and len(pi.summary.strip()) >= 30:
            summary_score = 10
        elif pi.summary and pi.summary.strip():
            summary_score = 5
            summary_notes.append("Expand your summary to at least 2–3 sentences.")
        else:
            summary_notes.append("Add a professional summary (2–3 sentences about your role and strengths).")
        section_breakdown["summary"] = SectionQuality(
            score=summary_score, max_score=10,
            present=bool(pi.summary and pi.summary.strip()),
            notes=summary_notes,
        )
        total_earned += summary_score
        total_max += 10

        # ── Skills (25 pts) ──────────────────────────────────────────────────
        skills_count = len(resume.skills)
        tools_count = len(resume.tools)
        skills_notes: list[str] = []
        if skills_count >= 8:
            skills_pts = 20
        elif skills_count >= 4:
            skills_pts = 12
        elif skills_count >= 1:
            skills_pts = 6
            skills_notes.append("Add more skills — aim for at least 8 core skills.")
        else:
            skills_pts = 0
            skills_notes.append("Skills section is empty. Add your core technical skills.")
        if tools_count >= 4:
            tools_pts = 5
        elif tools_count >= 1:
            tools_pts = 3
        else:
            tools_pts = 0
            skills_notes.append("List tools and technologies you've used.")
        section_breakdown["skills"] = SectionQuality(
            score=skills_pts + tools_pts, max_score=25,
            present=bool(resume.skills or resume.tools),
            notes=skills_notes,
        )
        total_earned += skills_pts + tools_pts
        total_max += 25

        # ── Experience (25 pts) ──────────────────────────────────────────────
        exp_count = len(resume.experience)
        exp_notes: list[str] = []
        if exp_count >= 2:
            exp_pts = 20
        elif exp_count == 1:
            exp_pts = 12
            exp_notes.append("Add more work experiences if available.")
        else:
            exp_pts = 0
            exp_notes.append("Experience section is empty. Add your work history.")
        # Bonus for bullet highlights
        exp_with_highlights = sum(1 for e in resume.experience if e.highlights)
        if exp_with_highlights > 0:
            exp_pts = min(25, exp_pts + 5)
        else:
            exp_notes.append("Add bullet-point highlights to each job (quantify achievements).")
        section_breakdown["experience"] = SectionQuality(
            score=exp_pts, max_score=25,
            present=bool(resume.experience),
            notes=exp_notes,
        )
        total_earned += exp_pts
        total_max += 25

        # ── Education (10 pts) ───────────────────────────────────────────────
        edu_count = len(resume.education)
        edu_notes: list[str] = []
        if edu_count >= 1:
            edu_pts = 10
        else:
            edu_pts = 0
            edu_notes.append("Add your educational background.")
        section_breakdown["education"] = SectionQuality(
            score=edu_pts, max_score=10,
            present=bool(resume.education),
            notes=edu_notes,
        )
        total_earned += edu_pts
        total_max += 10

        # ── Projects (10 pts) ────────────────────────────────────────────────
        proj_count = len(resume.projects)
        proj_notes: list[str] = []
        if proj_count >= 2:
            proj_pts = 10
        elif proj_count == 1:
            proj_pts = 6
            proj_notes.append("Add at least one more project to strengthen this section.")
        else:
            proj_pts = 0
            proj_notes.append("Add personal or professional projects to showcase your work.")
        section_breakdown["projects"] = SectionQuality(
            score=proj_pts, max_score=10,
            present=bool(resume.projects),
            notes=proj_notes,
        )
        total_earned += proj_pts
        total_max += 10

        # ── Completeness score ───────────────────────────────────────────────
        completeness_score = _clamp((total_earned / total_max) * 100) if total_max else 0

        # ── Keyword richness score ────────────────────────────────────────────
        all_skills = list(resume.skills) + list(resume.tools)
        unique_tech_terms = len(set(t.lower() for t in all_skills))
        if unique_tech_terms >= 15:
            kw_score = 100
        elif unique_tech_terms >= 10:
            kw_score = 80
        elif unique_tech_terms >= 6:
            kw_score = 60
        elif unique_tech_terms >= 3:
            kw_score = 40
        elif unique_tech_terms >= 1:
            kw_score = 20
        else:
            kw_score = 0

        # ── Overall score: 70% completeness + 30% keyword richness ───────────
        overall = _clamp(completeness_score * 0.70 + kw_score * 0.30)

        # ── Grade ─────────────────────────────────────────────────────────────
        if overall >= 90:
            grade = "A"
        elif overall >= 75:
            grade = "B"
        elif overall >= 60:
            grade = "C"
        elif overall >= 45:
            grade = "D"
        else:
            grade = "F"

        # ── Missing sections ─────────────────────────────────────────────────
        missing_sections = [
            name
            for name, sq in section_breakdown.items()
            if not sq.present
        ]

        # ── Tips ─────────────────────────────────────────────────────────────
        tips: list[str] = []
        for sq in section_breakdown.values():
            tips.extend(sq.notes)
        if not tips:
            tips.append("Great resume! Run a JD match in the ATS tab to tailor it for specific roles.")

        return ResumeQualityResponse(
            overall_score=overall,
            grade=grade,
            completeness_score=completeness_score,
            keyword_richness_score=kw_score,
            section_breakdown=section_breakdown,
            detected_skills=all_skills,
            missing_recommended_sections=missing_sections,
            tips=tips[:6],
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _resolve_resume(
        self,
        *,
        payload: AtsAnalyzeRequest,
        user: User,
    ) -> Union[ResumeResponse, ResumeCreate]:
        if payload.resume:
            return payload.resume

        if not payload.resume_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A resume_id or resume payload is required.",
            )

        resume = await self.resume_repository.get_by_id_for_user(
            resume_id=payload.resume_id,
            user_id=user.id,
        )
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )
        return ResumeResponse.model_validate(resume)

    async def _resolve_resume_quality(
        self,
        *,
        payload: ResumeQualityRequest,
        user: User,
    ) -> Union[ResumeResponse, ResumeCreate]:
        if payload.resume:
            return payload.resume

        if not payload.resume_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A resume_id or resume payload is required.",
            )

        resume = await self.resume_repository.get_by_id_for_user(
            resume_id=payload.resume_id,
            user_id=user.id,
        )
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )
        return ResumeResponse.model_validate(resume)

    async def _resolve_job_input(self, payload: AtsAnalyzeRequest) -> JobScrapeResponse | None:
        if not payload.job_link:
            return None
        try:
            return await self.job_scraper_service.scrape_job(job_link=str(payload.job_link))
        except HTTPException:
            if payload.job_description_text:
                return None
            raise

    def _build_job_description_surface(
        self,
        *,
        payload: AtsAnalyzeRequest,
        scraped_job: JobScrapeResponse | None,
    ) -> str:
        segments = [payload.job_description_text or ""]
        if scraped_job:
            segments.append(scraped_job.job_description_text)
            segments.append(scraped_job.skills_requirements or "")
        return " ".join(segment for segment in segments if segment).strip()

    def _build_section_surfaces(
        self,
        resume: Union[ResumeResponse, ResumeCreate],
    ) -> dict[str, str]:
        experience_parts = [resume.personal_info.summary or ""]
        experience_parts.extend(
            f"{item.role} {item.company} {item.description or ''} {' '.join(item.highlights)}"
            for item in resume.experience
        )

        project_parts = [
            f"{p.name} {p.description} {' '.join(p.technologies)} {' '.join(p.highlights)}"
            for p in resume.projects
        ]

        return {
            "skills": " ".join(resume.skills),
            "tools": " ".join(resume.tools),
            "experience": " ".join(part for part in experience_parts if part),
            "projects": " ".join(project_parts),
        }

    def _build_normalized_resume_terms(
        self,
        resume: Union[ResumeResponse, ResumeCreate],
    ) -> set[str]:
        section_surfaces = self._build_section_surfaces(resume)
        resume_surface = " ".join(section_surfaces.values())
        tokens = self.term_normalizer.normalize_tokens(resume_surface)
        return set(tokens)

    def _build_exact_skill_terms(
        self,
        resume: Union[ResumeResponse, ResumeCreate],
    ) -> set[str]:
        direct_terms = {
            self.term_normalizer.normalize_term(item)
            for item in [*resume.skills, *resume.tools]
            if item.strip()
        }
        return {term for term in direct_terms if term}

    def _is_keyword_matched(
        self,
        *,
        keyword: str,
        normalized_resume_terms: set[str],
        exact_skill_terms: set[str],
    ) -> bool:
        normalized_keyword = self.term_normalizer.normalize_term(keyword)

        # 1. Direct match against the skills/tools list
        if normalized_keyword in exact_skill_terms:
            return True

        # 2. Individual token subset match (e.g., "machine learning" matches
        #    if both "machine" and "learning" are in the resume text)
        keyword_tokens = set(self.term_normalizer.normalize_tokens(keyword))
        if keyword_tokens and keyword_tokens.issubset(normalized_resume_terms):
            return True

        # 3. Partial match: the keyword is a single token that is a prefix/suffix
        #    of any exact skill term (handles "python3" matching "python" etc.)
        if " " not in normalized_keyword:
            for skill_term in exact_skill_terms:
                if " " not in skill_term and (
                    skill_term.startswith(normalized_keyword)
                    or normalized_keyword.startswith(skill_term)
                ):
                    return True

        return False

    async def _score_sections(
        self,
        *,
        job_description_text: str,
        section_surfaces: dict[str, str],
        extracted_keywords: list[str],
    ) -> tuple[int, int, dict[str, int]]:
        embedding_inputs = [job_description_text, *section_surfaces.values()]
        embeddings = await self.embedding_service.embed_texts(embedding_inputs)
        job_embedding = embeddings[0]
        section_embeddings = dict(zip(section_surfaces.keys(), embeddings[1:]))

        section_scores: dict[str, int] = {}
        weighted_score = 0.0
        section_similarities: list[float] = []

        for section_name, section_text in section_surfaces.items():
            section_embedding = section_embeddings[section_name]
            semantic_similarity = cosine_similarity(job_embedding, section_embedding)

            section_terms = set(self.term_normalizer.normalize_tokens(section_text))
            keyword_hits = sum(
                1
                for keyword in extracted_keywords
                if set(self.term_normalizer.normalize_tokens(keyword)).issubset(section_terms)
                and section_terms
            )
            keyword_score = self._compute_ratio_score(
                matched=keyword_hits,
                total=len(extracted_keywords),
            )
            semantic_score_section = _clamp(semantic_similarity * 100)
            combined_score = _clamp((keyword_score * 0.35) + (semantic_score_section * 0.65))
            section_scores[section_name] = combined_score
            weighted_score += combined_score * SECTION_WEIGHTS[section_name]
            section_similarities.append(semantic_similarity)

        semantic_score = _clamp(
            (sum(section_similarities) / len(section_similarities)) * 100
        ) if section_similarities else 0

        return semantic_score, _clamp(weighted_score), section_scores

    def _rank_missing_skills(
        self,
        *,
        extracted_keywords: list[str],
        matched_keywords: list[str],
        job_description_text: str,
        scraped_job: JobScrapeResponse | None,
    ) -> list[str]:
        matched_set = {self.term_normalizer.normalize_term(k) for k in matched_keywords}
        jd_tokens = self.term_normalizer.normalize_tokens(job_description_text)
        jd_counter = Counter(jd_tokens)
        requirements_counter = Counter(
            self.term_normalizer.normalize_tokens(scraped_job.skills_requirements or "")
            if scraped_job
            else []
        )

        scored_missing: list[tuple[float, str]] = []
        for keyword in extracted_keywords:
            normalized_keyword = self.term_normalizer.normalize_term(keyword)
            if normalized_keyword in matched_set:
                continue

            keyword_tokens = self.term_normalizer.normalize_tokens(keyword)
            base_score = sum(jd_counter[token] for token in keyword_tokens)
            requirement_bonus = sum(requirements_counter[token] for token in keyword_tokens) * 1.5
            phrase_bonus = 0.5 if " " in keyword else 0.0
            scored_missing.append((base_score + requirement_bonus + phrase_bonus, normalized_keyword))

        ranked = sorted(scored_missing, key=lambda item: (item[0], len(item[1])), reverse=True)
        ordered: list[str] = []
        seen: set[str] = set()
        for _, keyword in ranked:
            if keyword in seen:
                continue
            seen.add(keyword)
            ordered.append(keyword)
        return ordered

    def _compute_ratio_score(self, *, matched: int, total: int) -> int:
        if total == 0:
            return 0
        return _clamp((matched / total) * 100)

    def _determine_job_input_status(self, payload: AtsAnalyzeRequest) -> str:
        if payload.job_description_text and payload.job_link:
            return "text_and_link_ready"
        if payload.job_description_text:
            return "text_ready"
        if payload.job_link:
            return "scraped_from_link"
        return "missing_job_input"

    def _build_suggestions(
        self,
        *,
        ranked_missing_skills: list[str],
        keyword_match_score: int,
        semantic_score: int,
        section_scores: dict[str, int],
        payload: AtsAnalyzeRequest,
        scraped_job: JobScrapeResponse | None,
    ) -> list[str]:
        suggestions: list[str] = []
        weakest_section = (
            min(section_scores, key=lambda k: section_scores[k])
            if section_scores
            else None
        )

        if ranked_missing_skills:
            top = ", ".join(ranked_missing_skills[:5])
            suggestions.append(
                f"Add explicit evidence for these high-impact missing skills: {top}."
            )
        if weakest_section:
            suggestions.append(
                f"Strengthen your '{weakest_section}' section — it has the lowest alignment with this JD."
            )
        if semantic_score < 65:
            suggestions.append(
                "Rewrite your summary and project bullets to mirror the role language, "
                "not just the exact keywords."
            )
        if keyword_match_score < 55:
            suggestions.append(
                "Increase direct terminology overlap in Skills and Tools so ATS parsers "
                "can match the role requirements faster."
            )
        if payload.job_link and scraped_job:
            suggestions.append(
                f"Use the scraped '{scraped_job.source_type}' requirements section as "
                "your primary tailoring reference."
            )
        if not suggestions:
            suggestions.append(
                "Coverage is strong — focus on quantifying achievements to improve recruiter readability."
            )

        return suggestions[:4]
