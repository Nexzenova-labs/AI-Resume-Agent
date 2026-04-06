import { apiRequest } from "@/lib/api-client";
import type {
  InterviewAnswerResponse,
  InterviewDifficulty,
  InterviewQuestionCount,
  InterviewResult,
  InterviewStartResponse,
  Resume,
} from "@/lib/types";

type InterviewStartPayload = {
  resume_id?: string;
  resume?: Resume;
  difficulty: InterviewDifficulty;
  question_count: InterviewQuestionCount;
};

export const interviewService = {
  start(payload: InterviewStartPayload) {
    return apiRequest<InterviewStartResponse>("/api/interview/start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  answer(sessionId: string, answer: string) {
    return apiRequest<InterviewAnswerResponse>("/api/interview/answer", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        answer,
      }),
    });
  },
  result(sessionId: string) {
    return apiRequest<InterviewResult>(
      `/api/interview/result?session_id=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
      },
    );
  },
};
