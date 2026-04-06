from __future__ import annotations

from typing import Optional, Union

from pydantic import BaseModel, Field, HttpUrl, model_validator

from app.schemas.resume import ResumeCreate, ResumeResponse
from app.schemas.scrape import JobScrapeResponse


class AtsAnalyzeRequest(BaseModel):
    job_description_text: Optional[str] = None
    job_link: Optional[HttpUrl] = None
    resume_id: Optional[str] = None
    resume: Optional[ResumeCreate] = None

    @model_validator(mode="after")
    def validate_inputs(self) -> "AtsAnalyzeRequest":
        if self.job_description_text is not None:
            self.job_description_text = self.job_description_text.strip() or None
        if self.resume_id is not None:
            self.resume_id = self.resume_id.strip() or None

        if not self.job_description_text and not self.job_link:
            raise ValueError("Provide job_description_text or job_link.")
        if not self.resume_id and not self.resume:
            raise ValueError("Provide resume_id or resume.")
        return self


class AtsAnalysisResponse(BaseModel):
    job_input_status: str
    extracted_keywords: list[str]
    matched_keywords: list[str]
    missing_skills: list[str]
    ranked_missing_skills: list[str]
    keyword_match_score: int = Field(ge=0, le=100)
    semantic_score: int = Field(ge=0, le=100)
    weighted_section_score: int = Field(ge=0, le=100)
    section_scores: dict[str, int]
    overall_ats_score: int = Field(ge=0, le=100)
    improvement_suggestions: list[str]
    resume_snapshot: Union[ResumeResponse, ResumeCreate]
    scraped_job: Optional[JobScrapeResponse] = None
