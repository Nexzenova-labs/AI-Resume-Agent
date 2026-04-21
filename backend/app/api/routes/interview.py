from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.interview import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewResultResponse,
    InterviewStartRequest,
    InterviewStartResponse,
)
from app.services.interview_service import InterviewService

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(
    payload: InterviewStartRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InterviewStartResponse:
    return await InterviewService(session).start_interview(payload=payload, user=current_user)


@router.post("/answer", response_model=InterviewAnswerResponse)
async def answer_interview_question(
    payload: InterviewAnswerRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InterviewAnswerResponse:
    return await InterviewService(session).answer_question(payload=payload, user=current_user)


@router.get("/feedback", response_model=InterviewResultResponse)
async def get_interview_feedback(
    session_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InterviewResultResponse:
    return await InterviewService(session).get_session_feedback(session_id=session_id, user=current_user)


@router.get("/result", response_model=InterviewResultResponse)
async def get_interview_result(
    session_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InterviewResultResponse:
    return await InterviewService(session).get_result(session_id=session_id, user=current_user)
