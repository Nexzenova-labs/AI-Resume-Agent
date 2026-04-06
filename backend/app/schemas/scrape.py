from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, HttpUrl


class JobScrapeRequest(BaseModel):
    job_link: HttpUrl


class JobScrapeResponse(BaseModel):
    source_url: HttpUrl
    source_type: str
    job_title: Optional[str] = None
    company: Optional[str] = None
    job_description_text: str
    skills_requirements: Optional[str] = None

