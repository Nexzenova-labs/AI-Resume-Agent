from __future__ import annotations

from bs4 import BeautifulSoup, Tag

from app.schemas.scrape import JobScrapeResponse
from app.scrapers.html_cleaner import HtmlCleaner


class JobPageParser:
    def __init__(self) -> None:
        self.cleaner = HtmlCleaner()

    def parse(self, *, html: str, url: str, source_type: str) -> JobScrapeResponse:
        soup = BeautifulSoup(html, "html.parser")

        job_title = self._extract_job_title(soup)
        company = self._extract_company(soup)
        job_description_text = self._extract_job_description(soup)
        skills_requirements = self._extract_skills_requirements(soup)

        return JobScrapeResponse(
            source_url=url,
            source_type=source_type,
            job_title=job_title,
            company=company,
            job_description_text=job_description_text,
            skills_requirements=skills_requirements,
        )

    def _extract_job_title(self, soup: BeautifulSoup) -> str | None:
        selectors = [
            "h1",
            "[data-test-id='job-title']",
            ".posting-headline h2",
            ".topcard__title",
            "meta[property='og:title']",
        ]
        for selector in selectors:
            node = soup.select_one(selector)
            content = self._extract_text(node, attribute="content")
            if content:
                return content
        return None

    def _extract_company(self, soup: BeautifulSoup) -> str | None:
        selectors = [
            "[data-test-id='org-name']",
            ".topcard__org-name-link",
            ".posting-headline h3",
            ".company",
            "meta[property='og:site_name']",
        ]
        for selector in selectors:
            node = soup.select_one(selector)
            content = self._extract_text(node, attribute="content")
            if content:
                return content
        return None

    def _extract_job_description(self, soup: BeautifulSoup) -> str:
        selectors = [
            "[data-test-id='job-description']",
            ".description",
            ".show-more-less-html__markup",
            "#job-details",
            "article",
            "main",
            "body",
        ]
        for selector in selectors:
            node = soup.select_one(selector)
            text = self._extract_text(node)
            if text and len(text) > 120:
                return text
        return ""

    def _extract_skills_requirements(self, soup: BeautifulSoup) -> str | None:
        headings = soup.find_all(["h2", "h3", "strong"])
        match_terms = ("requirements", "qualifications", "skills", "what you bring")

        for heading in headings:
            heading_text = self.cleaner.normalize_text(heading.get_text(" ", strip=True)).lower()
            if not any(term in heading_text for term in match_terms):
                continue

            collected_parts: list[str] = []
            sibling = heading.find_next_sibling()
            while sibling and isinstance(sibling, Tag):
                sibling_name = sibling.name.lower() if sibling.name else ""
                if sibling_name in {"h1", "h2", "h3"}:
                    break
                text = self._extract_text(sibling)
                if text:
                    collected_parts.append(text)
                sibling = sibling.find_next_sibling()

            combined = self.cleaner.normalize_text(" ".join(collected_parts))
            if combined:
                return combined

        return None

    def _extract_text(self, node: Tag | None, *, attribute: str | None = None) -> str | None:
        if node is None:
            return None

        if attribute:
            raw = node.get(attribute)
        else:
            raw = node.get_text(" ", strip=True)

        cleaned = self.cleaner.normalize_text(raw or "")
        return cleaned or None

