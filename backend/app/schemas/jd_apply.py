from typing import Optional
from pydantic import BaseModel, field_validator

from app.schemas.resume import ResumeBase


class JdApplyRequest(BaseModel):
    resume_id: Optional[str] = None
    resume: Optional[ResumeBase] = None
    jds: list[str]

    @field_validator("jds")
    @classmethod
    def validate_jds(cls, v: list[str]) -> list[str]:
        cleaned = [j.strip() for j in v if j and len(j.strip()) >= 30]
        if not cleaned:
            raise ValueError("Provide at least one job description (min 30 characters).")
        return cleaned


class ModifiedResumeResult(BaseModel):
    jd_index: int
    jd_text: str
    job_title: str
    saved_resume_id: str            # ID of the persisted resume in the vault
    modified_resume: ResumeBase
    # Diff info — what was added (for frontend diff highlighting)
    added_skills: list[str] = []
    added_tools: list[str] = []
    keywords_injected: int = 0


class JdApplyResponse(BaseModel):
    results: list[ModifiedResumeResult]
