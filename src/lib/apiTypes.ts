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
};

export type OnboardingResponseDto = {
  completed: boolean;
};

export type DashboardSummaryDto = Record<string, unknown>;
export type PlannerWeekDto = Record<string, unknown>;
export type AdaptiveSessionDto = Record<string, unknown>;
export type AdaptiveReviewDto = Record<string, unknown>;
export type DoubtThreadDto = Record<string, unknown>;
export type DoubtMessageDto = Record<string, unknown>;
export type RevisionOverviewDto = Record<string, unknown>;
export type AnalyticsSnapshotDto = Record<string, unknown>;
export type ProfileSnapshotDto = Record<string, unknown>;
