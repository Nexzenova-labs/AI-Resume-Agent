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
from app.schemas.ats import AtsAnalysisResponse, AtsAnalyzeRequest
from app.schemas.resume import ResumeCreate, ResumeResponse
from app.schemas.scrape import JobScrapeResponse
from app.services.job_scraper_service import JobScraperService

SECTION_WEIGHTS = {
    "skills": 0.30,
    "tools": 0.20,
    "experience": 0.30,
    "projects": 0.20,
}


class AtsService:
    def __init__(self, session: AsyncSession) -> None:
        self.resume_repository = ResumeRepository(session)
        self.keyword_extractor = KeywordExtractor()
        self.term_normalizer = TermNormalizer()
        self.embedding_service = EmbeddingService()
        self.job_scraper_service = JobScraperService()

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
        overall_ats_score = round(
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
            f"{item.institution} {item.degree} {item.field_of_study or ''} {' '.join(item.achievements)}"
            for item in resume.education
        )

        project_parts = [
            f"{project.name} {project.description} {' '.join(project.technologies)} {' '.join(project.highlights)}"
            for project in resume.projects
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
        if normalized_keyword in exact_skill_terms:
            return True

        keyword_tokens = set(self.term_normalizer.normalize_tokens(keyword))
        return bool(keyword_tokens) and keyword_tokens.issubset(normalized_resume_terms)

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
            )
            keyword_score = self._compute_ratio_score(
                matched=keyword_hits,
                total=len(extracted_keywords),
            )
            semantic_score = round(semantic_similarity * 100)
            combined_score = round((keyword_score * 0.35) + (semantic_score * 0.65))
            section_scores[section_name] = combined_score
            weighted_score += combined_score * SECTION_WEIGHTS[section_name]
            section_similarities.append(semantic_similarity)

        semantic_score = round(
            (sum(section_similarities) / len(section_similarities)) * 100
        ) if section_similarities else 0

        return semantic_score, round(weighted_score), section_scores

    def _rank_missing_skills(
        self,
        *,
        extracted_keywords: list[str],
        matched_keywords: list[str],
        job_description_text: str,
        scraped_job: JobScrapeResponse | None,
    ) -> list[str]:
        matched_set = {self.term_normalizer.normalize_term(keyword) for keyword in matched_keywords}
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
        return round((matched / total) * 100)

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
        weakest_section = min(section_scores, key=section_scores.get) if section_scores else None

        if ranked_missing_skills:
            suggestions.append(
                f"Add explicit evidence for the highest-impact missing skills: {', '.join(ranked_missing_skills[:5])}."
            )
        if weakest_section:
            suggestions.append(
                f"Strengthen the {weakest_section} section first; it currently has the lowest alignment with the JD."
            )
        if semantic_score < 65:
            suggestions.append(
                "Rewrite summary and project bullets to mirror the role language more closely, not just the exact keywords."
            )
        if keyword_match_score < 55:
            suggestions.append(
                "Increase direct terminology overlap in skills and tools so ATS parsers can match the role requirements earlier."
            )
        if payload.job_link and scraped_job:
            suggestions.append(
                f"Use the scraped {scraped_job.source_type} requirements section as the source of truth for resume tailoring."
            )
        if not suggestions:
            suggestions.append(
                "Coverage is strong across both exact terms and semantics; focus on quantified achievements to improve recruiter readability."
            )

        return suggestions[:4]
