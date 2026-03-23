export type ApiError = {
  message: string;
  code?: string;
  details?: string;
};

export type ApiResult<T> = {
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
};

export type AuthUserDto = {
  id: string;
  email: string | null;
  fullName: string | null;
  targetExam?: string | null;
};

export type AuthSessionDto = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  user: AuthUserDto;
};

export type SessionState = {
  accessToken: string | null;
  user: AuthUserDto | null;
};

export type AuthCredentialsDto = {
  email: string;
  password: string;
};

export type AuthSignUpDto = AuthCredentialsDto & {
  fullName?: string;
};

export type OnboardingPayloadDto = {
  examType: "JEE" | "NEET" | "UPSC";
  targetDate: string;
  dailyHoursTarget: number;
  confidenceBySubject: Record<string, number>;
  diagnosticAnswers: DiagnosticAnswerDto[];
};

export type OnboardingResponseDto = {
  completed: boolean;
  weakTopics?: Array<{
    subject: string;
    topic: string;
  }>;
};

export type DiagnosticQuestionDto = {
  id: string;
  subject: string;
  topic: string;
  prompt: string;
  options: string[];
};

export type DiagnosticQuestionBankDto = {
  examType: "JEE" | "NEET" | "UPSC";
  totalQuestions: number;
  questions: DiagnosticQuestionDto[];
};

export type DiagnosticAnswerDto = {
  questionId: string;
  selectedOption: string;
};

export type DashboardSummaryDto = Record<string, unknown>;
export type PlannerWeekDto = Record<string, unknown>;
export type PlannerView = "week" | "month";
export type PlannerCalendarDayDto = {
  date: string;
  weekday: string;
  monthLabel: string;
  inCurrentMonth: boolean;
  active?: boolean;
  items: Array<{
    id?: string;
    startsAt?: string;
    endsAt?: string;
    subject?: string;
    topic?: string;
    type?: string;
  }>;
};
export type PlannerCalendarDto = {
  view?: PlannerView;
  weekStartDate?: string;
  weekLabel?: string;
  monthStartDate?: string;
  monthLabel?: string;
  calendarLabel?: string;
  weekDays?: Array<{ day: string; date: string; active?: boolean }>;
  days?: PlannerCalendarDayDto[];
  items?: Array<{
    id?: string;
    startsAt?: string;
    endsAt?: string;
    subject?: string;
    topic?: string;
    type?: string;
    source?: string;
    notes?: string | null;
  }>;
  weakTopics?: Array<{
    id?: string;
    title?: string;
    riskLevel?: string;
    retentionEstimate?: number;
    severity?: string;
    copy?: string;
    icon?: string;
  }>;
  focusMessage?: string;
  plannerSource?: "llm" | "fallback";
  usedFallback?: boolean;
};
export type AdaptiveSessionDto = Record<string, unknown>;
export type AdaptiveReviewDto = Record<string, unknown>;
export type DoubtThreadDto = Record<string, unknown>;
export type DoubtMessageDto = Record<string, unknown>;
export type RevisionWeakTopicDto = {
  revisionItemId: string;
  subject: string;
  topic: string;
  riskLevel?: string;
  retentionEstimate?: number;
  lastReviewAt?: string | null;
  nextReviewAt?: string | null;
};
export type RevisionTopicCurvePointDto = {
  label: string;
  retention: number;
  hoursFromNow?: number;
};
export type RevisionTopicCurveDto = {
  revisionItemId: string;
  subject?: string;
  topic?: string;
  riskLevel?: string;
  retentionEstimate?: number;
  lastReviewAt?: string | null;
  nextReviewAt?: string | null;
  reviewCount?: number;
  points: RevisionTopicCurvePointDto[];
  currentRetention?: number;
  dueInHours?: number | null;
  safeWindow?: string;
  recommendation?: string;
  updatedAt?: string;
};
export type RevisionOverviewDto = Record<string, unknown> & {
  weakTopics?: RevisionWeakTopicDto[];
};
export type AnalyticsSnapshotDto = Record<string, unknown>;
export type ProfileSnapshotDto = Record<string, unknown>;
export type MultimodalTranscriptMetaDto = {
  language?: string | null;
  source?: string | null;
  segmentCount?: number;
  transcriptLength?: number;
};
export type MultimodalVideoNotesDto = {
  id: string;
  youtubeUrl: string;
  videoId: string;
  videoTitle?: string | null;
  transcript?: string;
  transcriptSegments?: Array<{ text?: string; start?: number; duration?: number }>;
  transcriptMeta?: MultimodalTranscriptMetaDto;
  notesMarkdown: string;
  conceptSummary: string;
  mermaidCode: string;
  keyTopics?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};
