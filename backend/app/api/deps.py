from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_token_subject
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.user_repository import UserRepository


async def get_current_user(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    authorization: Annotated[Optional[str], Header(alias="Authorization")] = None,
    access_token: Annotated[Optional[str], Cookie()] = None,
) -> User:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    subject = validate_token_subject(token)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user = await UserRepository(session).get_by_id(subject)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User could not be found.",
        )

    return user
