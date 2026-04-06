from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base

json_type = JSON().with_variant(JSONB, "postgresql")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    resume_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("resumes.id"),
        nullable=True,
        index=True,
    )
    difficulty: Mapped[str] = mapped_column(String(20))
    question_count: Mapped[int] = mapped_column(Integer)
    current_question_index: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    total_score: Mapped[int] = mapped_column(Integer, default=0)
    questions: Mapped[list] = mapped_column(json_type, default=list)
    answers: Mapped[list] = mapped_column(json_type, default=list)
    resume_snapshot: Mapped[dict] = mapped_column(json_type, default=dict)
    strengths: Mapped[list] = mapped_column(json_type, default=list)
    weak_areas: Mapped[list] = mapped_column(json_type, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
