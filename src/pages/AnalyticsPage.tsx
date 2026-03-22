import { useEffect, useMemo, useState } from "react";
import StudyShell from "../components/StudyShell";
import { useAuth } from "../contexts/AuthContext";
import { get } from "../lib/apiClient";

type Achievement = { label: string; value: string; icon: string };
type ProficiencyCard = { title: string; subject: string; score: number; delta: string; chip: string; subjectClass?: string; deltaClass?: string };
type TopicGroup = { subject: string; topics: { name: string; value: number }[]; color?: string };
type DailyMastery = { label: string; hours: number; fill: number };
type AnalyticsPayload = {
  overallScore?: number;
  weeklyDelta?: number;
  focusWindow?: string;
  achievementStats?: Achievement[];
  proficiencyCards?: ProficiencyCard[];
  subjectBreakdown?: TopicGroup[];
  dailyMastery?: DailyMastery[];
  retentionBars?: { label: string; value: number }[];
  insightSignals?: string[];
};

function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined shrink-0 ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

function ProgressBar({ value, colorClass = "bg-secondary" }: { value: number; colorClass?: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { accessToken } = useAuth();
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!accessToken) {
        if (alive) {
          setPayload(null);
          setError("Sign in to view analytics.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await get<AnalyticsPayload>("/analytics/snapshot", accessToken);
        if (alive) setPayload(data);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load analytics.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [accessToken]);

  const achievementStats = payload?.achievementStats ?? [];
  const proficiencyCards = payload?.proficiencyCards ?? [];
  const subjectBreakdown = payload?.subjectBreakdown ?? [];
  const dailyMastery = payload?.dailyMastery ?? [];
  const retentionBars = payload?.retentionBars ?? [];
  const insightSignals = payload?.insightSignals ?? [];
  const overallScore = payload?.overallScore;
  const weeklyDelta = payload?.weeklyDelta;
  const focusWindow = payload?.focusWindow;

  const hasAnalytics = Boolean(
    overallScore !== undefined ||
      weeklyDelta !== undefined ||
      focusWindow ||
      achievementStats.length ||
      proficiencyCards.length ||
      subjectBreakdown.length ||
      dailyMastery.length ||
      retentionBars.length ||
      insightSignals.length
  );

  const conceptChips = useMemo(() => ["All Concepts", "Physics", "Chemistry", "Mathematics", "Weak Areas", "High Retention"], []);

  return (
    <StudyShell activePage="analytics">
      <main className="min-h-screen pb-32 md:ml-64 md:pb-12">
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Advanced Mastery Analytics</h1>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Live performance sync</span>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
                Lakshay AI is tracking mastery, forgetting risk, and consistency across your prep stack. Updated with your latest practice and revision signals.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <Icon name="auto_awesome" filled className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Refresh</p>
                  <p className="truncate text-sm font-bold text-primary">2 min ago</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon name="schedule" filled className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Focus Window</p>
                  <p className="truncate text-sm font-bold text-primary">{focusWindow ?? "No focus window yet"}</p>
                </div>
              </div>
            </div>
          </header>

          {loading ? <div className="rounded-3xl border border-slate-100 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading analytics snapshot...</div> : null}
          {error ? <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-on-error-container">{error}</div> : null}

          {!loading && !error && !hasAnalytics ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-white p-8 text-sm text-slate-500 shadow-sm">
              No analytics data available yet. Complete practice and revision sessions to populate this dashboard.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-2xl lg:col-span-4 sm:p-7">
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">Overall Prep Score</p>
                    <h2 className="mt-2 font-headline text-5xl font-black tracking-tight sm:text-6xl">{overallScore ?? "--"}</h2>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Delta</p>
                    <p className="text-lg font-bold text-emerald-300">{weeklyDelta !== undefined ? `+${weeklyDelta} this week` : "No delta yet"}</p>
                  </div>
                </div>
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="min-w-0 truncate text-sm font-semibold text-white/75">Readiness toward JEE Main 2026</span>
                    <span className="shrink-0 text-sm font-bold text-white">{overallScore !== undefined ? `${overallScore}%` : "--"}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.max(0, Math.min(100, overallScore ?? 0))}%` }} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/65">
                    <span>Concept coverage</span>
                    <span>Retention stable</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {achievementStats.length ? (
                    achievementStats.map((stat) => (
                      <div key={stat.label} className="min-w-0 rounded-2xl bg-white/10 p-3">
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                          <Icon name={stat.icon} filled className="text-sm" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{stat.label}</p>
                        <p className="mt-1 truncate text-sm font-bold text-white">{stat.value}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/70">
                      No achievement metrics yet.
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
              <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
            </section>

            <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
              <section className="glass-card rounded-3xl border border-secondary/15 p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.35em] text-secondary">
                      <Icon name="auto_awesome" className="text-base" />
                      Lakshay AI Insight
                    </h3>
                    <p className="max-w-4xl text-sm leading-relaxed text-on-surface sm:text-base">
                      {insightSignals[0] ?? "No AI insight available yet."}
                    </p>
                  </div>
                  <a href="#/revision" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition-opacity hover:opacity-90">
                    <Icon name="play_arrow" className="text-sm" />
                    Start AI Action
                  </a>
                </div>
              </section>

              <section className="rounded-3xl border border-outline-variant/10 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-headline text-lg font-bold text-primary sm:text-xl">Retention Trend</h3>
                    <p className="text-sm text-slate-500">Mini memory curve based on recent revision frequency.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Last 30 days</span>
                </div>
                {retentionBars.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {retentionBars.map((bar) => (
                      <div key={bar.label} className="flex min-w-0 flex-col items-center gap-2">
                        <div className="flex h-40 w-full items-end rounded-2xl bg-slate-50 p-2">
                          <div className="w-full rounded-xl bg-gradient-to-t from-secondary to-[#8b5cf6]" style={{ height: `${Math.max(0, Math.min(100, bar.value))}%` }} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-slate-50 p-6 text-sm text-slate-500">
                    No retention trend available yet.
                  </div>
                )}
              </section>
            </div>
          </div>

          <section className="rounded-3xl border border-outline-variant/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h3 className="truncate font-headline text-xl font-bold text-primary">Concept Proficiency Matrix</h3>
                <p className="text-sm text-slate-500">Chips and cards show the current state of your concepts across the exam syllabus.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {conceptChips.map((chip, index) => (
                  <span
                    key={chip}
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${index === 0 ? "bg-secondary text-white" : "border border-slate-200 bg-white text-slate-500"}`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              {proficiencyCards.length ? (
                <div className="grid min-w-[760px] grid-cols-3 gap-4">
                  {proficiencyCards.map((card) => (
                    <article key={card.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`mb-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${card.subjectClass ?? "text-blue-600 bg-blue-50"}`}>
                            {card.subject}
                          </p>
                          <h4 className="truncate text-lg font-bold text-primary">{card.title}</h4>
                        </div>
                        <div className="shrink-0 rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</p>
                          <p className="text-lg font-black text-primary">{card.score}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-semibold text-slate-500">Mastery</span>
                          <span className="shrink-0 font-bold text-primary">{card.score}%</span>
                        </div>
                        <ProgressBar value={card.score} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">{card.chip}</span>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${card.deltaClass ?? "text-emerald-600 bg-emerald-50"}`}>
                          {card.delta}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-slate-50 p-6 text-sm text-slate-500">
                  No proficiency cards yet.
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <section className="rounded-3xl border border-outline-variant/10 bg-white p-5 shadow-sm xl:col-span-8 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-headline text-xl font-bold text-primary">Concept-Level Mastery Breakdown</h3>
                  <p className="text-sm text-slate-500">Progress by subject, sorted for quick intervention planning.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">12 core concepts</span>
              </div>
              {subjectBreakdown.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {subjectBreakdown.map((group) => (
                    <article key={group.subject} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{group.subject}</p>
                          <h4 className="mt-1 truncate text-base font-bold text-primary">Mastery Map</h4>
                        </div>
                        <span className={`h-3 w-3 shrink-0 rounded-full ${group.color ?? "bg-blue-500"}`} />
                      </div>
                      <div className="space-y-4">
                        {group.topics.map((topic) => (
                          <div key={topic.name}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-sm font-semibold text-slate-600">{topic.name}</span>
                              <span className="shrink-0 text-sm font-bold text-primary">{topic.value}%</span>
                            </div>
                            <ProgressBar value={topic.value} colorClass={group.color ?? "bg-secondary"} />
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-slate-50 p-6 text-sm text-slate-500">
                  No concept breakdown data yet.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-outline-variant/10 bg-white p-5 shadow-sm xl:col-span-4 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-headline text-xl font-bold text-primary">Achievement Snapshot</h3>
                  <p className="text-sm text-slate-500">Ranked against similar aspirants.</p>
                </div>
                <Icon name="workspace_premium" className="text-slate-400 text-xl" />
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-white">
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/65">Percentile</p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="font-headline text-5xl font-black tracking-tight">{overallScore !== undefined ? Math.min(99.9, overallScore + 12).toFixed(1) : "—"}</span>
                    <span className="pb-2 text-lg font-bold text-white/75">%</span>
                  </div>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">
                    You are in the top tier of current performance, but there is room to push retention higher in weak chapters.
                  </p>
                </div>
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-secondary/25 blur-2xl" />
                <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Top Signal</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">{insightSignals[0] ?? "No top signal yet."}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Risk Signal</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">{insightSignals[1] ?? "No risk signal yet."}</p>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-outline-variant/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-headline text-xl font-bold text-primary">Daily Mastery Time Tracking</h3>
                <p className="text-sm text-slate-500">How much focused mastery time you logged across the week.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Hours studied</span>
            </div>
            {dailyMastery.length ? (
              <div className="overflow-x-auto">
                <div className="grid min-w-[720px] grid-cols-7 gap-4">
                  {dailyMastery.map((day, index) => (
                    <div key={day.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-primary">{day.label}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{day.hours}h</span>
                      </div>
                      <div className="flex h-40 items-end rounded-2xl bg-white p-2 shadow-sm">
                        <div className={`w-full rounded-xl ${index % 3 === 0 ? "bg-blue-500" : index % 3 === 1 ? "bg-secondary" : "bg-emerald-500"}`} style={{ height: `${Math.max(0, Math.min(100, day.fill))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-slate-50 p-6 text-sm text-slate-500">
                No daily mastery tracking data yet.
              </div>
            )}
          </section>
        </section>
      </main>
    </StudyShell>
  );
}

