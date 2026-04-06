from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume


class ResumeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, resume: Resume) -> Resume:
        self.session.add(resume)
        await self.session.commit()
        await self.session.refresh(resume)
        return resume

    async def get_by_id_for_user(self, *, resume_id: str, user_id: str) -> Resume | None:
        result = await self.session.execute(
            select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update(self, resume: Resume) -> Resume:
        await self.session.commit()
        await self.session.refresh(resume)
        return resume
