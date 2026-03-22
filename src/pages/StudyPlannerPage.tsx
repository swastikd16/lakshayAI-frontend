import { useEffect, useMemo, useState } from "react";
import { get, post } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import StudyShell from "../components/StudyShell";

type PlannerWeekDay = {
  day: string;
  date: string;
  active?: boolean;
};

type PlannerItem = {
  id?: string;
  startsAt?: string;
  endsAt?: string;
  subject?: string;
  topic?: string;
  type?: string;
  source?: string;
  notes?: string | null;
};

type PlannerWeakTopic = {
  id?: string;
  icon?: string;
  title?: string;
  severity?: string;
  copy?: string;
  score?: number;
};

type PlannerWeekDto = {
  weekStartDate?: string;
  weekLabel?: string;
  weekDays?: PlannerWeekDay[];
  items?: PlannerItem[];
  weakTopics?: PlannerWeakTopic[];
  focusMessage?: string;
};

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + mondayOffset);
  current.setHours(0, 0, 0, 0);
  return current;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildWeekDays(weekStart: Date): PlannerWeekDay[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const today = new Date();
    const active =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    return {
      day,
      date: String(date.getDate()),
      active
    };
  });
}

function toMinutes(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function hourLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(normalized).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
}

function getTimeLabels() {
  return Array.from({ length: 10 }, (_, index) => hourLabel((8 + index) * 60));
}

function getPlannerTone(type?: string) {
  const normalized = (type ?? "").toLowerCase();
  if (normalized.includes("revision")) {
    return {
      titleClass: "text-secondary",
      cardClass: "border-secondary/20 bg-secondary/5",
      borderClass: "border-l-4 border-secondary"
    };
  }
  if (normalized.includes("test")) {
    return {
      titleClass: "text-primary",
      cardClass: "border-primary/20 bg-primary/5",
      borderClass: "border-l-4 border-primary"
    };
  }
  return {
    titleClass: "text-blue-700",
    cardClass: "border-blue-200 bg-blue-50/80",
    borderClass: "border-l-4 border-blue-500"
  };
}

function getRandomLane(dayIndex: number) {
  return Math.min(6, Math.max(0, dayIndex));
}

function buildPlanBlocks(items: PlannerItem[], weekStart: Date) {
  return items
    .map((item, index) => {
      const startDate = item.startsAt ? new Date(item.startsAt) : null;
      const endDate = item.endsAt ? new Date(item.endsAt) : null;
      if (!startDate || Number.isNaN(startDate.getTime())) {
        return null;
      }

      const dayIndex = Math.max(0, Math.min(6, Math.floor((startDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      const endMinutes = endDate && !Number.isNaN(endDate.getTime()) ? endDate.getHours() * 60 + endDate.getMinutes() : startMinutes + 60;
      const rowStart = Math.max(1, Math.round((startMinutes - 480) / 60) + 1);
      const duration = Math.max(1, Math.round(Math.max(30, endMinutes - startMinutes) / 60));
      const gridDay = getRandomLane(dayIndex) + 1;
      const tone = getPlannerTone(item.type);

      return {
        id: item.id ?? `${item.subject}-${index}`,
        dayIndex,
        gridDay,
        rowStart: Math.max(1, Math.min(10, rowStart)),
        rowSpan: Math.min(3, duration),
        subject: item.subject ?? "Study",
        topic: item.topic ?? "Untitled block",
        notes: item.notes ?? item.source ?? "Scheduled by backend",
        tone
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    dayIndex: number;
    gridDay: number;
    rowStart: number;
    rowSpan: number;
    subject: string;
    topic: string;
    notes: string;
    tone: ReturnType<typeof getPlannerTone>;
  }>;
}

export default function StudyPlannerPage() {
  const { accessToken } = useAuth();
  const [week, setWeek] = useState<PlannerWeekDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekStart = useMemo(() => getWeekStart(), []);

  const loadWeek = async () => {
    if (!accessToken) {
      setLoading(false);
      setError("Sign in to load your study plan.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await get<PlannerWeekDto>(`/planner/week?start=${toIsoDate(weekStart)}`, accessToken);
      setWeek(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your study plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWeek();
  }, [accessToken]);

  const weekDays = week?.weekDays?.length ? week.weekDays : buildWeekDays(weekStart);
  const planBlocks = useMemo(() => buildPlanBlocks(week?.items ?? [], weekStart), [week, weekStart]);
  const timeLabels = useMemo(() => getTimeLabels(), []);
  const weakTopics = week?.weakTopics ?? [];
  const focusMessage = week?.focusMessage ?? "No data available.";

  const handleRegenerate = async () => {
    if (!accessToken) {
      setError("Sign in to regenerate your study plan.");
      return;
    }

    setRegenerating(true);
    setError(null);
    try {
      await post("/planner/regenerate", { start: toIsoDate(weekStart) }, accessToken);
      await loadWeek();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to regenerate plan.");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <StudyShell activePage="planner">
      <main className="min-h-screen pb-24 md:ml-64 md:pb-12">
        <header className="flex flex-col gap-4 px-6 py-6 md:px-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="min-w-0 truncate font-headline text-2xl font-extrabold tracking-tight text-primary">
                Your AI-Optimized Prep Plan
              </h1>
              <span className="animate-pulse-soft rounded-full border border-secondary/20 bg-secondary/10 px-2 py-0.5 text-[10px] font-black uppercase text-secondary">
                Auto-Rebalanced Plan
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <span className="material-symbols-outlined text-base text-secondary">verified</span>
              Plan adjusted based on your latest quiz performance.
            </p>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0">
            <button className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-surface-container">
              <span className="material-symbols-outlined text-lg">tune</span>
              Edit Hours
            </button>
            <button className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-surface-container">
              <span className="material-symbols-outlined text-lg text-secondary">bolt</span>
              Optimize
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-secondary px-5 py-2 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-lg ${regenerating ? "animate-spin" : ""}`}>refresh</span>
              {regenerating ? "Regenerating" : "Regenerate"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="mx-6 mb-6 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-on-error-container md:mx-12">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-8 px-6 md:px-12 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <div className="flex items-center justify-between rounded-2xl border border-outline-variant/5 bg-surface-container-lowest p-2 shadow-[0_4px_20px_rgba(0,32,69,0.02)]">
              <button className="rounded-lg p-2 transition-colors hover:bg-surface-container">
                <span className="material-symbols-outlined text-slate-400">chevron_left</span>
              </button>
              <div className="flex items-center gap-2 md:gap-4">
                <button className="rounded-lg border border-secondary/10 bg-secondary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Weekly
                </button>
                <button className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-primary">
                  Monthly
                </button>
              </div>
              <span className="font-headline text-sm font-bold text-primary md:text-base">
                {week?.weekLabel ?? `${formatDateLabel(weekStart)} - ${formatDateLabel(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}`}
              </span>
              <button className="rounded-lg p-2 transition-colors hover:bg-surface-container">
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-[0_8px_32px_rgba(0,32,69,0.03)]">
                <div className="h-[620px] animate-pulse rounded-2xl bg-surface-container" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-[0_8px_32px_rgba(0,32,69,0.03)]">
                <div className="grid grid-cols-8 border-b border-outline-variant/10 bg-surface-container-low/30">
                  <div className="border-r border-outline-variant/10 p-4" />
                  {weekDays.map((day) => (
                    <div
                      key={`${day.day}-${day.date}`}
                      className={`border-r border-outline-variant/10 p-4 text-center last:border-r-0 ${day.active ? "bg-secondary/5" : ""}`}
                    >
                      <p className={`text-[9px] font-bold uppercase ${day.active ? "text-secondary" : "text-slate-400"}`}>
                        {day.day}
                      </p>
                      <p className={`font-headline text-base font-black ${day.active ? "text-secondary" : "text-primary"}`}>
                        {day.date}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="relative h-[500px] overflow-y-auto bg-white custom-scrollbar">
                  <div className="grid h-[800px] grid-cols-8">
                    <div className="sticky left-0 z-10 col-span-1 border-r border-outline-variant/5 bg-surface-container-lowest">
                      {timeLabels.map((time) => (
                        <div key={time} className="h-20 border-b border-outline-variant/5 px-2 py-1 text-right text-[9px] font-bold text-slate-400">
                          {time}
                        </div>
                      ))}
                    </div>

                    <div className="relative col-span-7 grid grid-cols-7">
                      <div className="pointer-events-none absolute inset-0 grid grid-rows-10">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="border-b border-outline-variant/5" />
                        ))}
                      </div>

                      {planBlocks.length ? (
                        planBlocks.map((block) => (
                          <div
                            key={block.id}
                            className={`absolute rounded-r-lg p-2 shadow-sm ${block.tone.cardClass} ${block.tone.borderClass}`}
                            style={{
                              left: `${(block.dayIndex / 7) * 100}%`,
                              width: `${100 / 7 - 1.2}%`,
                              top: `${(block.rowStart - 1) * 80 + 20}px`,
                              height: `${block.rowSpan * 80 - 12}px`
                            }}
                          >
                            <p className={`text-[9px] font-black uppercase ${block.tone.titleClass}`}>{block.subject}</p>
                            <p className="break-words text-xs font-bold leading-tight text-primary">{block.topic}</p>
                            <p className="mt-2 text-[8px] font-semibold italic text-slate-500">{block.notes}</p>
                          </div>
                        ))
                      ) : (
                        <div className="absolute left-[12%] top-[120px] rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low p-6 text-sm text-slate-500">
                          No data available.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 xl:col-span-4">
            <section className="rounded-[24px] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(0,32,69,0.04)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-headline text-lg font-bold text-primary">Weak Topic Focus</h2>
                <span className="rounded-lg bg-secondary/5 px-2 py-1 text-[9px] font-black uppercase text-secondary">Prioritized</span>
              </div>

              <div className="space-y-6">
                {weakTopics.length ? (
                  weakTopics.map((topic, index) => (
                    <div key={topic.id ?? `${topic.title}-${index}`} className="flex gap-4 rounded-2xl border border-red-100 bg-red-50/50 p-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-error/20 bg-white shadow-sm">
                        <span className="material-symbols-outlined text-error">{topic.icon ?? "priority_high"}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <h3 className="truncate text-sm font-bold text-primary">{topic.title ?? "No data available"}</h3>
                          <span className="text-[9px] font-black uppercase text-error">{topic.severity ?? "No data available"}</span>
                        </div>
                        <p className="mb-3 text-[11px] leading-relaxed text-slate-500">{topic.copy ?? "No data available."}</p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                          <div className="h-full w-[42%] bg-error" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-5 text-sm text-slate-500">
                    No data available.
                  </div>
                )}
              </div>

              <button className="mt-6 w-full rounded-xl border border-secondary/20 py-3 text-xs font-bold uppercase tracking-widest text-secondary transition-all hover:bg-secondary/5">
                Full Weakness Map
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
                  {focusMessage || "No data available."}
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
      </main>
    </StudyShell>
  );
}
