from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PersonalInfo(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    links: list[str] = Field(default_factory=list)


class ExperienceItem(BaseModel):
    company: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    highlights: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    achievements: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    name: str
    description: str
    technologies: list[str] = Field(default_factory=list)
    link: Optional[str] = None
    highlights: list[str] = Field(default_factory=list)


class CustomSectionItem(BaseModel):
    name: str = Field(..., description="The name of the custom section (e.g. Hobbies, Awards)")
    items: list[str] = Field(default_factory=list, description="The listed items within this custom section")


class ResumeBase(BaseModel):
    title: str = Field(default="Untitled Resume", min_length=1, max_length=255)
    status: str = Field(default="draft")
    source_type: str = Field(default="uploaded")
    template: str = Field(default="modern-impact")
    layout: list[str] = Field(default_factory=list)
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    custom_sections: list[CustomSectionItem] = Field(default_factory=list)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("personal_info", mode="before")
    @classmethod
    def _coerce_personal_info(cls, v: object) -> object:
        """DB rows with NULL personal_info must not crash model_validate."""
        return v if v is not None else PersonalInfo()

    @field_validator(
        "experience", "education", "skills", "tools",
        "projects", "custom_sections", "layout",
        mode="before",
    )
    @classmethod
    def _coerce_lists(cls, v: object) -> object:
        """DB rows with NULL list columns become empty lists."""
        return v if v is not None else []


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[str] = None
    source_type: Optional[str] = None
    template: Optional[str] = None
    layout: Optional[list[str]] = None
    personal_info: Optional[PersonalInfo] = None
    experience: Optional[list[ExperienceItem]] = None
    education: Optional[list[EducationItem]] = None
    skills: Optional[list[str]] = None
    tools: Optional[list[str]] = None
    projects: Optional[list[ProjectItem]] = None
    custom_sections: Optional[list[CustomSectionItem]] = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ResumeResponse(ResumeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
