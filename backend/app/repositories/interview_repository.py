from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import InterviewSession


class InterviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, interview_session: InterviewSession) -> InterviewSession:
        self.session.add(interview_session)
        await self.session.commit()
        await self.session.refresh(interview_session)
        return interview_session

    async def get_by_id_for_user(
        self,
        *,
        session_id: str,
        user_id: str,
    ) -> InterviewSession | None:
        result = await self.session.execute(
            select(InterviewSession).where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(self, interview_session: InterviewSession) -> InterviewSession:
        await self.session.commit()
        await self.session.refresh(interview_session)
        return interview_session

