from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.ats import AtsAnalysisResponse, AtsAnalyzeRequest
from app.services.ats_service import AtsService

router = APIRouter(prefix="/ats", tags=["ats"])


@router.post("/analyze", response_model=AtsAnalysisResponse)
async def analyze_resume_against_jd(
    payload: AtsAnalyzeRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AtsAnalysisResponse:
    return await AtsService(session).analyze(payload=payload, user=current_user)

