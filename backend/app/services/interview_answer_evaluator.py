from __future__ import annotations

from app.nlp.term_normalizer import TermNormalizer
from app.schemas.interview import InterviewAnswerEvaluation, InterviewQuestionInternal


class InterviewAnswerEvaluator:
    def __init__(self) -> None:
        self.term_normalizer = TermNormalizer()

    def evaluate(
        self,
        *,
        question: InterviewQuestionInternal,
        answer: str,
    ) -> InterviewAnswerEvaluation:
        normalized_answer = set(self.term_normalizer.normalize_tokens(answer))

        if question.question_type == "mcq":
            is_correct = answer.strip() == question.correct_answer
            score_awarded = 1 if is_correct else 0
            suggestion = (
                "Choose the option that links the topic to practical usage, tradeoffs, and impact."
                if not is_correct
                else "Keep grounding your answers in implementation details and outcomes."
            )
            return InterviewAnswerEvaluation(
                is_correct=is_correct,
                explanation=question.explanation,
                improvement_suggestion=suggestion,
                score_awarded=score_awarded,
            )

        expected = set(question.expected_keywords)
        if not expected:
            overlap_ratio = 0.0
        else:
            overlap_ratio = len(expected & normalized_answer) / len(expected)

        thresholds = {"easy": 0.20, "medium": 0.30, "hard": 0.40}
        is_correct = overlap_ratio >= thresholds[question.difficulty]
        score_awarded = 1 if is_correct else 0
        suggestion = (
            f"Include clearer detail about {question.topic}, the decision you made, and the impact you achieved."
            if not is_correct
            else "Good answer. Push it further with one concrete metric or tradeoff next time."
        )

        return InterviewAnswerEvaluation(
            is_correct=is_correct,
            explanation=question.explanation,
            improvement_suggestion=suggestion,
            score_awarded=score_awarded,
        )

