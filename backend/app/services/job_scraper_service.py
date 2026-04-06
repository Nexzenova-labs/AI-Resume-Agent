from __future__ import annotations

from urllib.parse import urlparse

from fastapi import HTTPException, status
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

from app.schemas.scrape import JobScrapeResponse
from app.scrapers.job_page_parser import JobPageParser


class JobScraperService:
    def __init__(self) -> None:
        self.parser = JobPageParser()

    async def scrape_job(self, *, job_link: str) -> JobScrapeResponse:
        source_type = self._detect_source_type(job_link)

        try:
            html = await self._fetch_page_html(job_link)
        except PlaywrightTimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Timed out while loading the job page.",
            ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not load the job page. The site may be blocking automated access.",
            ) from exc

        parsed = self.parser.parse(html=html, url=job_link, source_type=source_type)
        if not parsed.job_description_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The job page loaded, but no usable description content could be extracted.",
            )

        return parsed

    async def _fetch_page_html(self, job_link: str) -> str:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(job_link, wait_until="networkidle", timeout=20000)
                html = await page.content()
            finally:
                await browser.close()
        return html

    def _detect_source_type(self, job_link: str) -> str:
        hostname = urlparse(job_link).netloc.lower()
        if "linkedin.com" in hostname:
            return "linkedin"
        if "lever.co" in hostname:
            return "lever"
        if "greenhouse.io" in hostname:
            return "greenhouse"
        return "generic"

