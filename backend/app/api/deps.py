from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_token_subject
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.user_repository import UserRepository


from jose import jwt, JWTError
from app.core.config import get_settings

settings = get_settings()

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

    try:
        # Supabase uses HS256 for its JWTs
        payload = jwt.decode(
            token, 
            settings.supabase_jwt_secret, 
            algorithms=["HS256"],
            options={"verify_aud": False} # Supabase aud can vary
        )
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject.",
            )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)
    
    if not user:
        # If user exists in Supabase but not in our table (e.g. first time OAuth/OTP)
        # We auto-create them in our local 'users' table
        user = await user_repo.create(
            id=user_id,
            email=email or f"{user_id}@supabase.user",
            full_name=email.split("@")[0] if email else "Supabase User",
            hashed_password="SUPABASE_AUTH",
            auth_provider="supabase"
        )

    return user
