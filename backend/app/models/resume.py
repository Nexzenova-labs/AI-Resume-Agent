from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

json_type = JSON().with_variant(JSONB, "postgresql")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Resume")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    personal_info: Mapped[dict] = mapped_column(json_type, default=dict)
    experience: Mapped[list] = mapped_column(json_type, default=list)
    education: Mapped[list] = mapped_column(json_type, default=list)
    skills: Mapped[list] = mapped_column(json_type, default=list)
    tools: Mapped[list] = mapped_column(json_type, default=list)
    projects: Mapped[list] = mapped_column(json_type, default=list)
    custom_sections: Mapped[list] = mapped_column(json_type, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="resumes")
