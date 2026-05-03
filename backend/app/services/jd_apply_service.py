from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_service import LLMService, TailoringDiff, apply_tailoring
from app.models.resume import Resume
from app.models.user import User
from app.repositories.resume_repository import ResumeRepository
from app.schemas.jd_apply import JdApplyRequest, JdApplyResponse, ModifiedResumeResult
from app.schemas.resume import ResumeBase, ResumeResponse


class JdApplyService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = ResumeRepository(session)
        self._llm = LLMService()

    # ── public entry point ────────────────────────────────────────────────────

    async def process(self, *, payload: JdApplyRequest, user: Optional[User]) -> JdApplyResponse:
        base_resume = await self._resolve_resume(payload=payload, user=user)

        # Step 1: run all LLM tailoring concurrently — no DB access here
        tailor_tasks = [
            self._compute_tailored(base_resume=base_resume, jd_text=jd, index=i)
            for i, jd in enumerate(payload.jds)
        ]
        computed = await asyncio.gather(*tailor_tasks)

        # Step 2: persist each result sequentially — safe for shared session
        results = []
        for item in computed:
            result = await self._persist(*item, user=user)
            results.append(result)

        return JdApplyResponse(results=results)

    # ── helpers ───────────────────────────────────────────────────────────────

    async def _resolve_resume(
        self, *, payload: JdApplyRequest, user: Optional[User]
    ) -> ResumeBase:
        if payload.resume:
            return payload.resume

        if not payload.resume_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either a resume_id or a resume payload.",
            )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guest users must provide a resume payload, not a resume_id.",
            )

        db_resume = await self._repo.get_by_id_for_user(
            resume_id=payload.resume_id,
            user_id=user.id,
        )
        if not db_resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )
        return ResumeResponse.model_validate(db_resume)

    async def _compute_tailored(
        self,
        *,
        base_resume: ResumeBase,
        jd_text: str,
        index: int,
    ) -> tuple[TailoringDiff, ResumeBase, str, int]:
        """LLM-only step — no DB access, safe to run concurrently."""
        diff = await self._llm.tailor_resume(resume=base_resume, jd_text=jd_text)
        tailored = apply_tailoring(resume=base_resume, diff=diff)
        return diff, tailored, jd_text, index

    async def _persist(
        self,
        diff: TailoringDiff,
        tailored: ResumeBase,
        jd_text: str,
        index: int,
        *,
        user: Optional[User],
    ) -> ModifiedResumeResult:
        """DB write for authenticated users; guests skip persistence."""
        saved_id: Optional[str] = None

        if user is not None:
            date_str = datetime.now().strftime("%b %d")
            title = f"{diff.job_title} — JD Apply ({date_str})"

            resume_data = tailored.model_dump()
            resume_data.pop("source_type", None)

            db_obj = Resume(
                user_id=user.id,
                title=title,
                status="draft",
                source_type="jd_apply",
                template=resume_data.get("template", "modern-impact"),
                layout=resume_data.get("layout") or [],
                personal_info=resume_data.get("personal_info") or {},
                experience=resume_data.get("experience") or [],
                education=resume_data.get("education") or [],
                skills=resume_data.get("skills") or [],
                tools=resume_data.get("tools") or [],
                projects=resume_data.get("projects") or [],
                custom_sections=resume_data.get("custom_sections") or [],
            )
            saved = await self._repo.create(db_obj)
            saved_id = saved.id

        return ModifiedResumeResult(
            jd_index=index,
            jd_text=jd_text,
            job_title=diff.job_title,
            saved_resume_id=saved_id,
            modified_resume=tailored,
            added_skills=diff.added_skills,
            added_tools=diff.added_tools,
            keywords_injected=len(diff.added_skills) + len(diff.added_tools),
        )
