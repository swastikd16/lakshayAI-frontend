import { useEffect, useMemo, useState } from "react";
import { get } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import StudyShell from "../components/StudyShell";

type DashboardPlanItem = {
  id?: string;
  time?: string;
  subject?: string;
  subjectClass?: string;
  title?: string;
};

type DashboardRevisionItem = {
  id?: string;
  status?: string;
  statusIcon?: string;
  title?: string;
  icon?: string;
  iconClass?: string;
  iconBoxClass?: string;
  level?: string;
  levelClass?: string;
  difficulty?: string;
  difficultyClass?: string;
  buttonClass?: string;
  wrapperClass?: string;
  statusClass?: string;
};

type DashboardWeakTopic = {
  id?: string;
  priority?: string;
  trend?: string;
  trendIcon?: string;
  title?: string;
  pillText?: string;
  pillIcon?: string;
  cardClass?: string;
  priorityClass?: string;
  trendClass?: string;
  pillClass?: string;
  pillAnimated?: boolean;
};

type DashboardSummaryDto = {
  greetingName?: string | null;
  prepScore?: number | null;
  weeklyDelta?: string | number | null;
  streak?: string | number | null;
  masteryLabel?: string | null;
  daysToExam?: number | null;
  todayPlan?: DashboardPlanItem[] | null;
  revisionCards?: DashboardRevisionItem[] | null;
  weakTopics?: DashboardWeakTopic[] | null;
  recommendation?: {
    title?: string | null;
    description?: string | null;
    buttonLabel?: string | null;
    href?: string | null;
    icon?: string | null;
  } | null;
  quickActions?: Array<{ label?: string | null; icon?: string | null; href?: string | null }> | null;
};

function LoadingCard() {
  return <div className="h-32 animate-pulse rounded-2xl bg-surface-container-lowest" />;
}

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!accessToken) {
      setLoading(false);
      setError("Sign in to load dashboard data.");
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    setError(null);

    get<DashboardSummaryDto>("/dashboard/summary", accessToken)
      .then((data) => {
        if (!alive) return;
        setSummary(data);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard summary.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [accessToken]);

  const viewModel = useMemo(() => {
    return {
      fullName: summary?.greetingName ?? null,
      targetExam: user?.targetExam ?? "Target Exam",
      daysRemaining: summary?.daysToExam ?? null,
      streakDays: summary?.streak ?? null,
      masteryLabel: summary?.masteryLabel ?? null,
      overallPrepScore: summary?.prepScore ?? null,
      weeklyDelta:
        typeof summary?.weeklyDelta === "number"
          ? `${summary.weeklyDelta >= 0 ? "+" : ""}${summary.weeklyDelta} points from last week`
          : (summary?.weeklyDelta ?? null),
      insight: summary?.recommendation?.description ?? null,
      nextAction: summary?.recommendation ?? null,
      todayPlan: summary?.todayPlan ?? [],
      revisionCards: summary?.revisionCards ?? [],
      weakTopics: summary?.weakTopics ?? [],
      quickActions: summary?.quickActions ?? []
    };
  }, [summary, user?.targetExam]);

  return (
    <StudyShell activePage="dashboard">
      <main className="min-h-screen p-6 pb-32 md:ml-64 md:p-10">
        <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
                Good Morning, {viewModel.fullName ?? "No data available"}!
              </h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-emerald-700">
                Updated based on recent performance
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-white">
                {viewModel.targetExam}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-secondary">
                <span className="material-symbols-outlined text-sm">alarm</span>
                {viewModel.daysRemaining === null ? "No data available" : `${viewModel.daysRemaining} days to go`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Streak</p>
                <p className="text-lg font-bold leading-none text-primary">
                  {viewModel.streakDays === null ? "No data available" : `${viewModel.streakDays} days`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  workspace_premium
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mastery</p>
                <p className="text-lg font-bold leading-none text-primary">
                  {viewModel.masteryLabel ?? "No data available"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-8 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-on-error-container">
            {error}
          </div>
        ) : null}

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="relative overflow-hidden rounded-2xl bg-primary p-8 text-white shadow-2xl lg:col-span-4">
            <div className="relative z-10">
              <h3 className="mb-6 text-sm font-semibold text-white/70">Overall Prep Score</h3>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="font-headline text-6xl font-black tracking-tighter">
                  {viewModel.overallPrepScore === null ? "No data available" : viewModel.overallPrepScore}
                </span>
                <span className="text-xl font-bold text-white/50">/100</span>
              </div>
              <p className="mb-8 flex items-center gap-2 text-sm text-white/60">
                <span className="material-symbols-outlined text-sm text-green-400">trending_up</span>
                {viewModel.weeklyDelta ?? "No data available"}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-secondary"
                  style={{ width: `${Math.max(0, Math.min(100, viewModel.overallPrepScore ?? 0))}%` }}
                />
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
          </section>

          <div className="flex flex-col gap-6 lg:col-span-8">
            <section className="glass-card flex items-center gap-6 rounded-2xl border border-secondary/20 p-6 shadow-sm">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/10">
                <span className="material-symbols-outlined text-3xl text-secondary">auto_awesome</span>
              </div>
              <div className="min-w-0">
                <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-secondary">Lakshay AI Insight</h4>
                <p className="text-base font-medium leading-relaxed text-on-surface">
                  {viewModel.insight ?? "No data available"}
                </p>
              </div>
            </section>

            <section className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-secondary to-[#4c12ab] p-6 text-white shadow-lg md:flex-row md:items-center">
              <div className="relative z-10 flex min-w-0 items-center gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">Recommended Next Action</p>
                  <h3 className="font-headline text-xl font-bold leading-tight">
                    {viewModel.nextAction?.title ?? "No data available"}
                  </h3>
                </div>
              </div>
              <a
                href={viewModel.nextAction?.href ?? "#/adaptive-practice"}
                className="relative z-10 rounded-xl bg-white px-6 py-3 text-sm font-bold text-secondary shadow-lg transition-colors hover:bg-secondary-fixed"
              >
                {viewModel.nextAction?.buttonLabel ?? "Start Session"}
              </a>
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                <span className="material-symbols-outlined text-[100px]">psychology</span>
              </div>
            </section>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <section>
              <h3 className="mb-5 flex items-center gap-2 font-headline text-xl font-bold text-primary">
                <span className="material-symbols-outlined">event_note</span>
                Today's Plan
              </h3>
              <div className="space-y-3">
                {loading ? (
                  <LoadingCard />
                ) : viewModel.todayPlan.length ? (
                  viewModel.todayPlan.map((item, index) => (
                    <div key={item.id ?? `${item.title}-${index}`} className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-md">
                      <div className="flex min-w-0 items-center gap-5">
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-[10px] font-bold uppercase text-slate-400">{item.time ?? "--"}</p>
                          <div className="mx-auto my-1 h-8 w-px bg-slate-100" />
                        </div>
                        <div className="min-w-0">
                          <p className={`mb-0.5 text-[10px] font-bold uppercase tracking-widest ${item.subjectClass ?? "text-blue-500"}`}>
                            {item.subject ?? "Study"}
                          </p>
                          <h4 className="truncate text-base font-bold text-primary">{item.title ?? "Untitled plan item"}</h4>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 transition-colors group-hover:text-primary">
                        chevron_right
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500">
                    No data available.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-headline text-xl font-bold text-primary">
                  <span className="material-symbols-outlined">history_edu</span>
                  Revision Due Today
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Spaced Repetition</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {loading ? (
                  <LoadingCard />
                ) : viewModel.revisionCards.length ? (
                  viewModel.revisionCards.map((card, index) => (
                    <article
                      key={card.id ?? `${card.title}-${index}`}
                      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 transition-colors ${card.wrapperClass ?? "border-slate-100"}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${card.statusClass ?? "text-red-600"}`}>
                            <span className="material-symbols-outlined text-[12px]">{card.statusIcon ?? "priority_high"}</span>
                            {card.status ?? "Revision due"}
                          </p>
                          <h4 className="text-base font-bold text-primary">{card.title ?? "Revision topic"}</h4>
                        </div>
                        <div className={`rounded-lg p-2 ${card.iconBoxClass ?? "bg-slate-50"}`}>
                          <span className={`material-symbols-outlined text-lg ${card.iconClass ?? "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {card.icon ?? "schedule"}
                          </span>
                        </div>
                      </div>
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${card.levelClass ?? "bg-slate-100 text-slate-600"}`}>{card.level ?? "Level: 1/5"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${card.difficultyClass ?? "bg-orange-100 text-orange-700"}`}>{card.difficulty ?? "Review"}</span>
                      </div>
                      <button className={`w-full rounded-lg py-2 text-xs font-bold text-white transition-colors ${card.buttonClass ?? "bg-secondary hover:opacity-90"}`}>
                        Start Review
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500">
                    No data available.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8 lg:col-span-4">
            <section className="h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-headline text-lg font-bold text-primary">Weak Topics</h3>
                <span className="material-symbols-outlined text-slate-400">analytics</span>
              </div>

              <div className="space-y-5">
                {loading ? (
                  <LoadingCard />
                ) : viewModel.weakTopics.length ? (
                  viewModel.weakTopics.map((topic, index) => (
                    <div key={topic.id ?? `${topic.title}-${index}`} className={`rounded-xl border p-4 ${topic.cardClass ?? "bg-slate-50 border-slate-100"}`}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter ${topic.priorityClass ?? "bg-red-600 text-white"}`}>
                          {topic.priority ?? "Priority"}
                        </span>
                        <div className={`flex items-center gap-1 ${topic.trendClass ?? "text-slate-500"}`}>
                          <span className="material-symbols-outlined text-[14px]">{topic.trendIcon ?? "trending_down"}</span>
                          <span className="text-[10px] font-bold">{topic.trend ?? "Needs attention"}</span>
                        </div>
                      </div>
                      <h5 className="mb-1 text-sm font-bold text-primary">{topic.title ?? "Untitled weakness"}</h5>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${topic.pillClass ?? "text-slate-600 bg-white border-slate-200"} ${topic.pillAnimated ? "revision-indicator" : ""}`}>
                          <span className="material-symbols-outlined text-[12px]">{topic.pillIcon ?? "lightbulb"}</span>
                          {topic.pillText ?? "Review needed"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500">
                    No data available.
                  </div>
                )}
              </div>

              <button className="mt-6 w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-xs font-bold text-slate-400 transition-all hover:border-secondary hover:text-secondary">
                View Complete Analysis
              </button>
            </section>

            <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-primary p-6 text-white shadow-xl">
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined animate-pulse text-secondary">auto_awesome</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">AI Rebalance Logic</span>
                </div>
                <p className="font-headline text-base font-semibold leading-snug">
                  Weak topics are now mapped to your morning "Peak Flow" zone.
                </p>
                <p className="mt-4 text-[11px] leading-relaxed text-white/60">
                  The backend summary can update this card once live plan rebalancing rules are returned from the API.
                </p>
              </div>
              <div className="pointer-events-none absolute -bottom-4 -right-4 opacity-5">
                <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  insights
                </span>
              </div>
            </section>
          </div>
        </div>

        <section>
          <h3 className="mb-6 font-headline text-xl font-bold text-primary">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {viewModel.quickActions.length ? (
              viewModel.quickActions.map((item, index) => (
                <a key={`${item.label ?? "action"}-${index}`} href={item.href ?? "#"} className="group rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:bg-slate-50">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7FAFC] transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-primary">{item.icon ?? "bolt"}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{item.label ?? "Action"}</span>
                </a>
              ))
            ) : (
              <div className="col-span-2 rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500 md:col-span-4">
                No data available.
              </div>
            )}
          </div>
        </section>
      </main>
    </StudyShell>
  );
}
