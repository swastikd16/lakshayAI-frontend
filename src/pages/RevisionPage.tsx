import StudyShell from "../components/StudyShell";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { get, post } from "../lib/apiClient";

type KpiCard = { label: string; value: string; delta: string; icon: string; tone: string; accent: string };
type ReviseCard = {
  id?: string;
  title: string;
  subtitle: string;
  risk: string;
  riskTone: string;
  icon: string;
  iconTone: string;
  progress: string;
  progressTone: string;
  action: string;
  buttonTone: string;
};
type MistakeRow = { subject: string; topic: string; note: string; time: string; severity: "High" | "Medium" | "Low" };
type CurvePoint = { label: string; retention: number };
type Checkpoint = { label: string; value: string; note: string };
type WeakTopicOption = {
  revisionItemId: string;
  subject: string;
  topic: string;
  riskLevel?: string;
  risk?: string;
  priority?: number;
};
type TopicCurvePayload = {
  revisionItemId?: string;
  topic?: string;
  subject?: string;
  points?: CurvePoint[];
  safeWindow?: string;
  recommendation?: string;
  updatedAt?: string;
};
type OverviewPayload = {
  kpis?: { topicsDue?: number; retention?: number; overdue?: number };
  forgettingCurve?: CurvePoint[];
  recommendations?: Array<string | { title?: string; body?: string; label?: string }>;
  queue?: Array<{ id?: string; title?: string; subtitle?: string; risk?: string; retention?: number; action?: string; subject?: string }>;
  recentMistakes?: MistakeRow[];
  repetitionStats?: Array<{ label?: string; value?: string | number }>;
  memoryModes?: Array<{ label?: string; icon?: string; description?: string }>;
  weakTopics?: Array<{ revisionItemId?: string; id?: string; subject?: string; topic?: string; riskLevel?: string; risk?: string; priority?: number }>;
};

type ReviewOutcome = "easy" | "ok" | "hard";

function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined shrink-0 ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

const CHART_LEFT = 20;
const CHART_RIGHT = 500;
const CHART_TOP = 20;
const CHART_BOTTOM = 198;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function retentionToChartY(retention: number) {
  const normalized = clamp(retention, 0, 100);
  return CHART_BOTTOM - (normalized / 100) * CHART_HEIGHT;
}

function buildPath(points: CurvePoint[]) {
  return points
    .map((point, index) => {
      const x = CHART_LEFT + ((CHART_RIGHT - CHART_LEFT) * index) / Math.max(1, points.length - 1);
      const y = retentionToChartY(point.retention);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getLabelY(chartY: number) {
  return chartY <= CHART_TOP + 28 ? chartY + 18 : chartY - 14;
}

function toCardColor(retention?: number) {
  const value = typeof retention === "number" ? retention : 0;
  if (value >= 80) return "bg-emerald-500";
  if (value >= 65) return "bg-secondary";
  if (value >= 50) return "bg-blue-500";
  if (value >= 35) return "bg-amber-500";
  return "bg-red-500";
}

export default function RevisionPage() {
  const { accessToken } = useAuth();
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedWeakTopicId, setSelectedWeakTopicId] = useState("");
  const [topicCurve, setTopicCurve] = useState<TopicCurvePayload | null>(null);
  const [topicCurveLoading, setTopicCurveLoading] = useState(false);
  const [topicCurveError, setTopicCurveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (withLoading = false) => {
      try {
        if (withLoading) {
          setLoading(true);
        }
        setError(null);
        const data = await get<OverviewPayload>("/revision/overview", accessToken);
        setPayload(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load revision overview.");
      } finally {
        if (withLoading) {
          setLoading(false);
        }
      }
    },
    [accessToken]
  );

  const loadTopicCurve = useCallback(
    async (revisionItemId: string, withLoading = true) => {
      if (!revisionItemId) {
        setTopicCurve(null);
        setTopicCurveError(null);
        return;
      }

      try {
        if (withLoading) {
          setTopicCurveLoading(true);
        }
        setTopicCurveError(null);
        const data = await get<TopicCurvePayload>(
          `/revision/topic-curve?revisionItemId=${encodeURIComponent(revisionItemId)}`,
          accessToken
        );
        setTopicCurve(data);
      } catch (e) {
        setTopicCurveError(e instanceof Error ? e.message : "Failed to load topic curve.");
      } finally {
        if (withLoading) {
          setTopicCurveLoading(false);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await loadOverview(true);
    })();

    return () => {
      alive = false;
    };
  }, [loadOverview]);

  const weakTopicOptions = useMemo<WeakTopicOption[]>(() => {
    const mapped: Array<WeakTopicOption | null> = (payload?.weakTopics ?? []).map((item) => {
        const revisionItemId = item.revisionItemId ?? item.id ?? "";
        if (!revisionItemId || !item.topic || !item.subject) {
          return null;
        }

        return {
          revisionItemId,
          subject: item.subject,
          topic: item.topic,
          riskLevel: item.riskLevel,
          risk: item.risk,
          priority: item.priority
        };
      });

    return mapped.filter((item): item is WeakTopicOption => item !== null);
  }, [payload]);

  useEffect(() => {
    if (!weakTopicOptions.length) {
      setSelectedWeakTopicId("");
      setTopicCurve(null);
      setTopicCurveError(null);
      return;
    }

    const selectedStillExists = weakTopicOptions.some((item) => item.revisionItemId === selectedWeakTopicId);
    if (!selectedWeakTopicId || !selectedStillExists) {
      setSelectedWeakTopicId(weakTopicOptions[0].revisionItemId);
    }
  }, [selectedWeakTopicId, weakTopicOptions]);

  useEffect(() => {
    if (!selectedWeakTopicId) {
      setTopicCurve(null);
      setTopicCurveError(null);
      return;
    }

    void loadTopicCurve(selectedWeakTopicId, true);
  }, [loadTopicCurve, selectedWeakTopicId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadOverview(false);
      if (selectedWeakTopicId) {
        void loadTopicCurve(selectedWeakTopicId, false);
      }
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadOverview, loadTopicCurve, selectedWeakTopicId]);

  const kpiCards: KpiCard[] = useMemo(() => {
    const source = payload?.kpis;
    return [
      { label: "Topics Due", value: String(source?.topicsDue ?? 0), delta: "Live queue", icon: "schedule", tone: "bg-blue-50 text-blue-600", accent: "text-blue-600" },
      { label: "Retention", value: `${clamp(source?.retention ?? 0, 0, 100)}%`, delta: "Memory health", icon: "psychology", tone: "bg-emerald-50 text-emerald-600", accent: "text-emerald-600" },
      { label: "Overdue Items", value: String(source?.overdue ?? 0), delta: "Needs attention", icon: "warning", tone: "bg-amber-50 text-amber-600", accent: "text-amber-600" }
    ];
  }, [payload]);

  const reviseToday: ReviseCard[] = useMemo(() => {
    const queue = payload?.queue ?? [];
    return queue.map((item, index) => {
      const risk = item.risk ?? (index === 0 ? "High Forgetting Risk" : index === 1 ? "Due Now" : "Low Risk");
      const retention = typeof item.retention === "number" ? item.retention : 0;
      const riskTone =
        risk.toLowerCase().includes("high") ? "bg-red-100 text-red-700 border-red-200" : risk.toLowerCase().includes("due") ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-emerald-100 text-emerald-700 border-emerald-200";
      const iconTone =
        index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600";
      const progressTone = index === 0 ? "text-red-600" : index === 1 ? "text-blue-600" : "text-emerald-600";
      const buttonTone = index === 0 ? "bg-red-600 hover:bg-red-700" : index === 1 ? "bg-secondary hover:opacity-90" : "bg-slate-900 hover:bg-slate-800";
      return {
        id: item.id,
        title: item.title ?? "Untitled topic",
        subtitle: item.subtitle ?? item.subject ?? "Revision session",
        risk,
        riskTone,
        icon: index === 0 ? "science" : index === 1 ? "bolt" : "functions",
        iconTone,
        progress: `${Math.max(1, Math.round((retention / 100) * 5))}/5`,
        progressTone,
        action: item.action ?? (index === 0 ? "Revise Now" : index === 1 ? "Start Review" : "Quick Recall"),
        buttonTone
      };
    });
  }, [payload]);

  const mistakes = payload?.recentMistakes ?? [];
  const selectedWeakTopic = useMemo(
    () => weakTopicOptions.find((item) => item.revisionItemId === selectedWeakTopicId) ?? null,
    [selectedWeakTopicId, weakTopicOptions]
  );
  const weakTopicPriorityList = useMemo(
    () =>
      [...weakTopicOptions].sort((a, b) => {
        const aPriority = typeof a.priority === "number" ? a.priority : Number.MAX_SAFE_INTEGER;
        const bPriority = typeof b.priority === "number" ? b.priority : Number.MAX_SAFE_INTEGER;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return `${a.subject}:${a.topic}`.localeCompare(`${b.subject}:${b.topic}`);
      }),
    [weakTopicOptions]
  );
  const points =
    topicCurve?.points?.length ? topicCurve.points : payload?.forgettingCurve?.length ? payload.forgettingCurve : [];
  const normalizedRecommendations = useMemo(() => {
    return (payload?.recommendations ?? []).map((item) => {
      if (typeof item === "string") {
        return item;
      }
      return item.body ?? item.title ?? item.label ?? "";
    }).filter(Boolean);
  }, [payload]);
  const checkpoints: Checkpoint[] = useMemo(() => {
    return normalizedRecommendations.slice(0, 3).map((item, index) => ({
      label: `Checkpoint ${index + 1}`,
      value: index === 0 ? "now" : index === 1 ? "tomorrow" : "in 3 days",
      note: item
    }));
  }, [normalizedRecommendations]);

  const modes = payload?.memoryModes?.length ? payload.memoryModes : [];
  const safeWindow = useMemo(() => {
    if (topicCurve?.safeWindow) {
      return topicCurve.safeWindow;
    }
    const first = normalizedRecommendations[0] ?? "";
    const match = first.match(/(\d+\s*h)/i);
    return match?.[1] ?? "N/A";
  }, [normalizedRecommendations, topicCurve?.safeWindow]);
  const recommendations = topicCurve?.recommendation
    ? [topicCurve.recommendation, ...normalizedRecommendations]
    : normalizedRecommendations;
  const memoryModes = modes;
  const repetitionStats = payload?.repetitionStats ?? [];

  async function markReviewed(item: ReviseCard) {
    if (!item.id) return;
    setReviewingId(item.id);
    try {
      await post("/revision/review", { revisionItemId: item.id, outcome: "ok" as ReviewOutcome }, accessToken);
    } catch {
      // keep the UI responsive even if the review write fails
    } finally {
      setReviewingId(null);
    }
  }

  function openSelectedTopicPractice() {
    if (!selectedWeakTopic) return;

    const params = new URLSearchParams({
      topic: selectedWeakTopic.topic,
      subject: selectedWeakTopic.subject
    });

    if (selectedWeakTopic.revisionItemId) {
      params.set("revisionItemId", selectedWeakTopic.revisionItemId);
    }

    window.location.hash = `#/adaptive-practice?${params.toString()}`;
  }

  return (
    <StudyShell activePage="revision">
      <main className="min-h-screen pb-28 md:ml-64 md:pb-12">
        <section className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3"><h1 className="min-w-0 truncate font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Revision</h1><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Spaced Repetition Active</span></div>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-500 sm:text-base">Review high-priority topics, strengthen long-term memory, and keep your forgetting curve under control with session blocks tuned by Lakshay AI.</p>
            </div>
            <div className="flex flex-wrap gap-3"><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-slate-50"><Icon name="calendar_today" className="text-lg" />Schedule Session</button><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition-opacity hover:opacity-90"><Icon name="auto_awesome" className="text-lg" />Generate Plan</button></div>
          </header>

          <section className="mb-6 overflow-hidden rounded-[32px] border border-secondary/10 bg-gradient-to-r from-white via-secondary/5 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-3"><h2 className="truncate font-headline text-xl font-bold text-primary sm:text-2xl">Parkinson Forgetting Curve</h2><span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">Spaced repetition</span></div><p className="max-w-3xl text-sm leading-relaxed text-slate-500 sm:text-base">The first drop is the steepest. Lakshay AI places your next review before retention falls below the safe zone, so the topic stays active instead of fading out.</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Safe review window: {safeWindow}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Updated with recent sessions</span></div>
            </div>
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-[24px] border border-slate-100 bg-white/90 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="min-w-0">
                <label htmlFor="revision-weak-topic" className="mb-2 block text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                  Weak-topic focus
                </label>
                <select
                  id="revision-weak-topic"
                  value={selectedWeakTopicId}
                  onChange={(event) => setSelectedWeakTopicId(event.target.value)}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none transition focus:border-secondary"
                >
                  {weakTopicOptions.length ? (
                    weakTopicOptions.map((item) => (
                      <option key={item.revisionItemId} value={item.revisionItemId}>
                        {item.subject} - {item.topic}{item.riskLevel ? ` (${item.riskLevel})` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="">No weak topics available yet</option>
                  )}
                </select>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">
                    {selectedWeakTopic ? `${selectedWeakTopic.subject}: ${selectedWeakTopic.topic}` : "Waiting for weak-topic data"}
                  </span>
                  <span className="rounded-full bg-secondary/10 px-3 py-1 font-bold text-secondary">
                    Auto-refresh every 45s
                  </span>
                </div>
              </div>
              <button
                onClick={openSelectedTopicPractice}
                disabled={!selectedWeakTopic}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="refresh" className="text-lg" />
                Revise Selected Topic
              </button>
            </div>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
                <div className="min-w-0 rounded-[28px] border border-slate-100 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Retention timeline</p><p className="mt-1 text-sm text-slate-500">{selectedWeakTopic ? `Tracking decay for ${selectedWeakTopic.topic} in near real time.` : "Review early, then stretch the interval as recall stabilizes."}</p></div><p className="shrink-0 text-sm font-bold text-secondary">Safe review window: {safeWindow}</p></div>
                  {topicCurveError ? (
                    <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-on-error-container">
                      {topicCurveError}
                    </div>
                  ) : null}
                  {topicCurveLoading && selectedWeakTopicId ? (
                    <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                      Updating selected topic curve...
                    </div>
                  ) : null}
                  {points.length ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                      <svg viewBox="0 0 520 220" className="h-56 w-full" role="img" aria-label="Forgetting curve chart">
                        <defs><linearGradient id="curveFill" x1="0%" x2="0%" y1="0%" y2="100%"><stop offset="0%" stopColor="#712ae2" stopOpacity="0.24" /><stop offset="100%" stopColor="#712ae2" stopOpacity="0.02" /></linearGradient></defs>
                        <line x1="20" y1="20" x2="20" y2="198" stroke="#d6e3ff" strokeWidth="1.5" /><line x1="20" y1="198" x2="500" y2="198" stroke="#d6e3ff" strokeWidth="1.5" />{[60, 100, 140, 180].map((y) => <line key={y} x1="20" y1={y} x2="500" y2={y} stroke="#e5e9eb" strokeDasharray="4 6" />)}
                        <path d={`${buildPath(points)} L 500 198 L 20 198 Z`} fill="url(#curveFill)" /><path d={buildPath(points)} fill="none" stroke="#712ae2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((point, index, arr) => {
                          const x = CHART_LEFT + ((CHART_RIGHT - CHART_LEFT) * index) / Math.max(1, arr.length - 1);
                          const y = retentionToChartY(point.retention);
                          const labelY = clamp(getLabelY(y), CHART_TOP + 8, CHART_BOTTOM - 6);
                          const labelAnchor = y <= CHART_TOP + 28 ? "start" : "middle";
                          return (
                            <g key={point.label}>
                              <circle cx={x} cy={y} r="6" fill="#fff" stroke="#712ae2" strokeWidth="4" />
                              <circle cx={x} cy={y} r="2.5" fill="#712ae2" />
                              <text x={x} y={214} textAnchor="middle" className="fill-slate-400" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em" }}>
                                {point.label}
                              </text>
                              <text
                                x={x}
                                y={labelY}
                                textAnchor={labelAnchor}
                                className="fill-secondary"
                                style={{ fontSize: "10px", fontWeight: 800 }}
                              >
                                {point.retention}%
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      {selectedWeakTopic
                        ? "No topic-specific curve data yet. Once the backend returns points for the selected topic, it will appear here."
                        : "No forgetting-curve data yet. Once reviews are stored, the retention timeline will appear here."}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-4">
                  <div className="rounded-[28px] border border-secondary/10 bg-secondary/5 p-5"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Actionable recommendation</p><h3 className="mt-2 text-lg font-bold text-primary">{recommendations[0] ? "Next best review action" : "No recommendation yet"}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{recommendations[0] ?? "Recommendations will appear once the backend returns spaced-repetition guidance."}</p>{topicCurve?.updatedAt ? <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Last refreshed {new Date(topicCurve.updatedAt).toLocaleTimeString()}</p> : null}</div>
                  <div className="rounded-[28px] border border-slate-100 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Review checkpoints</p><div className="mt-4 space-y-3">{checkpoints.length ? checkpoints.map((checkpoint) => <div key={checkpoint.label} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-primary">{checkpoint.label}</p><p className="mt-0.5 truncate text-xs text-slate-500">{checkpoint.note}</p></div><span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-secondary shadow-sm">{checkpoint.value}</span></div>) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">No checkpoint recommendations yet.</div>}</div></div>
                </div>
              </div>
            </section>

          {error ? <section className="mb-6 rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-on-error-container">{error}</section> : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">{kpiCards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p><p className="mt-2 text-3xl font-black tracking-tight text-primary">{card.value}</p></div><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}><Icon name={card.icon} filled /></div></div><p className={`text-sm font-semibold ${card.accent}`}>{card.delta}</p></article>)}</section>

              <section className="rounded-3xl border border-secondary/10 bg-gradient-to-br from-white to-secondary/5 p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4"><div className="min-w-0"><h2 className="truncate font-headline text-xl font-bold text-primary sm:text-2xl">Retention Insight</h2><p className="mt-1 text-sm text-slate-500">{recommendations[0] ?? "Your strongest recall window is 24 to 48 hours after the first review."}</p></div><span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">AI Suggestion</span></div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(240px,0.9fr)]">
                  <div className="min-w-0"><div className="mb-4 flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Memory retention by interval</p><p className="text-sm text-slate-500">Reinforce weak spans before the drop begins.</p></div><p className="shrink-0 text-sm font-bold text-emerald-600">Live trend</p></div><div className="space-y-3">{points.length ? points.map((point, index) => <div key={`${point.label}-${index}`} className="grid grid-cols-[4rem_minmax(0,1fr)_3rem] items-center gap-3"><span className="text-xs font-bold uppercase tracking-widest text-slate-400">{point.label}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${toCardColor(point.retention)}`} style={{ width: `${clamp(point.retention, 0, 100)}%` }} /></div><span className="text-right text-xs font-bold text-slate-500">{point.retention}%</span></div>) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No retention interval points yet.</div>}</div></div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-5"><div className="mb-4 flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><Icon name="insights" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-primary">Best next move</p><p className="text-xs text-slate-500">Keep the interval short today.</p></div></div><p className="text-sm leading-relaxed text-slate-600">Focus first on chapters marked overdue, then use quick-recall drills for stable topics to keep the memory curve from flattening.</p><button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800">View Retention Timeline</button></div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-headline text-xl font-bold text-primary">Revise Today</h2><p className="text-sm text-slate-500">Priority cards based on current forgetting risk.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{reviseToday.length} Sessions</span></div>
                <div className="space-y-4">{reviseToday.length ? reviseToday.map((item) => <article key={item.id ?? item.title} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-start gap-4"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconTone}`}><Icon name={item.icon} filled /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 truncate text-base font-bold text-primary">{item.title}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${item.riskTone}`}>{item.risk}</span></div><p className="mt-1 truncate text-sm text-slate-500">{item.subtitle}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Level {item.progress}</span><span className={`text-xs font-bold ${item.progressTone}`}>Retention tuned</span></div></div></div><div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end"><button onClick={() => void markReviewed(item)} disabled={reviewingId === item.id} className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-60 ${item.buttonTone}`}>{reviewingId === item.id ? "Saving..." : item.action}</button><button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-slate-50">Later</button></div></article>) : <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500">No revision queue is available yet.</div>}</div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-headline text-xl font-bold text-primary">Recently Mistaken</h2><p className="text-sm text-slate-500">The latest misses are grouped for quick correction.</p></div><button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200">Export</button></div>
                  <div className="overflow-hidden rounded-2xl border border-slate-100"><div className="grid grid-cols-[minmax(0,1fr)_5rem_6rem] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><span>Topic</span><span>Risk</span><span className="text-right">Updated</span></div><div className="divide-y divide-slate-100">{mistakes.length ? mistakes.map((row) => <div key={`${row.subject}-${row.topic}`} className="grid grid-cols-[minmax(0,1fr)_5rem_6rem] gap-3 px-4 py-4"><div className="min-w-0"><p className="truncate text-xs font-black uppercase tracking-widest text-secondary">{row.subject}</p><p className="truncate font-bold text-primary">{row.topic}</p><p className="mt-1 max-h-10 overflow-hidden text-sm leading-relaxed text-slate-500">{row.note}</p></div><div className="flex items-start"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${row.severity === "High" ? "bg-red-100 text-red-700" : row.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{row.severity}</span></div><span className="text-right text-sm font-semibold text-slate-500">{row.time}</span></div>) : <div className="px-4 py-5 text-sm text-slate-500">No recent mistakes yet.</div>}</div></div>
                </article>
                <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-headline text-xl font-bold text-primary">Memory Boost Mode</h2><p className="text-sm text-slate-500">Choose how Lakshay AI should package your review.</p></div><Icon name="auto_awesome" className="text-slate-400" /></div>
                  <div className="space-y-3">{memoryModes.length ? memoryModes.map((mode, index) => <button key={mode.label ?? index} className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors ${index === 0 ? "border-secondary/20 bg-secondary/5" : "border-slate-100 bg-white hover:bg-slate-50"}`}><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${index === 0 ? "bg-secondary text-white" : "bg-slate-100 text-slate-600"}`}><Icon name={mode.icon ?? "bolt"} filled={index === 0} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-bold text-primary">{mode.label ?? "Mode"}</h3>{index === 0 ? <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">Recommended</span> : null}</div><p className="mt-1 text-sm leading-relaxed text-slate-500">{mode.description ?? "No mode description available."}</p></div></button>) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No memory boost modes returned yet.</div>}</div>
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current setting</p><p className="mt-2 text-sm font-semibold text-primary">Fast Recall on, 12-minute cap, weak-topic bias enabled.</p></div>
                </article>
              </section>
            </div>

            <aside className="space-y-6 lg:col-span-4">
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-headline text-xl font-bold text-primary">Spaced Repetition Stats</h2><p className="text-sm text-slate-500">Track how quickly each review interval decays.</p></div><Icon name="stacked_line_chart" filled className="text-secondary" /></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="mb-4 flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Average recall</p><p className="mt-1 text-3xl font-black tracking-tight text-primary">{kpiCards[1].value}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Improving</span></div><div className="space-y-3">{repetitionStats.length ? repetitionStats.map((item) => <div key={item.label} className="flex items-center justify-between gap-3"><span className="min-w-0 truncate text-sm font-semibold text-slate-600">{item.label}</span><span className="shrink-0 text-sm font-bold text-primary">{item.value}</span></div>) : <div className="text-sm text-slate-500">No repetition stats yet.</div>}</div></div>
                <div className="mt-4 space-y-3">{["Today", "Tomorrow", "This week"].map((label, index) => <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"><span className="text-sm font-semibold text-slate-600">{label}</span><span className="text-sm font-bold text-primary">{index === 0 ? `${kpiCards[0].value} due` : index === 1 ? `${Math.max(0, (payload?.kpis?.topicsDue ?? 0) - 1)} due` : `${payload?.kpis?.topicsDue ?? 0} planned`}</span></div>)}</div>
              </section>
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-headline text-xl font-bold text-primary">Weak Topics Priority</h2>
                    <p className="text-sm text-slate-500">Priority-wise list of topics you should revise first.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Live
                  </span>
                </div>
                <div className="space-y-3">
                  {weakTopicPriorityList.length ? (
                    weakTopicPriorityList.map((item, index) => (
                      <button
                        key={item.revisionItemId}
                        type="button"
                        onClick={() => setSelectedWeakTopicId(item.revisionItemId)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-700">
                          {item.priority ?? index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-primary">{item.topic}</p>
                          <p className="truncate text-xs text-slate-500">{item.subject}</p>
                        </div>
                        <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                          {item.risk ?? item.riskLevel ?? "medium"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No weak topics available yet.
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </StudyShell>
  );
}
