from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.resume import ResumeCreate, ResumeResponse

InterviewDifficulty = Literal["easy", "medium", "hard"]
QuestionCount = Literal[10, 20, 30, 40, 50]
QuestionType = Literal["mcq", "short_answer"]


class InterviewQuestion(BaseModel):
    id: str
    prompt: str
    question_type: QuestionType
    topic: str
    section: str
    difficulty: InterviewDifficulty
    options: list[str] = Field(default_factory=list)


class InterviewQuestionInternal(InterviewQuestion):
    correct_answer: str
    explanation: str
    expected_keywords: list[str] = Field(default_factory=list)


class InterviewStartRequest(BaseModel):
    resume_id: Optional[str] = None
    resume: Optional[ResumeCreate] = None
    difficulty: InterviewDifficulty
    question_count: QuestionCount

    @model_validator(mode="after")
    def validate_resume_source(self) -> "InterviewStartRequest":
        if not self.resume_id and not self.resume:
            raise ValueError("Provide resume_id or resume.")
        return self


class InterviewStartResponse(BaseModel):
    session_id: str
    difficulty: InterviewDifficulty
    question_count: int
    current_question: InterviewQuestion
    progress: dict[str, int]


class InterviewAnswerRequest(BaseModel):
    session_id: str
    answer: str = Field(min_length=1)

    model_config = ConfigDict(str_strip_whitespace=True)


class InterviewAnswerEvaluation(BaseModel):
    is_correct: bool
    explanation: str
    improvement_suggestion: str
    score_awarded: int


class InterviewAnswerResponse(BaseModel):
    session_id: str
    evaluation: InterviewAnswerEvaluation
    next_question: Optional[InterviewQuestion] = None
    progress: dict[str, int]
    is_complete: bool


class InterviewResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    difficulty: InterviewDifficulty
    question_count: int
    status: str
    total_score: int = Field(ge=0, le=100)
    strengths: list[str]
    weak_areas: list[str]
    answered_questions: int
    resume_snapshot: Union[ResumeResponse, ResumeCreate]
