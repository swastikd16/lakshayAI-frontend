import { useEffect, useMemo, useState } from "react";
import { get } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import StudyShell from "../components/StudyShell";

type ReviewScoreCard = {
  label?: string | null;
  value?: string | null;
  meta?: string | null;
  icon?: string | null;
  accent?: string | null;
};

type ReviewOption = {
  id?: string | null;
  label?: string | null;
  text?: string | null;
  tone?: string | null;
  isSelected?: boolean | null;
  isCorrect?: boolean | null;
};

type ReviewQuestion = {
  number?: string | null;
  topic?: string | null;
  status?: "incorrect" | "correct" | string | null;
  timeSpent?: string | null;
  timeSpentSec?: number | null;
  prompt?: string | null;
  selectedOption?: string | null;
  correctOption?: string | null;
  question?: string | null;
  options?: ReviewOption[] | null;
  answer?: string | null;
};

type ReviewSession = {
  id?: string | null;
  module?: string | null;
  topic?: string | null;
  scorePercent?: number | null;
  accuracyPercent?: number | null;
  timeSpentSec?: number | null;
  title?: string | null;
  subtitle?: string | null;
  scoreCards?: ReviewScoreCard[] | null;
  overallConfidence?: string | null;
};

type AdaptiveReviewDto = {
  session?: ReviewSession | null;
  errorPatterns?: Array<{ label?: string | null; count?: string | number | null }> | null;
  weakConcept?: { title?: string | null; note?: string | null } | string | null;
  recommendation?: { title?: string | null; description?: string | null; ctaLabel?: string | null } | null;
  questions?: ReviewQuestion[] | null;
};

function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined shrink-0 ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

function parseSessionIdFromHash() {
  if (typeof window === "undefined") return null;
  const query = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  return params.get("sessionId") || params.get("session") || null;
}

export default function AdaptiveReviewPage() {
  const { accessToken } = useAuth();
  const [review, setReview] = useState<AdaptiveReviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "incorrect">("all");

  useEffect(() => {
    let active = true;

    async function loadReview() {
      if (!accessToken) {
        setLoading(false);
        setError("Sign in to view the adaptive review.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sessionId = parseSessionIdFromHash();
        const data = sessionId
          ? await get<AdaptiveReviewDto>(`/adaptive/review/${encodeURIComponent(sessionId)}`, accessToken)
          : await get<AdaptiveReviewDto>("/adaptive/review/latest", accessToken);

        if (!active) return;
        setReview(data);
      } catch (err) {
        if (!active) return;
        setReview(null);
        setError(err instanceof Error ? err.message : "Unable to load the adaptive review.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    void loadReview();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const viewModel = useMemo(() => {
    const session = review?.session ?? null;
    const timeSpentMinutes =
      typeof session?.timeSpentSec === "number"
        ? Math.max(1, Math.round(session.timeSpentSec / 60))
        : null;
    const derivedScoreCards: ReviewScoreCard[] = [
      {
        label: "Total Score",
        value: typeof session?.scorePercent === "number" ? `${session.scorePercent}%` : "N/A",
        icon: "star",
        accent: "bg-secondary"
      },
      {
        label: "Accuracy",
        value: typeof session?.accuracyPercent === "number" ? `${session.accuracyPercent}%` : "N/A",
        meta: typeof session?.scorePercent === "number" ? `${session.scorePercent}% score` : null,
        icon: "trending_up",
        accent: "bg-emerald-500"
      },
      {
        label: "Time Spent",
        value: timeSpentMinutes !== null ? `${timeSpentMinutes}m` : "N/A",
        meta:
          typeof session?.timeSpentSec === "number"
            ? `${Math.round(session.timeSpentSec / Math.max(1, (review?.questions?.length ?? 1)))}s avg`
            : null,
        icon: "schedule",
        accent: "bg-primary"
      }
    ];

    const mappedQuestions: ReviewQuestion[] = (review?.questions ?? []).map((item, index) => {
      const options = (item.options ?? []).map((option) => {
        const optionLabel = option.label ?? option.id ?? "";
        const suffix = option.isCorrect
          ? " (Correct)"
          : option.isSelected
            ? " (Your Choice)"
            : "";
        const tone = option.isCorrect
          ? "text-green-700"
          : option.isSelected
            ? "text-error"
            : "text-slate-500";

        return {
          label: optionLabel,
          text: `${option.text ?? ""}${suffix}`,
          tone
        };
      });

      return {
        number: item.number ?? String(index + 1).padStart(2, "0"),
        topic: item.topic ?? "Concept",
        status: item.status ?? "incorrect",
        timeSpent:
          typeof item.timeSpentSec === "number"
            ? `${Math.max(1, Math.round(item.timeSpentSec / 60))}m ${item.timeSpentSec % 60}s`
            : (item.timeSpent ?? null),
        question: item.question ?? item.prompt ?? "Question unavailable",
        options,
        answer:
          item.correctOption && !options.length
            ? `Correct Option: ${item.correctOption}`
            : item.answer
      };
    });

    const weakConceptTitle =
      typeof review?.weakConcept === "string"
        ? review.weakConcept
        : review?.weakConcept?.title;

    return {
      title: session?.title ?? `Practice Review: ${session?.topic ?? session?.module ?? "Adaptive Session"}`,
      subtitle:
        session?.subtitle ??
        `Deep-dive analysis into your recent performance on ${session?.topic ?? "your adaptive practice module"}.`,
      scoreCards:
        session?.scoreCards?.length
          ? session.scoreCards
          : derivedScoreCards,
      recommendation: review?.recommendation ?? null,
      errorPatterns: review?.errorPatterns ?? [],
      weakConcept: weakConceptTitle
        ? {
            title: weakConceptTitle,
            note:
              typeof review?.weakConcept === "string"
                ? "Review suggested before next mock."
                : (review?.weakConcept?.note ?? "Review suggested before next mock.")
          }
        : null,
      questions: mappedQuestions,
      confidence:
        session?.overallConfidence ??
        (typeof session?.accuracyPercent === "number" ? `${session.accuracyPercent}%` : "N/A")
    };
  }, [review]);

  const filteredQuestions = useMemo(() => {
    if (activeFilter === "incorrect") {
      return viewModel.questions.filter((item) => (item.status ?? "").toLowerCase() === "incorrect");
    }
    return viewModel.questions;
  }, [activeFilter, viewModel.questions]);

  return (
    <StudyShell activePage="adaptive-review">
      <main className="min-h-screen pb-24 md:ml-64 md:pb-12">
        <section className="mx-auto flex w-full max-w-[1260px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <nav className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>Practice</span>
                <Icon name="chevron_right" className="text-[14px]" />
                <span>Review</span>
              </nav>
              <h1 className="font-headline text-4xl font-black tracking-tight text-primary sm:text-5xl">{viewModel.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">{viewModel.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="rounded-xl border border-slate-100 bg-white px-6 py-3 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-slate-50"
              >
                Retry Similar Questions
              </button>
              <a href="#/doubt-solver" className="flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition-opacity hover:opacity-90">
                <Icon name="smart_toy" className="text-[18px]" />
                Ask AI Tutor
              </a>
            </div>
            <span className="w-max rounded-full border border-secondary/20 bg-secondary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
              Confidence: {viewModel.confidence}
            </span>
          </header>

          {error ? <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-on-error-container">{error}</div> : null}

          {loading ? (
            <div className="space-y-6 rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
              <div className="h-28 animate-pulse rounded-2xl bg-surface-container" />
              <div className="h-96 animate-pulse rounded-3xl bg-surface-container" />
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {viewModel.scoreCards.length ? (
                  viewModel.scoreCards.map((card, index) => (
                    <article key={`${card.label ?? "metric"}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-7 shadow-sm lg:col-span-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{card.label ?? "No data available"}</p>
                          <div className="mt-2 flex items-end gap-2">
                            <h2 className="font-headline text-5xl font-black tracking-tight text-primary">{card.value ?? "No data available"}</h2>
                            {card.meta ? <span className="pb-1 text-sm font-semibold text-emerald-600">{card.meta}</span> : null}
                          </div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                          <Icon name={card.icon ?? "star"} filled className="text-2xl" />
                        </div>
                      </div>
                      <div className={`mt-4 h-1.5 w-24 rounded-full ${card.accent ?? "bg-secondary"}`} />
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500 lg:col-span-12">
                    No data available.
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <article className="rounded-[24px] border border-secondary/10 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 flex items-start gap-4">
                      <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-secondary p-3 text-white shadow-lg shadow-secondary/20">
                        <Icon name="auto_awesome" filled />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold text-primary">{viewModel.recommendation?.title ?? "No data available"}</h2>
                        <p className="text-sm text-slate-500">AI-driven insight based on your performance patterns.</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/50 bg-secondary/5 p-5">
                      <p className="max-w-3xl text-base leading-relaxed text-primary">{viewModel.recommendation?.description ?? "No data available."}</p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button type="button" className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-container">
                        {viewModel.recommendation?.ctaLabel ?? "No data available"}
                      </button>
                      <button type="button" className="rounded-xl border border-secondary/20 bg-white px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/5">
                        Revise Weak Topics
                      </button>
                    </div>
                  </article>

                  <section>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="font-headline text-2xl font-black text-primary">Question-by-Question Review</h2>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setActiveFilter("all")} className={`rounded-lg px-4 py-2 text-xs font-bold ${activeFilter === "all" ? "bg-surface-container text-primary" : "bg-white text-slate-400"}`}>
                          All
                        </button>
                        <button type="button" onClick={() => setActiveFilter("incorrect")} className={`rounded-lg px-4 py-2 text-xs font-bold ${activeFilter === "incorrect" ? "bg-surface-container text-primary" : "bg-white text-slate-400"}`}>
                          Incorrect Only
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {filteredQuestions.length ? (
                        filteredQuestions.map((item, index) => {
                          const incorrect = (item.status ?? "").toLowerCase() === "incorrect";
                          return (
                            <article
                              key={`${item.number ?? index}-${index}`}
                              className={`group overflow-hidden rounded-[24px] border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${incorrect ? "border-l-4 border-error" : "border-l-4 border-green-500"}`}
                            >
                              <div className="flex flex-col gap-6 md:flex-row">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black ${incorrect ? "bg-error-container text-error" : "bg-green-50 text-green-600"}`}>
                                  {item.number ?? "--"}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="mb-3 flex flex-wrap items-center gap-3">
                                    <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase text-slate-600">{item.topic ?? "No data available"}</span>
                                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${incorrect ? "bg-error-container text-error" : "bg-green-100 text-green-700"}`}>
                                      {incorrect ? "Incorrect" : "Correct"}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                      <Icon name="schedule" className="text-sm" />
                                      {item.timeSpent ?? "No data available"}
                                    </span>
                                  </div>

                                  <h3 className="mb-4 text-lg font-bold leading-snug text-primary sm:text-xl">{item.question ?? "No data available."}</h3>

                                  {item.options?.length ? (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                      {item.options.map((option, optionIndex) => (
                                        <div
                                          key={`${option.label ?? optionIndex}-${optionIndex}`}
                                          className={`rounded-xl border px-4 py-3 text-sm ${
                                            option.tone?.includes("error") ? "border-error/20 bg-error-container/20" : option.tone?.includes("green") ? "border-green-200 bg-green-50" : "border-slate-100 bg-surface"
                                          }`}
                                        >
                                          <span className={`font-medium ${option.tone ?? "text-slate-500"}`}>
                                            {option.label ?? String.fromCharCode(65 + optionIndex)}) {option.text ?? "No data available"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low p-4 text-sm text-slate-500">
                                      No data available.
                                    </div>
                                  )}

                                  {item.answer ? <p className="mt-3 text-sm text-slate-500">{item.answer}</p> : null}
                                </div>

                                <div className="flex shrink-0 gap-2 md:flex-col md:justify-end">
                                  <button type="button" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-secondary/5 hover:text-secondary">
                                    <Icon name="bookmark" />
                                  </button>
                                  <button type="button" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-secondary/5 hover:text-secondary">
                                    <Icon name="share" />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500">No data available.</div>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="space-y-6 xl:col-span-4">
                  <section className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <Icon name="analytics" className="text-tertiary" />
                      <h2 className="text-xl font-bold text-primary">Error Pattern Analysis</h2>
                    </div>

                    <div className="space-y-4">
                      {viewModel.errorPatterns.length ? (
                        viewModel.errorPatterns.map((item, index) => (
                          <div key={`${item.label ?? "pattern"}-${index}`} className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
                            <span className="text-sm font-medium text-slate-600">{item.label ?? "No data available"}</span>
                            <span className="rounded-lg bg-primary-container px-2.5 py-1 text-xs font-bold text-white">{item.count ?? "No data available"}</span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-slate-500">No data available.</div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[24px] bg-primary-container p-6 text-white shadow-xl">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-widest opacity-80">Weak Concept Detection</h2>
                    <p className="mb-4 font-headline text-2xl font-bold">{viewModel.weakConcept?.title ?? "No data available"}</p>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Icon name="priority_high" className="text-sm" />
                      {viewModel.weakConcept?.note ?? "No data available."}
                    </div>
                  </section>
                </aside>
              </section>

              <footer className="rounded-3xl border border-slate-100 bg-surface-container px-6 py-8 text-primary shadow-sm">
                <div className="grid gap-8 lg:grid-cols-3">
                  <div className="min-w-0">
                    <span className="font-headline text-2xl font-black tracking-tight">Lakshay AI</span>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                      Editorial learning excellence for competitive exams. Review, planning, and practice stay aligned so you can focus on what matters.
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Product</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-500">
                      <li>Features</li>
                      <li>Study Planner</li>
                    </ul>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Support</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-500">
                      <li>Privacy</li>
                      <li>Terms</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-8 text-center">
                  <p className="text-xs font-medium text-slate-500">© 2024 Lakshay AI. Editorial Learning Excellence.</p>
                </div>
              </footer>
            </>
          )}
        </section>
      </main>
    </StudyShell>
  );
}
