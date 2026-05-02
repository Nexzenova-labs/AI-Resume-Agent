from __future__ import annotations

from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        id: str | None = None,
        email: str,
        full_name: str,
        hashed_password: str,
        auth_provider: str = "email",
    ) -> User:
        user = User(
            id=id or str(uuid4()),
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            auth_provider=auth_provider,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
