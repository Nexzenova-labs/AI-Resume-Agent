from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume Agent API"
    environment: str = "development"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ai_resume_agent"
    redis_url: str = "redis://localhost:6379/0"
    chromadb_path: str = "./ai/chromadb"
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "openai"
    allow_guest: bool = True
    session_ttl: str = "24h"
    enable_voice_interview: bool = False
    enable_github_analysis: bool = False
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    google_client_id: str = ""
    google_client_secret: str = ""
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    embedding_provider: str = "local"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 256
    cors_allowed_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="CORS_ALLOWED_ORIGINS",
    )
    cookie_secure: Optional[bool] = None
    expose_bearer_token_in_response: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret_key(cls, value: str) -> str:
        secret = value.strip()
        if not secret:
            raise ValueError("JWT_SECRET_KEY must be set.")
        if secret == "change-me-for-production":
            raise ValueError("JWT_SECRET_KEY must not use the insecure example value.")
        return secret

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgresql+asyncpg://"):
            return self.database_url
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1,
            )
        if self.database_url.startswith("sqlite:///"):
            return self.database_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
        if self.database_url.startswith("sqlite+aiosqlite:///"):
            return self.database_url
        return self.database_url

    @property
    def access_token_max_age_seconds(self) -> int:
        return self.access_token_expire_minutes * 60

    @property
    def refresh_token_max_age_seconds(self) -> int:
        return self.refresh_token_expire_days * 24 * 60 * 60

    @property
    def should_use_secure_cookies(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment.lower() != "development"

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [
            item.strip()
            for item in self.cors_allowed_origins_raw.split(",")
            if item.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
