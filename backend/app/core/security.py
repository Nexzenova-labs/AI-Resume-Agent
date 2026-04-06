from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()
password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
TokenKind = Literal["access", "refresh"]


def _create_token(*, subject: str, token_type: TokenKind, expires_delta: timedelta) -> str:
    expire_at = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": subject, "exp": expire_at, "type": token_type}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    return _create_token(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def get_password_hash(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_context.verify(password, hashed_password)


def validate_token_subject(
    token: str,
    *,
    expected_token_type: TokenKind = "access",
) -> str | None:
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None
    token_type = payload.get("type")
    if token_type and token_type != expected_token_type:
        return None
    if not token_type and expected_token_type != "access":
        return None
    return payload.get("sub")
