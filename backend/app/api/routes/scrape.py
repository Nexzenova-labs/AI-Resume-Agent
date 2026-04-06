from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.scrape import JobScrapeRequest, JobScrapeResponse
from app.services.job_scraper_service import JobScraperService

router = APIRouter(prefix="/scrape-job", tags=["scrape"])


@router.post("", response_model=JobScrapeResponse)
async def scrape_job(
    payload: JobScrapeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> JobScrapeResponse:
    del current_user
    return await JobScraperService().scrape_job(job_link=str(payload.job_link))

