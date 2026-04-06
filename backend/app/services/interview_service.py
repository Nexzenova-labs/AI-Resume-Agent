from __future__ import annotations

from collections import Counter

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import InterviewSession
from app.models.user import User
from app.repositories.interview_repository import InterviewRepository
from app.repositories.resume_repository import ResumeRepository
from app.schemas.interview import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewQuestion,
    InterviewQuestionInternal,
    InterviewResultResponse,
    InterviewStartRequest,
    InterviewStartResponse,
)
from app.schemas.resume import ResumeCreate, ResumeResponse
from app.services.interview_answer_evaluator import InterviewAnswerEvaluator
from app.services.interview_question_generator import InterviewQuestionGenerator


class InterviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.resume_repository = ResumeRepository(session)
        self.interview_repository = InterviewRepository(session)
        self.question_generator = InterviewQuestionGenerator()
        self.answer_evaluator = InterviewAnswerEvaluator()

    async def start_interview(
        self,
        *,
        payload: InterviewStartRequest,
        user: User,
    ) -> InterviewStartResponse:
        resume_snapshot = await self._resolve_resume(payload=payload, user=user)
        questions = self.question_generator.generate(
            resume=resume_snapshot,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
        )
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not generate interview questions from the provided resume data.",
            )

        session_record = InterviewSession(
            user_id=user.id,
            resume_id=payload.resume_id,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
            questions=[question.model_dump() for question in questions],
            answers=[],
            resume_snapshot=resume_snapshot.model_dump(mode="json"),
            strengths=[],
            weak_areas=[],
        )
        created_session = await self.interview_repository.create(session_record)

        return InterviewStartResponse(
            session_id=created_session.id,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
            current_question=self._to_public_question(questions[0]),
            progress=self._build_progress(current_index=0, total=payload.question_count),
        )

    async def answer_question(
        self,
        *,
        payload: InterviewAnswerRequest,
        user: User,
    ) -> InterviewAnswerResponse:
        interview_session = await self._get_session(session_id=payload.session_id, user=user)
        if interview_session.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This interview session is already completed.",
            )

        questions = [
            InterviewQuestionInternal.model_validate(question)
            for question in interview_session.questions
        ]
        current_index = interview_session.current_question_index
        if current_index >= len(questions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No remaining questions in this interview session.",
            )

        current_question = questions[current_index]
        evaluation = self.answer_evaluator.evaluate(
            question=current_question,
            answer=payload.answer,
        )

        answer_record = {
            "question_id": current_question.id,
            "topic": current_question.topic,
            "section": current_question.section,
            "question_type": current_question.question_type,
            "answer": payload.answer,
            "is_correct": evaluation.is_correct,
            "score_awarded": evaluation.score_awarded,
        }
        updated_answers = [*interview_session.answers, answer_record]
        next_index = current_index + 1
        interview_session.answers = updated_answers
        interview_session.current_question_index = next_index

        is_complete = next_index >= interview_session.question_count
        if is_complete:
            interview_session.status = "completed"
            interview_session.total_score = self._compute_total_score(updated_answers)
            strengths, weak_areas = self._summarize_performance(updated_answers)
            interview_session.strengths = strengths
            interview_session.weak_areas = weak_areas

        updated_session = await self.interview_repository.update(interview_session)
        next_question = None
        if not is_complete:
            next_question = self._to_public_question(questions[next_index])

        return InterviewAnswerResponse(
            session_id=updated_session.id,
            evaluation=evaluation,
            next_question=next_question,
            progress=self._build_progress(
                current_index=updated_session.current_question_index,
                total=updated_session.question_count,
            ),
            is_complete=is_complete,
        )

    async def get_result(
        self,
        *,
        session_id: str,
        user: User,
    ) -> InterviewResultResponse:
        interview_session = await self._get_session(session_id=session_id, user=user)
        resume_snapshot = self._parse_resume_snapshot(interview_session.resume_snapshot)

        if interview_session.answers and not interview_session.strengths and not interview_session.weak_areas:
            strengths, weak_areas = self._summarize_performance(interview_session.answers)
            interview_session.strengths = strengths
            interview_session.weak_areas = weak_areas
            interview_session.total_score = self._compute_total_score(interview_session.answers)
            await self.interview_repository.update(interview_session)

        return InterviewResultResponse(
            session_id=interview_session.id,
            difficulty=interview_session.difficulty,
            question_count=interview_session.question_count,
            status=interview_session.status,
            total_score=interview_session.total_score,
            strengths=interview_session.strengths,
            weak_areas=interview_session.weak_areas,
            answered_questions=len(interview_session.answers),
            resume_snapshot=resume_snapshot,
        )

    async def _resolve_resume(
        self,
        *,
        payload: InterviewStartRequest,
        user: User,
    ) -> ResumeResponse | ResumeCreate:
        if payload.resume:
            return payload.resume

        if not payload.resume_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A resume_id or resume payload is required.",
            )

        resume = await self.resume_repository.get_by_id_for_user(
            resume_id=payload.resume_id,
            user_id=user.id,
        )
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )

        return ResumeResponse.model_validate(resume)

    async def _get_session(self, *, session_id: str, user: User) -> InterviewSession:
        interview_session = await self.interview_repository.get_by_id_for_user(
            session_id=session_id,
            user_id=user.id,
        )
        if not interview_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found.",
            )
        return interview_session

    def _to_public_question(self, question: InterviewQuestionInternal) -> InterviewQuestion:
        return InterviewQuestion.model_validate(question.model_dump())

    def _build_progress(self, *, current_index: int, total: int) -> dict[str, int]:
        answered = min(current_index, total)
        remaining = max(total - current_index, 0)
        return {
            "answered": answered,
            "remaining": remaining,
            "total": total,
        }

    def _compute_total_score(self, answers: list[dict]) -> int:
        if not answers:
            return 0
        total_awarded = sum(answer.get("score_awarded", 0) for answer in answers)
        return round((total_awarded / len(answers)) * 100)

    def _summarize_performance(self, answers: list[dict]) -> tuple[list[str], list[str]]:
        section_correct = Counter(
            answer["section"]
            for answer in answers
            if answer.get("is_correct")
        )
        section_incorrect = Counter(
            answer["section"]
            for answer in answers
            if not answer.get("is_correct")
        )
        topic_correct = Counter(
            answer["topic"]
            for answer in answers
            if answer.get("is_correct")
        )
        topic_incorrect = Counter(
            answer["topic"]
            for answer in answers
            if not answer.get("is_correct")
        )

        strengths: list[str] = []
        if section_correct:
            best_section, _ = section_correct.most_common(1)[0]
            strengths.append(f"Strongest section: {best_section}.")
        if topic_correct:
            best_topic, _ = topic_correct.most_common(1)[0]
            strengths.append(f"Best-performing topic: {best_topic}.")
        if not strengths:
            strengths.append("Interview started, but no strengths are available yet.")

        weak_areas: list[str] = []
        if section_incorrect:
            weak_section, _ = section_incorrect.most_common(1)[0]
            weak_areas.append(f"Weakest section: {weak_section}.")
        if topic_incorrect:
            weak_topic, _ = topic_incorrect.most_common(1)[0]
            weak_areas.append(f"Needs work: {weak_topic}.")
        if not weak_areas:
            weak_areas.append("No major weak areas detected so far.")

        return strengths[:2], weak_areas[:2]

    def _parse_resume_snapshot(self, snapshot: dict) -> ResumeResponse | ResumeCreate:
        if "id" in snapshot and "user_id" in snapshot:
            return ResumeResponse.model_validate(snapshot)
        return ResumeCreate.model_validate(snapshot)
