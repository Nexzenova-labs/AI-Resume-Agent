from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str
    user: UserResponse


class GoogleOAuthPlaceholderResponse(BaseModel):
    message: str
    provider: str = "google"
