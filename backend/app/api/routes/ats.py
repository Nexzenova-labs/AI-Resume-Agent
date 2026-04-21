from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.ats import (
    AtsAnalysisResponse,
    AtsAnalyzeRequest,
    ResumeQualityRequest,
    ResumeQualityResponse,
)
from app.services.ats_service import AtsService

router = APIRouter(prefix="/ats", tags=["ats"])


@router.post("/analyze", response_model=AtsAnalysisResponse)
async def analyze_resume_against_jd(
    payload: AtsAnalyzeRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AtsAnalysisResponse:
    """Score a resume against a job description (paste or link)."""
    return await AtsService(session).analyze(payload=payload, user=current_user)


@router.post("/quality", response_model=ResumeQualityResponse)
async def score_resume_quality(
    payload: ResumeQualityRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ResumeQualityResponse:
    """Score a resume on its own merits — completeness, keyword richness, and
    structure — without needing a job description."""
    return await AtsService(session).score_resume_quality(payload=payload, user=current_user)
