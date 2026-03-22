import { useEffect, useMemo, useState } from "react";
import StudyShell from "../components/StudyShell";
import { useAuth } from "../contexts/AuthContext";
import { get } from "../lib/apiClient";

type SubjectCard = {
  label: string;
  status: string;
  score: number;
  icon: string;
  barClass: string;
};

type WeakTopic = {
  index: string;
  title: string;
  detail?: string;
};

type PerformanceBar = {
  label: string;
  performance: number;
  confidence: number;
};

type SnapshotCard = {
  label: string;
  value: string;
};

type ProfileSnapshot = {
  fullName?: string;
  targetExam?: string;
  masteryCards?: SubjectCard[];
  weakTopics?: WeakTopic[];
  performanceBars?: PerformanceBar[];
  masteryAverage?: number;
  conceptRecall?: string;
  problemSpeed?: string;
  insight?: string;
  recommendedFocus?: string;
  snapshotCards?: SnapshotCard[];
  footerNote?: string;
  stats?: {
    totalLearners?: string;
    updatedAt?: string;
  };
};

function Icon({ name, className = "", filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined shrink-0 ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export default function ProfilePage() {
  const { accessToken, user, signOut } = useAuth();
  const [payload, setPayload] = useState<ProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!accessToken) {
        if (alive) {
          setPayload(null);
          setError("Sign in to view your profile.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await get<ProfileSnapshot>("/profile/snapshot", accessToken);
        if (alive) setPayload(data);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load profile snapshot.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [accessToken]);

  const fullName = payload?.fullName ?? user?.fullName ?? "Your Learning Profile";
  const targetExam = payload?.targetExam ?? user?.targetExam ?? "Target Exam";
  const studyPlanHref = "#/planner";
  const dashboardHref = "#/dashboard";
  const aiInsight = payload?.insight ?? null;
  const recommendedFocus = payload?.recommendedFocus ?? null;
  const masteryAverage = payload?.masteryAverage;
  const conceptRecall = payload?.conceptRecall;
  const problemSpeed = payload?.problemSpeed;
  const footerNote = payload?.footerNote ?? "Empowering the next generation of scholars with personalized AI learning paths.";
  const totalLearners = payload?.stats?.totalLearners ?? "No cohort data yet";
  const updatedAt = payload?.stats?.updatedAt ?? "Live sync pending";

  const subjectCards = payload?.masteryCards ?? [];
  const weakTopics = payload?.weakTopics ?? [];
  const performanceBars = payload?.performanceBars ?? [];
  const snapshotCards = payload?.snapshotCards ?? [];
  const hasProfile = Boolean(
    subjectCards.length ||
      weakTopics.length ||
      performanceBars.length ||
      snapshotCards.length ||
      masteryAverage !== undefined ||
      conceptRecall ||
      problemSpeed ||
      aiInsight ||
      recommendedFocus
  );

  const footerGroups = useMemo(
    () => [
      { title: "Product", items: ["Adaptive Learning", "Mock Tests", "Expert Tutoring"] },
      { title: "Company", items: ["About Us", "Careers", "Contact"] },
      { title: "Support", items: ["Privacy Policy", "Terms of Service"] }
    ],
    []
  );

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await signOut();
      window.location.hash = "#/auth/signin";
    } catch {
      // silent fail for v1 test flow
      window.location.hash = "#/auth/signin";
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <StudyShell activePage="profile">
      <main className="min-h-screen pb-24 md:ml-64 md:pb-12">
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 max-w-3xl">
              <h1 className="font-headline text-4xl font-extrabold leading-tight tracking-tight text-primary sm:text-5xl">{fullName}</h1>
              <p className="mt-4 max-w-2xl text-lg font-medium text-on-surface-variant">We&apos;ve analyzed your strengths and weak areas from the diagnostic test.</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-secondary">{targetExam}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="rounded-xl border border-outline-variant/30 bg-white px-6 py-3 font-bold text-primary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
              <a
                href={studyPlanHref}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-3 font-bold text-primary transition-colors hover:bg-surface-container-low"
              >
                View My Study Plan
              </a>
              <a
                href={dashboardHref}
                className="rounded-xl bg-secondary px-6 py-3 font-bold text-white shadow-xl shadow-secondary/30 transition-all hover:translate-y-[-2px]"
              >
                Go to Dashboard
              </a>
            </div>
          </header>

          {loading ? <div className="rounded-3xl border border-slate-100 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading profile snapshot...</div> : null}
          {error ? <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-on-error-container">{error}</div> : null}

          {!loading && !error && !hasProfile ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-white p-8 text-sm text-slate-500 shadow-sm">
              No profile snapshot is available yet. Complete onboarding and practice sessions to generate your learning profile.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-8">
              {subjectCards.length ? (
                subjectCards.map((card) => (
                  <article
                    key={card.label}
                    className="group flex min-h-[310px] flex-col justify-between rounded-2xl bg-surface-container-lowest p-6 shadow-sm transition-colors duration-500 hover:bg-primary"
                  >
                    <div>
                      <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-white/20 group-hover:text-white">
                        <Icon name={card.icon} className="text-[20px]" />
                      </span>
                      <h3 className="mt-4 text-xl font-bold text-primary transition-colors group-hover:text-white">{card.label}</h3>
                      <p className={`text-sm font-medium ${card.label === "Chemistry" ? "text-error" : "text-secondary"} transition-colors group-hover:text-secondary-fixed-dim`}>
                        {card.status}
                      </p>
                    </div>
                    <div className="mt-8">
                      <div className="mb-2 flex items-end justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors group-hover:text-white/60">Mastery</span>
                        <span className="text-2xl font-black text-primary transition-colors group-hover:text-white">{card.score}%</span>
                      </div>
                      <ProgressBar value={card.score} tone={card.barClass} />
                    </div>
                  </article>
                ))
              ) : (
                <div className="sm:col-span-3 rounded-2xl border border-dashed border-outline-variant/20 bg-white p-6 text-sm text-slate-500">
                  No subject mastery cards yet.
                </div>
              )}
            </div>

            <aside className="relative flex min-w-0 flex-col justify-between rounded-2xl bg-primary-container p-8 text-white shadow-[0_20px_60px_rgba(26,54,93,0.22)] md:col-span-4">
              <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 opacity-20">
                <Icon name="auto_awesome" className="text-[64px] text-secondary" filled />
              </div>
              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-2">
                  <Icon name="auto_awesome" className="text-secondary" filled />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-primary-container">AI Strategic Insight</span>
                </div>
                <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
                  &quot;{aiInsight ?? "No strategic insight is available yet. Continue practice to unlock this panel."}&quot;
                </p>
              </div>
              <div className="relative z-10 mt-8 rounded-xl border border-white/10 bg-white/20 p-4 backdrop-blur">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/60">Recommended Focus</p>
                <p className="text-base font-bold text-secondary-fixed">{recommendedFocus ?? "No recommended focus yet"}</p>
              </div>
            </aside>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm md:col-span-7">
              <div className="mb-10 flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-primary">Confidence vs Performance</h2>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-secondary" />
                    <span className="text-xs font-medium text-on-surface-variant">Performance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-outline-variant" />
                    <span className="text-xs font-medium text-on-surface-variant">Confidence</span>
                  </div>
                </div>
              </div>
              {performanceBars.length ? (
                <div className="grid grid-cols-5 items-end gap-4 px-2 sm:px-4">
                  {performanceBars.map((bar) => (
                    <div key={bar.label} className="flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-64 w-full items-end justify-center gap-1">
                        <div className="w-3 rounded-full bg-secondary/40" style={{ height: `${Math.max(10, bar.performance)}%` }} />
                        <div className="w-3 rounded-full bg-secondary" style={{ height: `${Math.max(10, bar.confidence)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-on-surface-variant">{bar.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-slate-50 p-6 text-sm text-slate-500">
                  No performance chart data yet.
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm md:col-span-5">
              <div className="mb-8 flex items-center gap-3">
                <Icon name="priority_high" className="text-error" />
                <h2 className="text-xl font-bold text-primary">Weak Topics Detected</h2>
              </div>

              <div className="space-y-4">
                {weakTopics.length ? (
                  weakTopics.map((topic) => (
                    <div key={topic.index} className="flex items-center justify-between rounded-xl bg-surface-container-low p-4 transition-colors hover:bg-error-container/20">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-error">{topic.index}</div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-primary">{topic.title}</p>
                          {topic.detail ? <p className="truncate text-xs text-slate-500">{topic.detail}</p> : null}
                        </div>
                      </div>
                      <Icon name="arrow_forward_ios" className="text-outline-variant" />
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-outline-variant/30 p-5 text-sm text-slate-500">No weak topics have been generated yet.</div>
                )}
              </div>

              <div className="mt-8 flex items-center gap-4 rounded-2xl border-2 border-dashed border-outline-variant/30 p-4 opacity-70">
                <Icon name="lightbulb" className="text-primary" />
                <p className="text-xs font-medium text-on-surface-variant">Focused revision in these 3 areas can boost your predicted rank by 15%.</p>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm md:col-span-6">
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 192 192" aria-hidden="true">
                    <circle cx="96" cy="96" r="80" fill="transparent" className="text-surface-container" stroke="currentColor" strokeWidth="12" />
                    <circle cx="96" cy="96" r="80" fill="transparent" className="text-secondary" stroke="currentColor" strokeDasharray="502" strokeDashoffset="150" strokeLinecap="round" strokeWidth="12" />
                    <circle cx="96" cy="96" r="60" fill="transparent" className="text-primary" stroke="currentColor" strokeDasharray="377" strokeDashoffset="120" strokeLinecap="round" strokeWidth="12" />
                    <circle cx="96" cy="96" r="40" fill="transparent" className="text-tertiary-container" stroke="currentColor" strokeDasharray="251" strokeDashoffset="180" strokeLinecap="round" strokeWidth="12" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-primary">{masteryAverage !== undefined ? `${masteryAverage}%` : "—"}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Mastery</span>
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div>
                    <h2 className="mb-2 font-headline text-2xl font-black text-primary">Mastery Snapshot</h2>
                    <p className="max-w-md text-sm font-medium text-on-surface-variant">Your current distribution across the curriculum core syllabus.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {snapshotCards.length ? (
                      snapshotCards.map((card) => (
                        <div key={card.label} className="rounded-xl bg-surface-container p-4">
                          <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">{card.label}</p>
                          <p className="text-lg font-black text-primary">{card.value}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="rounded-xl bg-surface-container p-4">
                          <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">Concept Recall</p>
                          <p className="text-lg font-black text-primary">{conceptRecall ?? "—"}</p>
                        </div>
                        <div className="rounded-xl bg-surface-container p-4">
                          <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">Problem Speed</p>
                          <p className="text-lg font-black text-primary">{problemSpeed ?? "—"}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-[0_20px_60px_rgba(0,32,69,0.24)] md:col-span-6">
              <div className="absolute bottom-0 right-0 opacity-10">
                <Icon name="account_circle" className="text-[160px]" filled />
              </div>
              <div className="relative z-10 max-w-md">
                <h2 className="mb-4 text-2xl font-bold">Complete your Profile</h2>
                <p className="mb-8 max-w-lg text-primary-fixed-dim">Add your target colleges and preferred study times to further refine your AI-driven learning path.</p>
                <div className="flex flex-wrap items-center gap-4">
                  <a href="#/onboarding" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary">
                    Update Profile
                  </a>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-3">
                      <div className="h-8 w-8 rounded-full border-2 border-primary bg-amber-200" />
                      <div className="h-8 w-8 rounded-full border-2 border-primary bg-white/80" />
                    </div>
                    <span className="text-xs font-bold text-primary-fixed-dim">{totalLearners}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <footer className="rounded-2xl border-t border-[#EBEEF0] bg-[#F7FAFC] px-0 py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="col-span-2 md:col-span-1">
                <span className="mb-4 block font-headline text-xl font-bold text-primary">Lakshay AI</span>
                <p className="max-w-[220px] text-xs leading-relaxed text-slate-500">{footerNote}</p>
              </div>
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">{group.title}</h3>
                  <ul className="space-y-2 text-xs text-slate-500">
                    {group.items.map((item) => (
                      <li key={item}>
                        <a className="underline-offset-4 hover:text-primary hover:underline" href="#">
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row">
              <p className="text-xs font-medium text-slate-500">© 2024 Lakshay AI. Editorial Learning Excellence.</p>
              <div className="flex gap-6 text-slate-400">
                <Icon name="volume_up" className="cursor-pointer transition-colors hover:text-primary" />
                <Icon name="public" className="cursor-pointer transition-colors hover:text-primary" />
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">{updatedAt}</p>
          </footer>
        </section>
      </main>
    </StudyShell>
  );
}
