from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.core.config import get_settings
from app.core.security import validate_token_subject
from app.schemas.auth import (
    GoogleOAuthPlaceholderResponse,
    LoginRequest,
    SignupRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_auth_cookies(response: Response, token_response: TokenResponse) -> None:
    secure = settings.should_use_secure_cookies
    response.set_cookie(
        key="access_token",
        value=token_response.access_token or "",
        httponly=True,
        secure=secure,
        samesite="strict",
        max_age=settings.access_token_max_age_seconds,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=token_response.refresh_token or "",
        httponly=True,
        secure=secure,
        samesite="strict",
        max_age=settings.refresh_token_max_age_seconds,
        path="/api/auth",
    )


def _build_public_auth_response(token_response: TokenResponse) -> TokenResponse:
    if settings.expose_bearer_token_in_response:
        return token_response
    token_response.access_token = None
    token_response.refresh_token = None
    return token_response


def _clear_auth_cookies(response: Response) -> None:
    secure = settings.should_use_secure_cookies
    response.delete_cookie(
        "access_token",
        path="/",
        secure=secure,
        httponly=True,
        samesite="strict",
    )
    response.delete_cookie(
        "refresh_token",
        path="/api/auth",
        secure=secure,
        httponly=True,
        samesite="strict",
    )


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(
    payload: SignupRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TokenResponse:
    auth_response = await AuthService(session).signup(payload)
    _set_auth_cookies(response, auth_response)
    return _build_public_auth_response(auth_response)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TokenResponse:
    auth_response = await AuthService(session).login(payload)
    _set_auth_cookies(response, auth_response)
    return _build_public_auth_response(auth_response)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    refresh_token: Annotated[Optional[str], Cookie()] = None,
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing.",
        )

    subject = validate_token_subject(refresh_token, expected_token_type="refresh")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    auth_response = await AuthService(session).refresh_session(subject)
    _set_auth_cookies(response, auth_response)
    return _build_public_auth_response(auth_response)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> Response:
    _clear_auth_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/google", response_model=GoogleOAuthPlaceholderResponse)
async def google_oauth_placeholder() -> GoogleOAuthPlaceholderResponse:
    return GoogleOAuthPlaceholderResponse(
        message="Google OAuth is reserved for the next integration phase."
    )
