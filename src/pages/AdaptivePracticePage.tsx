import { useEffect, useMemo, useRef, useState } from "react";
import { post } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import StudyShell from "../components/StudyShell";

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
  options?: AdaptiveOption[] | null;
  solutionSteps?: string[] | null;
  hint?: string | null;
  verifiedAnswer?: string | null;
};

type AdaptiveSession = {
  id?: string | null;
  module?: string | null;
  topic?: string | null;
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
};

type AdaptiveCompleteResponse = {
  sessionId?: string | null;
  reviewId?: string | null;
};

type StartPayload = {
  module: string;
  topic: string;
  difficulty: string;
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

export default function AdaptivePracticePage() {
  const { accessToken } = useAuth();
  const [session, setSession] = useState<AdaptiveSession | null>(null);
  const [question, setQuestion] = useState<AdaptiveQuestion | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<OptionId | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const totalQuestions = session?.totalQuestions ?? 20;
  const currentQuestion = session?.currentQuestion ?? 1;
  const timerLabel = useMemo(() => formatTimer(Math.max(0, secondsLeft)), [secondsLeft]);
  const chips = question?.chips?.length ? question.chips : [];
  const options = useMemo(() => {
    return question?.options?.length
      ? question.options
          .map((option) => ({ id: normalizeOptionId(option.id), text: option.text?.trim() ?? "" }))
          .filter((option): option is { id: OptionId; text: string } => Boolean(option.id))
      : [];
  }, [question?.options]);
  const solutionSteps = question?.solutionSteps?.length ? question.solutionSteps : [];
  const diagram = question?.diagram ?? null;
  const adaptiveModeLabel =
    session?.adaptiveModeLabel ??
    `Adaptive Mode: ${session?.difficulty ?? "Dynamic difficulty"}`;
  const difficultyLabel =
    session?.difficultyLabel ??
    `Difficulty: ${session?.difficulty ? String(session.difficulty).toUpperCase() : "ADAPTIVE"}`;
  const progressPercent =
    typeof session?.progressPercent === "number"
      ? session.progressPercent
      : Math.round((currentQuestion / Math.max(1, totalQuestions)) * 100);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!accessToken) {
        setLoading(false);
        setError("Sign in to start adaptive practice.");
        return;
      }

      setLoading(true);
      setError(null);
      completedRef.current = false;

      try {
        const data = await post<AdaptiveStartResponse, StartPayload>(
          "/adaptive/session/start",
          {
            module: "Adaptive Practice",
            topic: "General",
            difficulty: "adaptive"
          },
          accessToken
        );

        if (!active) return;

        setSession(data.session ?? null);
        setQuestion(data.question ?? null);
        const resolvedSessionId = data.session?.id ?? null;
        setSessionId(resolvedSessionId);
        setSecondsLeft(typeof data.session?.timerSeconds === "number" ? data.session.timerSeconds : DEFAULT_TIMER_SECONDS);
        setSelectedOption(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load adaptive practice.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const completeSession = async (reason: "submit" | "timer_end") => {
    if (!accessToken || !sessionId || completedRef.current) {
      return;
    }

    completedRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const questionId = question?.id ?? (question?.number != null ? String(question.number) : null);

      if (selectedOption && questionId) {
        await post<AdaptiveAttemptResponse, { questionId: string; selectedOption: OptionId; timeSpentSec: number }>(
          `/adaptive/session/${encodeURIComponent(sessionId)}/attempt`,
          {
            questionId,
            selectedOption,
            timeSpentSec: Math.max(0, (typeof session?.timerSeconds === "number" ? session.timerSeconds : 0) - secondsLeft)
          },
          accessToken
        );
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
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (loading || !sessionId || completedRef.current || secondsLeft <= 0) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
          }
          void completeSession("timer_end");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [loading, sessionId, secondsLeft, accessToken]);

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
                      {question?.title ?? `${question?.subject ?? "Adaptive Practice"} - ${question?.topic ?? "Live Question"}`}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-primary">{`Question ${String(currentQuestion)} of ${String(totalQuestions)}`}</span>
                      <span className="text-slate-300">&middot;</span>
                      <span>{question?.module ?? session?.module ?? question?.subject ?? "Adaptive module"}</span>
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
                  <span className="font-headline text-sm font-bold">
                    {`${progressPercent}% complete`}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-surface-container-low"
                >
                  Pause
                </button>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-primary/80">
                  Progress: {`${progressPercent}% complete`}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${progressPercent > 0 ? "bg-green-500" : "bg-slate-300"}`} />
                  <span className={`h-2 w-2 rounded-full ${progressPercent > 25 ? "bg-green-500" : "bg-slate-300"}`} />
                  <span className={`h-2 w-2 rounded-full ${progressPercent > 50 ? "bg-green-500" : "bg-slate-300"}`} />
                  <span className={`h-2 w-2 rounded-full ${progressPercent > 75 ? "bg-green-500" : "bg-slate-300"}`} />
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
              </div>
            </div>
          </header>

          {error ? (
            <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-on-error-container">{error}</div>
          ) : null}

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
                  <span className="w-max rounded-full bg-[#4b2a00] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#ffd7a6]">
                    {difficultyLabel}
                  </span>
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
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white px-4 py-3 text-sm text-slate-500">
                    No question tags available for this item.
                  </div>
                )}

                <div className="flex gap-3 sm:gap-4">
                  <span className="font-headline text-5xl font-black leading-none text-slate-300 sm:text-6xl">
                    {question?.number != null ? String(question.number).padStart(2, "0") : "--"}
                  </span>
                  <p className="max-w-5xl text-lg leading-relaxed text-on-surface sm:text-3xl">
                    {question?.prompt ?? "Question prompt is unavailable for this session."}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low px-6 py-10 sm:px-10 sm:py-14">
                  <div className="mx-auto max-w-3xl rounded-2xl border-2 border-dashed border-outline-variant/50 bg-white/60 p-8 text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                      {diagram?.label ?? "Diagram placeholder"}
                    </p>
                    <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                      {diagram?.caption ?? "Diagram or figure data will appear here once it is returned from the database."}
                    </p>
                    <p className="mt-4 text-sm font-medium text-primary">
                      {diagram?.altText ?? "Descriptive placeholder for the attached figure."}
                    </p>
                  </div>
                  <span className="absolute bottom-4 right-4 rounded-full border border-outline-variant/30 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary/80">
                    Fig. Placeholder
                  </span>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {options.length ? (
                  options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOption(option.id)}
                      className={`group flex items-center justify-between rounded-2xl border p-5 text-left transition-all ${
                        selectedOption === option.id
                          ? "border-secondary bg-white shadow-[0_0_0_2px_rgba(113,42,226,0.08)]"
                          : "border-outline-variant/20 bg-white hover:border-secondary/40"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                            selectedOption === option.id ? "bg-secondary text-white" : "bg-surface-container text-primary/80"
                          }`}
                        >
                          {option.id}
                        </span>
                        <span className="min-w-0 truncate text-base font-semibold text-primary sm:text-2xl">
                          {option.text || "Option text unavailable"}
                        </span>
                      </div>
                      <Icon
                        name={selectedOption === option.id ? "check_circle" : "radio_button_unchecked"}
                        className={`text-3xl ${selectedOption === option.id ? "text-secondary" : "text-slate-300"}`}
                      />
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500 md:col-span-2">
                    No answer options were returned for this question.
                  </div>
                )}
              </section>

              <section className="border-t border-outline-variant/20 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/5 px-6 py-4 text-lg font-bold text-secondary transition-colors hover:bg-secondary/10"
                  >
                    <Icon name="lightbulb" />
                    Hint
                  </button>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void completeSession("submit")}
                      disabled={submitting}
                      className="rounded-2xl border border-primary px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Submit Answer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void completeSession("submit")}
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container disabled:opacity-60"
                    >
                      Next Question
                      <Icon name="arrow_forward" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-outline-variant/20 bg-white p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-white">
                      <Icon name="smart_toy" />
                    </span>
                    <h3 className="font-headline text-2xl font-bold text-primary sm:text-3xl">AI Step-by-Step Solution</h3>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {question?.verifiedAnswer ? `Verified Answer: ${question.verifiedAnswer}` : "Verified answer will appear after evaluation."}
                  </span>
                </div>

                {solutionSteps.length ? (
                  <ol className="space-y-4">
                    {solutionSteps.map((step, index) => (
                      <li key={`${index}-${step}`} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <p className="text-lg leading-relaxed text-on-surface-variant">{step}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low p-5 text-sm text-slate-500">
                    No step-by-step solution was returned for this question.
                  </div>
                )}

                <p className="mt-8 text-xl font-bold text-primary sm:text-2xl">
                  Conclusion: <span className="text-secondary">Complete this session to generate your final review insights.</span>
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
