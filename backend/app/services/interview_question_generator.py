from __future__ import annotations

from itertools import cycle
from uuid import uuid4

from app.nlp.term_normalizer import TermNormalizer
from app.schemas.interview import InterviewDifficulty, InterviewQuestionInternal
from app.schemas.resume import ResumeCreate, ResumeResponse


class InterviewQuestionGenerator:
    def __init__(self) -> None:
        self.term_normalizer = TermNormalizer()

    def generate(
        self,
        *,
        resume: ResumeResponse | ResumeCreate,
        difficulty: InterviewDifficulty,
        question_count: int,
    ) -> list[InterviewQuestionInternal]:
        topics = self._build_topics(resume)
        if not topics:
            topics = [
                {
                    "section": "experience",
                    "topic": "professional experience",
                    "context": resume.personal_info.summary or "software engineering",
                    "keywords": ["experience", "problem solving", "delivery"],
                }
            ]

        generated_questions: list[InterviewQuestionInternal] = []
        topic_cycle = cycle(topics)

        for index in range(question_count):
            topic = next(topic_cycle)
            question_type = "mcq" if index % 2 == 0 else "short_answer"
            generated_questions.append(
                self._build_question(
                    topic=topic,
                    difficulty=difficulty,
                    question_type=question_type,
                    sequence=index + 1,
                )
            )

        return generated_questions

    def _build_topics(self, resume: ResumeResponse | ResumeCreate) -> list[dict]:
        topics: list[dict] = []

        for skill in resume.skills:
            topics.append(
                {
                    "section": "skills",
                    "topic": skill,
                    "context": resume.personal_info.summary or skill,
                    "keywords": [skill, "implementation", "impact"],
                }
            )

        for tool in resume.tools:
            topics.append(
                {
                    "section": "tools",
                    "topic": tool,
                    "context": resume.personal_info.summary or tool,
                    "keywords": [tool, "architecture", "workflow"],
                }
            )

        for project in resume.projects:
            project_keywords = [project.name, *project.technologies, *project.highlights[:2]]
            topics.append(
                {
                    "section": "projects",
                    "topic": project.name,
                    "context": project.description,
                    "keywords": project_keywords or [project.name, "delivery", "tradeoff"],
                }
            )

        summary = resume.personal_info.summary or ""
        if summary:
            topics.append(
                {
                    "section": "experience",
                    "topic": "experience",
                    "context": summary,
                    "keywords": [*self.term_normalizer.normalize_tokens(summary)[:4], "impact"],
                }
            )

        return topics

    def _build_question(
        self,
        *,
        topic: dict,
        difficulty: InterviewDifficulty,
        question_type: str,
        sequence: int,
    ) -> InterviewQuestionInternal:
        if question_type == "mcq":
            return self._build_mcq(topic=topic, difficulty=difficulty, sequence=sequence)
        return self._build_short_answer(
            topic=topic,
            difficulty=difficulty,
            sequence=sequence,
        )

    def _build_mcq(
        self,
        *,
        topic: dict,
        difficulty: InterviewDifficulty,
        sequence: int,
    ) -> InterviewQuestionInternal:
        prompt = (
            f"Question {sequence}: Which answer best demonstrates strong understanding of "
            f"{topic['topic']} in a {difficulty} interview?"
        )
        correct_answer = (
            f"Using {topic['topic']} with clear reasoning, tradeoffs, and measurable delivery impact."
        )
        options = [
            correct_answer,
            f"Avoiding {topic['topic']} and relying on general intuition without specifics.",
            f"Focusing only on definitions of {topic['topic']} without practical examples.",
            f"Discussing unrelated tools without connecting them to {topic['topic']}.",
        ]

        return InterviewQuestionInternal(
            id=str(uuid4()),
            prompt=prompt,
            question_type="mcq",
            topic=topic["topic"],
            section=topic["section"],
            difficulty=difficulty,
            options=options,
            correct_answer=correct_answer,
            explanation=(
                f"The strongest answer connects {topic['topic']} to real implementation choices, "
                "tradeoffs, and outcomes."
            ),
            expected_keywords=self._normalize_keywords(topic["keywords"]),
        )

    def _build_short_answer(
        self,
        *,
        topic: dict,
        difficulty: InterviewDifficulty,
        sequence: int,
    ) -> InterviewQuestionInternal:
        prompt_by_difficulty = {
            "easy": f"Question {sequence}: How have you used {topic['topic']} in your work?",
            "medium": (
                f"Question {sequence}: Describe a practical scenario where {topic['topic']} "
                "helped you solve a production problem."
            ),
            "hard": (
                f"Question {sequence}: What tradeoffs would you evaluate when using "
                f"{topic['topic']} in a high-impact production system?"
            ),
        }

        expected_keywords = [
            topic["topic"],
            *topic["keywords"],
            "example" if difficulty == "easy" else "tradeoff",
        ]

        return InterviewQuestionInternal(
            id=str(uuid4()),
            prompt=prompt_by_difficulty[difficulty],
            question_type="short_answer",
            topic=topic["topic"],
            section=topic["section"],
            difficulty=difficulty,
            options=[],
            correct_answer=topic["context"] or topic["topic"],
            explanation=(
                f"A strong response should connect {topic['topic']} to your experience, explain why it mattered, "
                "and show impact or decision-making."
            ),
            expected_keywords=self._normalize_keywords(expected_keywords),
        )

    def _normalize_keywords(self, keywords: list[str]) -> list[str]:
        normalized = []
        for keyword in keywords:
            term = self.term_normalizer.normalize_term(keyword)
            if term and term not in normalized:
                normalized.append(term)
        return normalized

