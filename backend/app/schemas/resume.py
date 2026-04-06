from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    custom_sections: list[CustomSectionItem] = Field(default_factory=list)

    model_config = ConfigDict(str_strip_whitespace=True)


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[str] = None
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
