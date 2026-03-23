import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { post } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import StudyShell from "../components/StudyShell";
import MathText from "../components/MathText";

type OptionId = "A" | "B" | "C" | "D";

type AdaptiveOption = {
  id?: string;
  text?: string | null;
};

type AdaptiveQuestion = {
  id?: string;
  number?: string | number | null;
  title?: string | null;
  subject?: string | null;
  topic?: string | null;
  module?: string | null;
  prompt?: string | null;
  chips?: string[] | null;
  diagram?: {
    label?: string | null;
    caption?: string | null;
    altText?: string | null;
  } | null;
  options?: AdaptiveOption[] | Record<string, string> | null;
  solutionSteps?: string[] | null;
  hint?: string | null;
  verifiedAnswer?: string | null;
  correctOption?: string | null;
  aiSolution?: string | null;
};

type AdaptiveSession = {
  id?: string | null;
  module?: string | null;
  topic?: string | null;
  subject?: string | null;
  revisionItemId?: string | null;
  difficulty?: string | null;
  timerSeconds?: number | null;
  progressPercent?: number | null;
  currentQuestion?: number | null;
  totalQuestions?: number | null;
  adaptiveModeLabel?: string | null;
  difficultyLabel?: string | null;
};

type AdaptiveStartResponse = {
  session?: AdaptiveSession | null;
  question?: AdaptiveQuestion | null;
};

type AdaptiveAttemptResponse = {
  success?: boolean;
  isCorrect?: boolean;
  selectedOption?: string | null;
  correctOption?: string | null;
  solutionSteps?: string[] | null;
  aiSolution?: string | null;
  explanation?: string | null;
  session?: AdaptiveSession | null;
  question?: AdaptiveQuestion | null;
};

type AdaptiveCompleteResponse = {
  sessionId?: string | null;
  reviewId?: string | null;
};

type AdaptiveHintResponse = {
  hint?: string | null;
  source?: string | null;
};

type StartPayload = {
  module: string;
  topic: string;
  subject?: string | null;
  revisionItemId?: string | null;
  difficulty: string;
};

type PracticeContext = {
  topic: string | null;
  subject: string | null;
  revisionItemId: string | null;
};

type AttemptFeedback = {
  isCorrect: boolean;
  selectedOption: OptionId | null;
  correctOption: OptionId | null;
  solutionSteps: string[];
  aiSolution: string | null;
  evaluatedAt: string;
};

const DEFAULT_TIMER_SECONDS = 25 * 60;

function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined shrink-0 ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

function formatTimer(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeOptionId(value?: string | null): OptionId | null {
  const upper = (value ?? "").trim().toUpperCase();
  return upper === "A" || upper === "B" || upper === "C" || upper === "D" ? upper : null;
}

function parsePracticeContext(hash = window.location.hash): PracticeContext {
  const query = hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);

  return {
    topic: params.get("topic")?.trim() || null,
    subject: params.get("subject")?.trim() || null,
    revisionItemId: params.get("revisionItemId")?.trim() || null
  };
}

function extractOptionList(options?: AdaptiveQuestion["options"] | Record<string, string> | null) {
  if (Array.isArray(options)) {
    return options
      .map((option) => {
        const id = normalizeOptionId(option.id);
        const text = option.text?.trim() ?? "";
        if (!id || !text) return null;
        return { id, text };
      })
      .filter((option): option is { id: OptionId; text: string } => option !== null);
  }

  if (options && typeof options === "object") {
    return Object.entries(options)
      .map(([id, text]) => {
        const normalizedId = normalizeOptionId(id);
        const optionText = String(text ?? "").trim();
        if (!normalizedId || !optionText) return null;
        return { id: normalizedId, text: optionText };
      })
      .filter((option): option is { id: OptionId; text: string } => option !== null);
  }

  return [];
}

function normalizeAttemptSolution(solutionSteps?: string[] | null, aiSolution?: string | null) {
  return {
    steps: Array.isArray(solutionSteps)
      ? solutionSteps.map((step) => String(step).trim()).filter(Boolean)
      : [],
    aiSolution: aiSolution?.trim() ?? null
  };
}

export default function AdaptivePracticePage() {
  const { accessToken } = useAuth();
  const [session, setSession] = useState<AdaptiveSession | null>(null);
  const [question, setQuestion] = useState<AdaptiveQuestion | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<OptionId | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintSource, setHintSource] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [attemptFeedback, setAttemptFeedback] = useState<AttemptFeedback | null>(null);
  const [practiceContext, setPracticeContext] = useState<PracticeContext>(() => parsePracticeContext());
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answeredCount, setAnsweredCount] = useState(0);
  const completedRef = useRef(false);
  const requestIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef<number>(Date.now());

  const totalQuestions = session?.totalQuestions ?? 20;
  const currentQuestion = session?.currentQuestion ?? Math.min(questionNumber, totalQuestions);
  const timerLabel = useMemo(() => formatTimer(Math.max(0, secondsLeft)), [secondsLeft]);
  const chips = question?.chips?.length ? question.chips : [];
  const options = useMemo(() => extractOptionList(question?.options ?? null), [question?.options]);
  const solvedFeedback = useMemo(
    () => normalizeAttemptSolution(attemptFeedback?.solutionSteps ?? question?.solutionSteps ?? null, attemptFeedback?.aiSolution ?? question?.aiSolution ?? null),
    [attemptFeedback, question]
  );
  const diagram = question?.diagram ?? null;
  const adaptiveModeLabel = session?.adaptiveModeLabel ?? `Adaptive Mode: ${session?.difficulty ?? "Dynamic difficulty"}`;
  const difficultyLabel = session?.difficultyLabel ?? `Difficulty: ${session?.difficulty ? String(session.difficulty).toUpperCase() : "ADAPTIVE"}`;
  const progressPercent =
    typeof session?.progressPercent === "number"
      ? session.progressPercent
      : Math.round((Math.min(answeredCount, totalQuestions) / Math.max(1, totalQuestions)) * 100);
  const contextLabel = [session?.subject ?? practiceContext.subject, session?.topic ?? practiceContext.topic].filter(Boolean).join(" - ");
  const hasFeedback = Boolean(attemptFeedback);
  const verifiedAnswerLabel = attemptFeedback?.correctOption ?? normalizeOptionId(question?.verifiedAnswer ?? question?.correctOption ?? null) ?? null;

  useEffect(() => {
    const onHashChange = () => setPracticeContext(parsePracticeContext());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const loadSession = useCallback(
    async (context: PracticeContext) => {
      if (!accessToken) {
        setLoading(false);
        setError("Sign in to start adaptive practice.");
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      setAttemptFeedback(null);
      setSelectedOption(null);
      setHintText(null);
      setHintSource(null);
      setHintLoading(false);
      setQuestionNumber(1);
      setAnsweredCount(0);
      setIsPaused(false);
      setTimerMenuOpen(false);
      completedRef.current = false;

      try {
        const data = await post<AdaptiveStartResponse, StartPayload>(
          "/adaptive/session/start",
          {
            module: "Adaptive Practice",
            topic: context.topic ?? context.subject ?? "General",
            subject: context.subject ?? null,
            revisionItemId: context.revisionItemId ?? null,
            difficulty: "adaptive"
          },
          accessToken
        );

        if (requestId !== requestIdRef.current) return;

        setSession(data.session ?? null);
        setQuestion(data.question ?? null);
        setSessionId(data.session?.id ?? null);
        setSecondsLeft(typeof data.session?.timerSeconds === "number" ? data.session.timerSeconds : DEFAULT_TIMER_SECONDS);
        questionStartedAtRef.current = Date.now();
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setQuestion(null);
        setSession(null);
        setSessionId(null);
        setError(err instanceof Error ? err.message : "Unable to load adaptive practice.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadSession(practiceContext);
  }, [loadSession, practiceContext]);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
  }, [question?.id]);

  const evaluateCurrentAnswer = useCallback(async (): Promise<AttemptFeedback | null> => {
    if (!accessToken || !sessionId || !question || !selectedOption) {
      return null;
    }

    const questionId = question.id ?? (question.number != null ? String(question.number) : null);
    if (!questionId) {
      throw new Error("Question unavailable.");
    }

    const timeSpentSec = Math.max(0, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
    const response = await post<AdaptiveAttemptResponse, { questionId: string; selectedOption: OptionId; timeSpentSec: number }>(
      `/adaptive/session/${encodeURIComponent(sessionId)}/attempt`,
      {
        questionId,
        selectedOption,
        timeSpentSec
      },
      accessToken
    );

    const normalizedCorrect = normalizeOptionId(response.correctOption ?? question.correctOption ?? null);
    const normalizedSolution = normalizeAttemptSolution(response.solutionSteps ?? question.solutionSteps ?? null, response.aiSolution ?? response.explanation ?? question.aiSolution ?? null);
    const isCorrect = typeof response.isCorrect === "boolean" ? response.isCorrect : normalizedCorrect ? normalizedCorrect === selectedOption : false;

    const feedback: AttemptFeedback = {
      isCorrect,
      selectedOption,
      correctOption: normalizedCorrect,
      solutionSteps: normalizedSolution.steps,
      aiSolution: normalizedSolution.aiSolution,
      evaluatedAt: new Date().toISOString()
    };

    setAttemptFeedback(feedback);
    setAnsweredCount((current) => current + 1);
    return feedback;
  }, [accessToken, question, selectedOption, sessionId]);

  const handleSubmit = useCallback(async () => {
    if (hasFeedback || submitting || advancing || finishing) {
      return;
    }

    if (!selectedOption) {
      setError("Choose an answer before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await evaluateCurrentAnswer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate your answer.");
    } finally {
      setSubmitting(false);
    }
  }, [advancing, evaluateCurrentAnswer, finishing, hasFeedback, selectedOption, submitting]);

  const handleNextQuestion = useCallback(async () => {
    if (!accessToken || !sessionId || !hasFeedback) {
      return;
    }

    setAdvancing(true);
    setError(null);

    try {
      const data = await post<AdaptiveStartResponse, { topic?: string | null; subject?: string | null; revisionItemId?: string | null }>(
        `/adaptive/session/${encodeURIComponent(sessionId)}/question/next`,
        {
          topic: session?.topic ?? practiceContext.topic ?? null,
          subject: session?.subject ?? practiceContext.subject ?? null,
          revisionItemId: practiceContext.revisionItemId ?? null
        },
        accessToken
      );

      if (!data.question) {
        throw new Error("No next question available.");
      }

      setQuestion(data.question);
      setSession(data.session ?? session);
      setSelectedOption(null);
      setAttemptFeedback(null);
      setHintText(null);
      setHintSource(null);
      setHintLoading(false);
      setQuestionNumber((current) => current + 1);
      questionStartedAtRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the next question.");
    } finally {
      setAdvancing(false);
    }
  }, [accessToken, hasFeedback, practiceContext.revisionItemId, practiceContext.subject, practiceContext.topic, session, sessionId]);

  const finishSession = useCallback(
    async (reason: "submit" | "timer_end" = "submit") => {
      if (!accessToken || !sessionId || completedRef.current) {
        return;
      }

      completedRef.current = true;
      setFinishing(true);
      setError(null);

      try {
        if (!hasFeedback && selectedOption) {
          await evaluateCurrentAnswer();
        }

        const completed = await post<AdaptiveCompleteResponse, { reason: "submit" | "timer_end" }>(
          `/adaptive/session/${encodeURIComponent(sessionId)}/complete`,
          { reason },
          accessToken
        );

        const resolvedId = completed.reviewId ?? completed.sessionId ?? sessionId;
        window.location.hash = `#/adaptive-review?sessionId=${encodeURIComponent(resolvedId)}`;
      } catch (err) {
        completedRef.current = false;
        setError(err instanceof Error ? err.message : "Unable to complete this session.");
      } finally {
        setFinishing(false);
      }
    },
    [accessToken, evaluateCurrentAnswer, hasFeedback, selectedOption, sessionId]
  );

  const handleHint = useCallback(async () => {
    if (!accessToken || !sessionId || !question) {
      return;
    }

    const questionId = question.id ?? (question.number != null ? String(question.number) : null);
    if (!questionId) {
      setError("Question unavailable.");
      return;
    }

    setHintLoading(true);
    setError(null);

    try {
      const response = await post<AdaptiveHintResponse, { questionId: string; selectedOption?: OptionId | null }>(
        `/adaptive/session/${encodeURIComponent(sessionId)}/hint`,
        {
          questionId,
          selectedOption
        },
        accessToken
      );

      setHintText(response.hint?.trim() ? response.hint : "No hint available yet.");
      setHintSource(response.source ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate hint.");
    } finally {
      setHintLoading(false);
    }
  }, [accessToken, question, selectedOption, sessionId]);

  const applyTimerPreset = useCallback((minutes: number) => {
    const safeMinutes = Math.max(1, minutes);
    setSecondsLeft(safeMinutes * 60);
    setIsPaused(false);
    setTimerMenuOpen(false);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((current) => !current);
  }, []);

  useEffect(() => {
    if (loading || !sessionId || completedRef.current || secondsLeft <= 0 || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          void finishSession("timer_end");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    timerRef.current = intervalId;

    return () => {
      window.clearInterval(intervalId);
      if (timerRef.current === intervalId) {
        timerRef.current = null;
      }
    };
  }, [finishSession, isPaused, loading, sessionId, secondsLeft]);

  const optionTone = useCallback(
    (optionId: OptionId) => {
      if (!attemptFeedback) {
        return selectedOption === optionId
          ? "border-secondary bg-white shadow-[0_0_0_2px_rgba(113,42,226,0.08)]"
          : "border-outline-variant/20 bg-white hover:border-secondary/40";
      }

      if (attemptFeedback.correctOption === optionId) {
        return "border-green-300 bg-green-50 shadow-[0_0_0_2px_rgba(34,197,94,0.08)]";
      }

      if (attemptFeedback.selectedOption === optionId) {
        return "border-red-300 bg-red-50 shadow-[0_0_0_2px_rgba(239,68,68,0.08)]";
      }

      return "border-outline-variant/10 bg-slate-50/80 opacity-75";
    },
    [attemptFeedback, selectedOption]
  );

  return (
    <StudyShell activePage="adaptive-practice">
      <main className="min-h-screen pb-24 md:ml-64 md:pb-12">
        <section className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
          <header className="border-b border-outline-variant/20 pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-lg text-white">
                    <Icon name="bolt" filled className="text-xl" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-4xl">
                      {question?.title ?? `${question?.subject ?? practiceContext.subject ?? "Adaptive Practice"} - ${question?.topic ?? practiceContext.topic ?? "Live Question"}`}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-primary">{`Question ${String(currentQuestion)} of ${String(totalQuestions)}`}</span>
                      <span className="text-slate-300">&middot;</span>
                      <span>{question?.module ?? session?.module ?? question?.subject ?? practiceContext.subject ?? "Adaptive module"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-secondary">
                  <Icon name="hourglass_top" />
                  <span className="font-headline text-sm font-bold">{timerLabel}</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-primary">
                  <Icon name="schedule" />
                  <span className="font-headline text-sm font-bold">{`${progressPercent}% complete`}</span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTimerMenuOpen((current) => !current)}
                    className="rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-surface-container-low"
                  >
                    Set Timer
                  </button>
                  {timerMenuOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-outline-variant/20 bg-white p-2 shadow-xl">
                      {[5, 10, 15, 20].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => applyTimerPreset(minutes)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low"
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={togglePause}
                  className="rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-surface-container-low"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-widest text-primary/80">
                Progress: {`${progressPercent}% complete`} | Solved: {Math.min(answeredCount, totalQuestions)}/{totalQuestions}
              </p>
              {contextLabel ? (
                <span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
                  Topic locked: {contextLabel}
                </span>
              ) : null}
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${progressPercent > 0 ? "bg-green-500" : "bg-slate-300"}`} />
                <span className={`h-2 w-2 rounded-full ${progressPercent > 25 ? "bg-green-500" : "bg-slate-300"}`} />
                <span className={`h-2 w-2 rounded-full ${progressPercent > 50 ? "bg-green-500" : "bg-slate-300"}`} />
                <span className={`h-2 w-2 rounded-full ${progressPercent > 75 ? "bg-green-500" : "bg-slate-300"}`} />
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
              </div>
            </div>
          </header>

          {error ? <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-on-error-container">{error}</div> : null}

          {loading ? (
            <div className="space-y-4 rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
              <div className="h-16 animate-pulse rounded-2xl bg-surface-container" />
              <div className="h-64 animate-pulse rounded-3xl bg-surface-container" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-20 animate-pulse rounded-2xl bg-surface-container" />
                <div className="h-20 animate-pulse rounded-2xl bg-surface-container" />
              </div>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-white shadow-lg shadow-secondary/20">
                      <Icon name="trending_up" filled />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-secondary">{adaptiveModeLabel}</h2>
                      <p className="text-sm text-on-surface-variant">Based on your recent performance.</p>
                    </div>
                  </div>
                  <span className="w-max rounded-full bg-[#4b2a00] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#ffd7a6]">{difficultyLabel}</span>
                </div>
              </section>

              <section className="space-y-5">
                {chips.length ? (
                  <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                      <span key={chip} className="rounded-lg bg-surface-container px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary/80">
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white px-4 py-3 text-sm text-slate-500">No question tags available for this item.</div>
                )}

                <div className="flex gap-3 sm:gap-4">
                  <span className="font-headline text-5xl font-black leading-none text-slate-300 sm:text-6xl">{question?.number != null ? String(question.number).padStart(2, "0") : "--"}</span>
                  <MathText
                    as="p"
                    className="max-w-5xl text-lg leading-relaxed text-on-surface sm:text-3xl"
                    text={question?.prompt ?? "Question prompt is unavailable for this session."}
                  />
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low px-6 py-10 sm:px-10 sm:py-14">
                  <div className="mx-auto max-w-3xl rounded-2xl border-2 border-dashed border-outline-variant/50 bg-white/60 p-8 text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">{diagram?.label ?? "Diagram placeholder"}</p>
                    <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                      {diagram?.caption ?? "Diagram or figure data will appear here once it is returned from the database."}
                    </p>
                    <p className="mt-4 text-sm font-medium text-primary">{diagram?.altText ?? "Descriptive placeholder for the attached figure."}</p>
                  </div>
                  <span className="absolute bottom-4 right-4 rounded-full border border-outline-variant/30 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary/80">Fig. Placeholder</span>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {options.length ? (
                  options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (!hasFeedback && !submitting && !advancing && !finishing) {
                          setSelectedOption(option.id);
                        }
                      }}
                      disabled={hasFeedback || submitting || advancing || finishing}
                      className={`group flex items-start justify-between rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed ${optionTone(option.id)}`}
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${selectedOption === option.id && !hasFeedback ? "bg-secondary text-white" : hasFeedback && attemptFeedback?.correctOption === option.id ? "bg-green-600 text-white" : hasFeedback && attemptFeedback?.selectedOption === option.id && !attemptFeedback.isCorrect ? "bg-red-600 text-white" : "bg-surface-container text-primary/80"}`}>
                          {option.id}
                        </span>
                        <MathText
                          as="span"
                          className="min-w-0 whitespace-normal break-words text-base font-semibold leading-snug text-primary sm:text-xl"
                          text={option.text || "Option text unavailable"}
                        />
                      </div>
                      <Icon
                        name={hasFeedback ? (attemptFeedback?.correctOption === option.id ? "check_circle" : attemptFeedback?.selectedOption === option.id ? "cancel" : "radio_button_unchecked") : selectedOption === option.id ? "check_circle" : "radio_button_unchecked"}
                        className={`text-3xl ${hasFeedback ? (attemptFeedback?.correctOption === option.id ? "text-green-600" : attemptFeedback?.selectedOption === option.id ? "text-red-600" : "text-slate-300") : selectedOption === option.id ? "text-secondary" : "text-slate-300"}`}
                      />
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500 md:col-span-2">No answer options were returned for this question.</div>
                )}
              </section>

              {hasFeedback ? (
                <section className={`rounded-3xl border p-5 sm:p-6 ${attemptFeedback?.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${attemptFeedback?.isCorrect ? "text-green-700" : "text-red-700"}`}>{attemptFeedback?.isCorrect ? "Correct" : "Wrong"}</p>
                      <h3 className="mt-1 font-headline text-xl font-bold text-primary sm:text-2xl">
                        {attemptFeedback?.isCorrect ? "Nice work - you got it right." : "AI review for this question"}
                      </h3>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-primary shadow-sm">
                      Correct option: {verifiedAnswerLabel ?? "N/A"}
                    </div>
                  </div>

                  {!attemptFeedback?.isCorrect ? (
                    <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4">
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-500">AI Solution</p>
                      {solvedFeedback.steps.length ? (
                        <ol className="mt-3 space-y-3">
                          {solvedFeedback.steps.map((step, index) => (
                            <li key={`${index}-${step}`} className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                                {index + 1}
                              </span>
                              <MathText as="p" className="text-base leading-relaxed text-on-surface-variant" text={step} />
                            </li>
                          ))}
                        </ol>
                      ) : solvedFeedback.aiSolution ? (
                        <MathText as="p" className="mt-3 whitespace-pre-line text-base leading-relaxed text-on-surface-variant" text={solvedFeedback.aiSolution} />
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No AI solution was returned for this attempt.</p>
                      )}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="border-t border-outline-variant/20 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => void handleHint()}
                    disabled={hintLoading || finishing || advancing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/5 px-6 py-4 text-lg font-bold text-secondary transition-colors hover:bg-secondary/10 disabled:opacity-60"
                  >
                    <Icon name="lightbulb" />
                    {hintLoading ? "Generating Hint..." : "Hint"}
                  </button>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={!selectedOption || submitting || advancing || finishing || hasFeedback}
                      className="rounded-2xl border border-primary px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
                    >
                      {submitting ? "Checking..." : hasFeedback ? "Submitted" : "Submit Answer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleNextQuestion()}
                      disabled={!hasFeedback || advancing || finishing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container disabled:opacity-60"
                    >
                      {advancing ? "Loading Next..." : "Next Question"}
                      <Icon name="arrow_forward" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void finishSession("submit")}
                      disabled={finishing || submitting || advancing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-outline-variant/30 bg-white px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-surface-container-low disabled:opacity-60"
                    >
                      {finishing ? "Finishing..." : "Finish Session"}
                    </button>
                  </div>
                </div>
              </section>

              {hintText ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                    AI Hint{hintSource ? ` (${hintSource})` : ""}
                  </p>
                  <MathText as="p" className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-900" text={hintText} />
                </section>
              ) : null}

              <section className="rounded-3xl border border-outline-variant/20 bg-white p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-white">
                      <Icon name="smart_toy" />
                    </span>
                    <h3 className="font-headline text-2xl font-bold text-primary sm:text-3xl">AI Step-by-Step Solution</h3>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {verifiedAnswerLabel ? `Verified Answer: ${verifiedAnswerLabel}` : "Verified answer will appear after evaluation."}
                  </span>
                </div>

                {hasFeedback && !attemptFeedback?.isCorrect ? (
                  solvedFeedback.steps.length ? (
                    <ol className="space-y-4">
                      {solvedFeedback.steps.map((step, index) => (
                        <li key={`${index}-${step}`} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-slate-500">{index + 1}</span>
                          <MathText as="p" className="text-lg leading-relaxed text-on-surface-variant" text={step} />
                        </li>
                      ))}
                    </ol>
                  ) : solvedFeedback.aiSolution ? (
                    <MathText as="p" className="whitespace-pre-line text-lg leading-relaxed text-on-surface-variant" text={solvedFeedback.aiSolution} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low p-5 text-sm text-slate-500">
                      No step-by-step solution was returned for this question.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low p-5 text-sm text-slate-500">
                    Submit your answer to reveal AI feedback and the full solution.
                  </div>
                )}

                <p className="mt-8 text-xl font-bold text-primary sm:text-2xl">
                  Conclusion: <span className="text-secondary">Keep going to build topic mastery one question at a time.</span>
                </p>
              </section>
            </>
          )}
        </section>
      </main>

      <button
        type="button"
        onClick={() => {
          window.location.hash = "#/doubt-solver";
        }}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-2xl transition-transform active:scale-90 md:hidden"
      >
        <Icon name="smart_toy" className="text-[24px]" />
      </button>
    </StudyShell>
  );
}

