from typing import Annotated

from fastapi import APIRouter, Depends

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.interview import InterviewSession
from app.models.resume import Resume
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)

@router.get("/stats")
async def get_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    resume_count = await session.scalar(
        select(func.count()).select_from(Resume).where(Resume.user_id == current_user.id, Resume.status != "draft")
    )
    interview_count = await session.scalar(
        select(func.count()).select_from(InterviewSession).where(InterviewSession.user_id == current_user.id)
    )
    return {
        "active_resumes": resume_count or 0,
        "ats_average": 0, # not implemented in DB schema yet
        "interviews_practiced": interview_count or 0,
    }

