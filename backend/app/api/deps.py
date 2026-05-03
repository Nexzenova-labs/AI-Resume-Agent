from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import validate_token_subject
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.user_repository import UserRepository


settings = get_settings()


async def get_optional_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    authorization: Annotated[Optional[str], Header(alias="Authorization")] = None,
    access_token: Annotated[Optional[str], Cookie()] = None,
    refresh_token: Annotated[Optional[str], Cookie()] = None,
) -> Optional[User]:
    """Like get_current_user but returns None instead of raising 401 for unauthenticated requests."""
    try:
        return await get_current_user(
            request=request,
            session=session,
            authorization=authorization,
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except HTTPException:
        return None


async def get_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    authorization: Annotated[Optional[str], Header(alias="Authorization")] = None,
    access_token: Annotated[Optional[str], Cookie()] = None,
    refresh_token: Annotated[Optional[str], Cookie()] = None,
) -> User:
    tokens: list[str] = []
    if authorization and authorization.startswith("Bearer "):
        tokens.append(authorization.removeprefix("Bearer ").strip())
    if access_token:
        tokens.append(access_token)

    cookie_header = request.headers.get("cookie", "")
    for part in cookie_header.split(";"):
        name, _, value = part.strip().partition("=")
        if name == "access_token" and value and value not in tokens:
            tokens.append(value)

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    user_repo = UserRepository(session)

    for token in tokens:
        local_user_id = validate_token_subject(token)
        if local_user_id:
            user = await user_repo.get_by_id(local_user_id)
            if user:
                return user

    if refresh_token:
        refreshed_user_id = validate_token_subject(
            refresh_token,
            expected_token_type="refresh",
        )
        if refreshed_user_id:
            user = await user_repo.get_by_id(refreshed_user_id)
            if user:
                return user

    if settings.supabase_jwt_secret:
        for token in tokens:
            try:
                # Supabase uses HS256 for its JWTs.
                payload = jwt.decode(
                    token,
                    settings.supabase_jwt_secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False},
                )
                user_id = payload.get("sub")
                email = payload.get("email")
                if not user_id:
                    continue
            except JWTError:
                user_id = None
                email = None

            if user_id:
                user = await user_repo.get_by_id(user_id)

                if not user:
                    user = await user_repo.create(
                        id=user_id,
                        email=email or f"{user_id}@supabase.user",
                        full_name=email.split("@")[0] if email else "Supabase User",
                        hashed_password="SUPABASE_AUTH",
                        auth_provider="supabase",
                    )

                return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
    )
