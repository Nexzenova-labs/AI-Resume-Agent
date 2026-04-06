from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume
from app.models.user import User
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeCreate, ResumeResponse, ResumeUpdate


class ResumeService:
    def __init__(self, session: AsyncSession) -> None:
        self.resume_repository = ResumeRepository(session)

    async def create_resume(self, *, payload: ResumeCreate, user: User) -> ResumeResponse:
        resume = Resume(user_id=user.id, **payload.model_dump())
        created_resume = await self.resume_repository.create(resume)
        return ResumeResponse.model_validate(created_resume)

    async def get_resume(self, *, resume_id: str, user: User) -> ResumeResponse:
        resume = await self.resume_repository.get_by_id_for_user(
            resume_id=resume_id,
            user_id=user.id,
        )
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )

        return ResumeResponse.model_validate(resume)

    async def update_resume(
        self,
        *,
        resume_id: str,
        payload: ResumeUpdate,
        user: User,
    ) -> ResumeResponse:
        resume = await self.resume_repository.get_by_id_for_user(
            resume_id=resume_id,
            user_id=user.id,
        )
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(resume, field, value)

        updated_resume = await self.resume_repository.update(resume)
        return ResumeResponse.model_validate(updated_resume)
