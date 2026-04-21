export type User = {
  id: string;
  email: string;
  full_name: string;
  auth_provider: string;
  is_active: boolean;
  created_at?: string | null;
};

export type PersonalInfo = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  links: string[];
};

export type ExperienceItem = {
  company: string;
  role: string;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  highlights: string[];
};

export type EducationItem = {
  institution: string;
  degree: string;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  achievements: string[];
};

export type ProjectItem = {
  name: string;
  description: string;
  technologies: string[];
  link?: string | null;
  highlights: string[];
};

export type CustomSectionItem = {
  name: string;
  items: string[];
};

export type Resume = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  personal_info: PersonalInfo;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  tools: string[];
  projects: ProjectItem[];
  custom_sections: CustomSectionItem[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ResumePayload = {
  title: string;
  status?: string;
  personal_info: PersonalInfo;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  tools: string[];
  projects: ProjectItem[];
  custom_sections: CustomSectionItem[];
};

export type AuthResponse = {
  access_token?: string | null;
  refresh_token?: string | null;
  token_type: string;
  user: User;
};

export type JobScrapeResult = {
  source_url: string;
  source_type: string;
  job_title?: string | null;
  company?: string | null;
  job_description_text: string;
  skills_requirements?: string | null;
};

export type AtsAnalysisResult = {
  job_input_status: string;
  extracted_keywords: string[];
  matched_keywords: string[];
  missing_skills: string[];
  ranked_missing_skills: string[];
  keyword_match_score: number;
  semantic_score: number;
  weighted_section_score: number;
  section_scores: Record<string, number>;
  overall_ats_score: number;
  improvement_suggestions: string[];
  scraped_job?: JobScrapeResult | null;
};

export type SectionQuality = {
  score: number;
  max_score: number;
  present: boolean;
  notes: string[];
};

export type ResumeQualityResult = {
  overall_score: number;
  grade: string;
  completeness_score: number;
  keyword_richness_score: number;
  section_breakdown: Record<string, SectionQuality>;
  detected_skills: string[];
  missing_recommended_sections: string[];
  tips: string[];
};

export type InterviewDifficulty = "easy" | "medium" | "hard";
export type InterviewQuestionCount = 10 | 20 | 30 | 40 | 50;
export type InterviewQuestionType = "mcq" | "short_answer";

export type InterviewQuestion = {
  id: string;
  prompt: string;
  question_type: InterviewQuestionType;
  topic: string;
  section: string;
  difficulty: InterviewDifficulty;
  options: string[];
};

export type InterviewProgress = {
  answered: number;
  remaining: number;
  total: number;
};

export type InterviewStartResponse = {
  session_id: string;
  difficulty: InterviewDifficulty;
  question_count: number;
  current_question: InterviewQuestion;
  progress: InterviewProgress;
};

export type InterviewAnswerEvaluation = {
  is_correct: boolean;
  explanation: string;
  improvement_suggestion: string;
  score_awarded: number;
};

export type InterviewAnswerResponse = {
  session_id: string;
  evaluation: InterviewAnswerEvaluation;
  next_question?: InterviewQuestion | null;
  progress: InterviewProgress;
  is_complete: boolean;
};

export type InterviewResult = {
  session_id: string;
  difficulty: InterviewDifficulty;
  question_count: number;
  status: string;
  total_score: number;
  strengths: string[];
  weak_areas: string[];
  answered_questions: number;
};
