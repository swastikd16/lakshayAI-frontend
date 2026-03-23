import { FormEvent, useEffect, useMemo, useState } from "react";
import AdaptivePracticePage from "./pages/AdaptivePracticePage";
import AdaptiveReviewPage from "./pages/AdaptiveReviewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DashboardPage from "./pages/DashboardPage";
import DoubtSolverPage from "./pages/DoubtSolverPage";
import { useAuth } from "./contexts/AuthContext";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage";
import RevisionPage from "./pages/RevisionPage";
import StudyPlannerPage from "./pages/StudyPlannerPage";
import VideoNotesPage from "./pages/VideoNotesPage";

type AuthMode = "signin" | "signup";
type RouteState =
  | { page: "landing" }
  | {
      page: "auth";
      mode: AuthMode;
    }
  | { page: "dashboard" }
  | {
      page: "onboarding";
      revisit?: boolean;
    }
  | { page: "planner" }
  | { page: "adaptive-practice" }
  | { page: "video-notes" }
  | { page: "adaptive-review" }
  | { page: "doubt-solver" }
  | { page: "revision" }
  | { page: "analytics" }
  | { page: "profile" };

const PREVIEW_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDCnniArAlkwtVHKdc1joncZjV0IcvKr_Kyp1xOBeMPfKgJ-dok9BYwcYinU4cyOfRzijbI2fgWzI5LwzYr8mbQ7PdaBSN6yROqmG2gg_vr8sKyNRDck8yJtccJfliyU_8nM1UYm_dNXtFTcGImb7olFJm8zaI-SMjCSx5zB9dp95IKson-4VZ-RAsGxaKYFlo1514hSdU4_yOQNQwvCckAJBoEFv64FshyJ_Otaw6IZDqWdvXXx6uqCEhWyok1RepH6WaIrcXlgHs6";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAo1g6iuuUOLpj4-C67u0zgOlDyBa3CccXwKSQtBvCxes3j0GcLk2xRLwVFbtvyOVLqn2TMVaqsYyikhGG2rNhBIYeH9apIX4ZaOsPlyEsPRh5Sd5dcP1ZrTcDnt7bdi4iRRBLU5GzvcO0sEBILSDQt0FnJfYciEwvemKgQrmavUecJWjboc-Bx27FvztGwFCOKYyrjRP2rOAOfglFNz8MaQJreWSwvW7p6kHb_77PqN7UJDbP_FtuNJXkc6IxaUzsb2u8CqrsDEsDs";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "AI Engine", href: "#ai-engine" },
  { label: "Benefits", href: "#benefits" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" }
];

function parseHash(hash: string): RouteState {
  const normalizedHash = hash.trim().toLowerCase();

  if (normalizedHash.startsWith("#/dashboard")) {
    return { page: "dashboard" };
  }

  if (normalizedHash.startsWith("#/planner")) {
    return { page: "planner" };
  }

  if (normalizedHash.startsWith("#/adaptive-practice")) {
    return { page: "adaptive-practice" };
  }

  if (normalizedHash.startsWith("#/video-notes")) {
    return { page: "video-notes" };
  }

  if (normalizedHash.startsWith("#/adaptive-review")) {
    return { page: "adaptive-review" };
  }

  if (normalizedHash.startsWith("#/doubt-solver")) {
    return { page: "doubt-solver" };
  }

  if (normalizedHash.startsWith("#/revision")) {
    return { page: "revision" };
  }

  if (normalizedHash.startsWith("#/analytics")) {
    return { page: "analytics" };
  }

  if (normalizedHash.startsWith("#/profile")) {
    return { page: "profile" };
  }

  if (normalizedHash.startsWith("#/onboarding/revisit")) {
    return { page: "onboarding", revisit: true };
  }

  if (normalizedHash.startsWith("#/onboarding")) {
    return { page: "onboarding" };
  }

  if (normalizedHash.startsWith("#/auth/signup")) {
    return { page: "auth", mode: "signup" };
  }

  if (normalizedHash.startsWith("#/auth")) {
    return { page: "auth", mode: "signin" };
  }

  return { page: "landing" };
}

function LandingPage({
  onLogin,
  onSignup
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <main className="bg-surface font-body text-on-surface selection:bg-secondary-fixed">
      <nav className="glass-effect fixed top-0 z-50 w-full border-b border-outline-variant/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <span className="font-headline text-xl font-bold tracking-tight text-primary">
              Lakshay AI
            </span>
            <div className="hidden items-center gap-6 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onLogin}
              className="text-sm font-semibold text-primary transition-colors hover:text-secondary"
              type="button"
            >
              Login
            </button>
            <button
              onClick={onSignup}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[0.98] active:scale-95"
              type="button"
            >
              Start Smart Prep
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl overflow-hidden px-8 pb-20 pt-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              The Future of Competitive Exams
            </div>
            <h1 className="font-headline text-5xl font-extrabold leading-[1.1] text-primary lg:text-7xl">
              Your AI Learning Companion for{" "}
              <span className="gradient-text">JEE, NEET, and UPSC</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-on-surface-variant">
              Personalized study plans, adaptive practice, and instant doubt
              solving designed for outcomes. Join 100k+ students hacking their
              way to success.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onSignup}
                type="button"
                className="rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-container"
              >
                Start Smart Prep
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-8 py-4 text-base font-bold text-primary shadow-sm transition-all hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-secondary/20 blur-[100px]" />
            <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
            <div className="relative rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-2xl shadow-editorial">
              <img
                className="w-full rounded-xl"
                alt="Dashboard interface showing student learning progress and AI analytics charts"
                src={HERO_IMAGE}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low px-8 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 font-headline text-3xl font-bold text-primary">
              The Struggles of Aspirants
            </h2>
            <p className="text-on-surface-variant">
              Traditional learning methods are broken. We&apos;ve fixed the gaps
              that hold you back.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <article className="rounded-2xl bg-surface-container-lowest p-8 shadow-editorial transition-transform duration-300 hover:-translate-y-2">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-error/10 text-error">
                <span className="material-symbols-outlined">schedule_send</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-primary">Planning Fatigue</h3>
              <p className="leading-relaxed text-on-surface-variant">
                Stop spending hours making schedules you never follow. Our AI
                generates dynamic plans that adapt to your speed.
              </p>
            </article>
            <article className="rounded-2xl bg-surface-container-lowest p-8 shadow-editorial transition-transform duration-300 hover:-translate-y-2">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-primary">Forgetting Curve</h3>
              <p className="leading-relaxed text-on-surface-variant">
                Don&apos;t let concepts fade away. Our Spaced Repetition Engine
                schedules revisions right when you&apos;re about to forget.
              </p>
            </article>
            <article className="rounded-2xl bg-surface-container-lowest p-8 shadow-editorial transition-transform duration-300 hover:-translate-y-2">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined">question_mark</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-primary">Unresolved Doubts</h3>
              <p className="leading-relaxed text-on-surface-variant">
                No more waiting for the next class. Get step-by-step AI
                explanations for any question, instantly, 24/7.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 py-24" id="features">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-headline text-4xl font-extrabold text-primary">
            Your Intelligent Study Ecosystem
          </h2>
          <p className="mx-auto max-w-xl text-on-surface-variant">
            Everything you need to outperform your peers, powered by
            cutting-edge educational AI.
          </p>
        </div>
        <div className="grid h-auto gap-6 md:h-[800px] md:grid-cols-6 md:grid-rows-2">
          <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-primary-container p-10 text-white md:col-span-3">
            <div className="relative z-10">
              <h3 className="mb-4 text-2xl font-bold">Personalized Planner</h3>
              <p className="text-on-primary-container">
                Smart daily targets that shift based on your performance.
                It&apos;s your personal coach in your pocket.
              </p>
            </div>
            <div className="relative z-10 mt-8 rounded-xl bg-white/10 p-4 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm">Today&apos;s Focus: Organic Chemistry</span>
                <span className="rounded bg-white/20 px-2 py-1 text-xs">
                  85% Ready
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-4/5 bg-secondary" />
              </div>
            </div>
          </article>

          <article className="flex flex-col justify-between overflow-hidden rounded-2xl bg-surface-container-highest p-10 md:col-span-3">
            <div>
              <h3 className="mb-4 text-2xl font-bold text-primary">AI Doubt Solver</h3>
              <p className="text-on-surface-variant">
                Snap a photo and get conceptual breakdowns, not just answers.
              </p>
            </div>
            <div className="mt-8 space-y-3 rounded-xl border border-outline-variant/20 bg-white p-4 shadow-sm">
              <div className="flex gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs text-white">
                  AI
                </div>
                <div className="max-w-[80%] rounded-bl-xl rounded-br-xl rounded-tr-xl bg-surface-container p-3 text-xs">
                  Here&apos;s why the bond angle in NH3 is 107...
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-editorial md:col-span-2">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined">fitness_center</span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-primary">Adaptive Practice</h3>
            <p className="text-sm text-on-surface-variant">
              The more you solve, the smarter it gets at finding your weak
              spots.
            </p>
          </article>
          <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-editorial md:col-span-2">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined">history</span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-primary">Revision Engine</h3>
            <p className="text-sm text-on-surface-variant">
              Automated flashcards and micro-quizzes for long-term memory
              retention.
            </p>
          </article>
          <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-editorial md:col-span-2">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-error/10 text-error">
              <span className="material-symbols-outlined">insights</span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-primary">Progress Analytics</h3>
            <p className="text-sm text-on-surface-variant">
              Heatmaps and percentile predictions for your target exam date.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-surface px-8 py-24" id="how-it-works">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-20 text-center font-headline text-4xl font-extrabold text-primary">
            Your Path to Mastery
          </h2>
          <div className="relative grid gap-8 md:grid-cols-4">
            <div className="absolute left-0 top-1/4 -z-10 hidden h-[2px] w-full bg-outline-variant/20 md:block" />
            <article className="flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-surface bg-white text-2xl font-bold text-primary shadow-xl">
                1
              </div>
              <h3 className="mb-2 text-lg font-bold text-primary">Onboarding</h3>
              <p className="text-sm text-on-surface-variant">
                Set your target exam and assessment date.
              </p>
            </article>
            <article className="flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-surface bg-white text-2xl font-bold text-primary shadow-xl">
                2
              </div>
              <h3 className="mb-2 text-lg font-bold text-primary">Dynamic Plan</h3>
              <p className="text-sm text-on-surface-variant">
                AI generates your optimized study roadmap.
              </p>
            </article>
            <article className="flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-surface bg-white text-2xl font-bold text-primary shadow-xl">
                3
              </div>
              <h3 className="mb-2 text-lg font-bold text-primary">
                Smarter Practice
              </h3>
              <p className="text-sm text-on-surface-variant">
                Master concepts with adaptive IRT algorithms.
              </p>
            </article>
            <article className="flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-secondary text-2xl font-bold text-white shadow-xl">
                4
              </div>
              <h3 className="mb-2 text-lg font-bold text-primary">Mastery</h3>
              <p className="text-sm text-on-surface-variant">
                Review insights and ace your real exam.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-primary-container py-24" id="ai-engine">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-8 lg:grid-cols-2">
          <div className="text-white">
            <h2 className="mb-6 font-headline text-4xl font-extrabold">
              The Tech Behind the Talent
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <span className="material-symbols-outlined text-secondary-fixed">
                    database
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">RAG-Based Solving</h3>
                  <p className="leading-relaxed text-on-primary-container">
                    Retrieval-Augmented Generation ensures our AI never
                    &quot;hallucinates&quot; answers. It pulls directly from a
                    verified academic knowledge base.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <span className="material-symbols-outlined text-secondary-fixed">
                    leaderboard
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">
                    IRT-Adaptive Algorithms
                  </h3>
                  <p className="leading-relaxed text-on-primary-container">
                    Item Response Theory maps your ability in real-time, matching
                    you with questions that are in your &quot;zone of proximal
                    development.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-secondary/30 blur-[120px]" />
            <img
              className="relative z-10 rounded-3xl opacity-80 mix-blend-screen"
              alt="Futuristic visualization of artificial intelligence neural networks and data processing"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBS-M9ddmYHnLLwXGVg-Dqv7jqK8hYbgsYadpuALcWYE6dlFN2onGKjsRCQbM-M62hEE5RNvBgVFd8IPWsDXxHaqO6BcMvp1wHeyxPro8J-MYiUx1dpX_5ixMWwEsU_nJb5X-dBw-NKVuFvICKTiOiUlPVG7M-0gc4UYa7DHuwBOsupbC2sY97XY4rVYGSSaN7dmzdXwSzfuXY06HaVIFCFbYV2HBQV6k-09LeI2H6G-k54_8AFTFcRbIM5Rl4npkhbJ5x1AMMjq41"
            />
          </div>
        </div>
      </section>

      <section className="bg-surface-container py-16" id="benefits">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid grid-cols-1 gap-12 text-center md:grid-cols-3">
            <div>
              <p className="mb-2 font-headline text-5xl font-black text-primary">
                40%
              </p>
              <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                Avg Score Increase
              </p>
            </div>
            <div>
              <p className="mb-2 font-headline text-5xl font-black text-primary">
                12M+
              </p>
              <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                Questions Solved
              </p>
            </div>
            <div>
              <p className="mb-2 font-headline text-5xl font-black text-primary">
                95%
              </p>
              <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                Syllabus Retention
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 py-24" id="testimonials">
        <h2 className="mb-16 text-center font-headline text-4xl font-extrabold text-primary">
          Success Stories
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <article className="relative rounded-3xl border border-outline-variant/10 bg-white p-10 shadow-editorial">
            <span className="absolute right-8 top-8 text-6xl font-serif leading-none text-surface-container opacity-50">
              &ldquo;
            </span>
            <p className="relative z-10 mb-8 text-lg italic text-on-surface-variant">
              &quot;Lakshay completely changed how I look at Chemistry. The AI
              doubt solver felt like having a senior IITian sitting right next to
              me all night.&quot;
            </p>
            <div className="flex items-center gap-4">
              <img
                className="h-14 w-14 rounded-full object-cover"
                alt="Portrait of a successful male student with a confident smile"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCz4WuEAWY0jrtkLPy_yNEs5BTK96G4UqfJga0dJ-XX08qT3Ed7a0M6bzyOzZ-udMbBxNgp7usDrjbMaa_myobpMMnYSM18XKNiJoN7IBIDnGI86AJTIqnJkTq936T9PjNl7aLIWwnjlGIHCQc37FtjUgxGN93aBk32OMl9-UEJgmBzrwdK9NFJj_X0TprkhiPw9tqVLaiNf3_E2YyXkwOH02QTmehrpkn7AgdSqfuEracUVqmrc7OaQ3ekqP7FsMXE_lA_oH3wGaHe"
              />
              <div>
                <h4 className="font-bold text-primary">Rahul Sharma</h4>
                <p className="text-sm font-semibold text-secondary">
                  AIR 142, JEE Advanced
                </p>
              </div>
            </div>
          </article>

          <article className="relative rounded-3xl border border-outline-variant/10 bg-white p-10 shadow-editorial">
            <span className="absolute right-8 top-8 text-6xl font-serif leading-none text-surface-container opacity-50">
              &ldquo;
            </span>
            <p className="relative z-10 mb-8 text-lg italic text-on-surface-variant">
              &quot;The personalized planner kept me disciplined when I was burnout.
              I didn&apos;t have to think about what to study; I just had to
              execute.&quot;
            </p>
            <div className="flex items-center gap-4">
              <img
                className="h-14 w-14 rounded-full object-cover"
                alt="Portrait of a smiling female student expressing achievement"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGEWaFvSTiIOXIzU9e4GTr-JUUmPhzk8dWwL0Reddm14XfEjMgbjE5BDn2YtcsohIHtr4movZa2697d0CKeHCKwrkzehb920gAl_mt_FgPOV54wCs0gVBP0cDvMP4J9dtRDS9mNPTqO4sKulofz_VC4OcTIUvfoh403YtARNQa5PdkAlbxZCq6Rx7Ky2ksHQ95zIMH9xqdlh-RGYMtv0PxoXvBWRWNdJnLcdQEfcQULE3bzI4bsxGcOGLs5HFtRnLjVNPlg_ZGbDqx"
              />
              <div>
                <h4 className="font-bold text-primary">Ananya Iyer</h4>
                <p className="text-sm font-semibold text-secondary">
                  NEET Score: 705/720
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-surface-container-low px-8 py-24" id="pricing">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-headline text-4xl font-extrabold text-primary">
              Invest in Your Future
            </h2>
            <p className="text-on-surface-variant">
              Unlock the full power of Lakshay with our flexible plans.
            </p>
          </div>
          <div className="grid items-end gap-8 md:grid-cols-3">
            <article className="flex h-fit flex-col rounded-2xl border border-outline-variant/30 bg-white p-8">
              <h3 className="mb-2 text-xl font-bold text-primary">Basic</h3>
              <div className="mb-6">
                <span className="text-4xl font-black text-primary">Free</span>
              </div>
              <ul className="mb-8 space-y-4 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-green-500">
                    check_circle
                  </span>
                  10 AI Doubts/Month
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-green-500">
                    check_circle
                  </span>
                  Daily Practice Sets
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-green-500">
                    check_circle
                  </span>
                  Basic Dashboard
                </li>
              </ul>
              <button className="w-full rounded-xl border-2 border-primary py-3 font-bold text-primary transition-colors hover:bg-primary/5">
                Start Free
              </button>
            </article>

            <article className="relative z-10 flex scale-100 flex-col rounded-3xl border-2 border-secondary bg-white p-10 shadow-editorial md:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-bold uppercase text-white">
                Most Popular
              </div>
              <h3 className="mb-2 text-xl font-bold text-primary">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-black text-primary">$19</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="mb-8 space-y-4 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2 font-semibold text-primary">
                  <span className="material-symbols-outlined text-sm text-secondary">
                    verified
                  </span>
                  Unlimited AI Doubts
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-secondary">
                    verified
                  </span>
                  Personalised Adaptive Plan
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-secondary">
                    verified
                  </span>
                  Revision Engine access
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-secondary">
                    verified
                  </span>
                  Detailed Performance Analytics
                </li>
              </ul>
              <button className="w-full rounded-xl bg-secondary py-4 font-bold text-white shadow-lg shadow-secondary/20 transition-all hover:scale-[0.98]">
                Get Pro Now
              </button>
            </article>

            <article className="flex h-fit flex-col rounded-2xl border border-outline-variant/30 bg-white p-8">
              <h3 className="mb-2 text-xl font-bold text-primary">Elite</h3>
              <div className="mb-6">
                <span className="text-4xl font-black text-primary">$49</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="mb-8 space-y-4 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    check_circle
                  </span>
                  All Pro Features
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    check_circle
                  </span>
                  1-on-1 Human Mentorship
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    check_circle
                  </span>
                  Priority Support
                </li>
              </ul>
              <button className="w-full rounded-xl border-2 border-primary py-3 font-bold text-primary transition-colors hover:bg-primary/5">
                Contact Sales
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-8 py-24" id="faq">
        <h2 className="mb-12 text-center font-headline text-3xl font-bold text-primary">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <details className="group rounded-2xl border border-outline-variant/30 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between p-6">
              <span className="font-bold text-primary">
                How accurate is the AI Doubt Solver?
              </span>
              <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="px-6 pb-6 pt-0 leading-relaxed text-on-surface-variant">
              Our AI is built on proprietary RAG (Retrieval-Augmented
              Generation) technology trained specifically on academic textbooks
              and peer-reviewed journals, maintaining a 99% accuracy rate for
              competitive exams.
            </div>
          </details>

          <details className="group rounded-2xl border border-outline-variant/30 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between p-6">
              <span className="font-bold text-primary">
                Which exams do you currently support?
              </span>
              <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="px-6 pb-6 pt-0 leading-relaxed text-on-surface-variant">
              We currently offer comprehensive coverage for JEE (Main &amp;
              Advanced), NEET, UPSC Civil Services, and major SAT subjects.
            </div>
          </details>

          <details className="group rounded-2xl border border-outline-variant/30 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between p-6">
              <span className="font-bold text-primary">
                Can I use it on my mobile phone?
              </span>
              <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="px-6 pb-6 pt-0 leading-relaxed text-on-surface-variant">
              Yes, Lakshay AI is available as a native app on both iOS and
              Android, syncable across all your devices.
            </div>
          </details>
        </div>
      </section>

      <section className="px-8 py-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-primary p-12 text-center md:p-20">
          <div className="absolute right-0 top-0 h-64 w-64 bg-secondary/20 blur-[100px]" />
          <div className="relative z-10">
            <h2 className="mb-6 font-headline text-4xl font-black text-white md:text-5xl">
              Ready to crush your goals?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-on-primary-container">
              Join thousands of students who have already switched to smarter
              learning. Your first 7 days are on us.
            </p>
            <button
              onClick={onSignup}
              type="button"
              className="rounded-2xl bg-secondary px-10 py-5 text-xl font-bold text-white shadow-2xl shadow-secondary/40 transition-all hover:scale-105 active:scale-95"
            >
              Start My Free Trial
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-outline-variant/20 bg-surface-container px-8 py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="mb-6 block font-headline text-xl font-bold text-primary">
              Lakshay AI
            </span>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              &copy; 2024 Lakshay AI. Editorial Learning Excellence. Empowering the
              next generation of engineers, doctors, and leaders.
            </p>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-primary">Product</h4>
            <ul className="space-y-4 text-xs text-on-surface-variant">
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Features
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Pricing
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  AI Engine
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Release Notes
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-primary">Community</h4>
            <ul className="space-y-4 text-xs text-on-surface-variant">
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Student Forum
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Discord Server
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Success Stories
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Ambassadors
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-primary">Legal</h4>
            <ul className="space-y-4 text-xs text-on-surface-variant">
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Terms of Service
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-secondary" href="#">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}

function AuthPage({
  mode,
  onModeChange,
  onBackToLanding,
  onSignIn,
  onSignUp,
  authBusy
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onBackToLanding: () => void;
  onSignIn: (payload: { email: string; password: string }) => Promise<unknown>;
  onSignUp: (payload: { email: string; password: string; fullName?: string }) => Promise<unknown>;
  authBusy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  const title = useMemo(
    () => (mode === "signin" ? "Welcome Back" : "Create Your Account"),
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === "signin"
        ? "Sign in to continue your learning journey."
        : "Sign up with email to start your AI-powered prep.",
    [mode]
  );

  const resetMessages = () => setStatus(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!email.trim() || !password.trim()) {
      setStatus({ type: "error", text: "Please enter both email and password." });
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "signin") {
        await onSignIn({
          email: email.trim(),
          password
        });
        setStatus({
          type: "success",
          text: "Signed in successfully."
        });
        return;
      }

      if (password.length < 6) {
        setStatus({ type: "error", text: "Password must be at least 6 characters." });
        return;
      }

      await onSignUp({
        email: email.trim(),
        password
      });
      setStatus({
        type: "success",
        text: "Account created successfully."
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Authentication failed. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface font-body text-on-surface md:flex-row">
      <section className="bg-auth-gradient relative hidden overflow-hidden p-12 md:flex md:w-1/2 md:flex-col md:justify-between lg:p-16">
        <div className="z-10">
          <button
            type="button"
            onClick={onBackToLanding}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Home
          </button>

          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary shadow-lg shadow-secondary/20">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </div>
            <span className="font-headline text-2xl font-extrabold tracking-tight text-white">
              Lakshay AI
            </span>
          </div>
          <h1 className="mb-4 max-w-md font-headline text-4xl font-bold leading-tight text-white lg:text-5xl">
            Your AI Learning Companion
          </h1>
          <p className="max-w-md text-lg font-light leading-relaxed text-on-primary-container">
            Master competitive exams with personalized AI roadmaps, instant doubt solving, and
            predictive analytics.
          </p>
        </div>

        <div className="relative z-10 mt-12 translate-x-12 translate-y-12 transform">
          <div className="-rotate-2 rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
            <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-inner">
              <img
                alt="Lakshay AI student dashboard mockup"
                className="h-auto w-full object-cover opacity-90"
                src={PREVIEW_IMAGE}
              />
            </div>
          </div>

          <div className="absolute -left-6 -top-6 flex max-w-xs items-center gap-4 rounded-2xl border border-white/20 bg-white/90 p-6 shadow-2xl backdrop-blur-md">
            <div className="rounded-lg bg-secondary/10 p-2">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                insights
              </span>
            </div>
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-widest text-primary">
                Live Analysis
              </p>
              <p className="text-sm font-medium text-on-surface-variant">
                Retention increased by 42% this week.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-0">
          <div className="absolute -right-[10%] -top-[10%] h-96 w-96 rounded-full bg-secondary/20 blur-[120px]" />
          <div className="absolute -bottom-[5%] -left-[5%] h-64 w-64 rounded-full bg-primary-fixed-dim/10 blur-[100px]" />
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center bg-surface p-6 md:p-12 lg:p-20">
        <button
          type="button"
          onClick={onBackToLanding}
          className="mb-8 self-start text-sm font-semibold text-primary hover:text-secondary md:hidden"
        >
          <span className="mr-1 material-symbols-outlined align-[-3px] text-base">arrow_back</span>
          Back to Home
        </button>

        <div className="mb-12 flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <span
              className="material-symbols-outlined text-sm text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <span className="font-headline text-xl font-extrabold tracking-tight text-primary">
            Lakshay AI
          </span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10 text-left">
            <h2 className="mb-2 font-headline text-3xl font-bold text-primary">{title}</h2>
            <p className="text-on-surface-variant">{subtitle}</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="ml-1 text-xs font-headline font-bold uppercase tracking-wider text-primary"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-outline">
                  mail
                </span>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(event) => {
                    resetMessages();
                    setEmail(event.target.value);
                  }}
                  className="w-full rounded-xl border-0 bg-surface-container-low py-4 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-outline/50 focus:ring-2 focus:ring-secondary"
                  placeholder={mode === "signin" ? "admin" : "name@example.com"}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label
                  className="text-xs font-headline font-bold uppercase tracking-wider text-primary"
                  htmlFor="password"
                >
                  Password
                </label>
                {mode === "signin" ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    Forgot Password?
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-outline">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    resetMessages();
                    setPassword(event.target.value);
                  }}
                  className="w-full rounded-xl border-0 bg-surface-container-low py-4 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-outline/50 focus:ring-2 focus:ring-secondary"
                  placeholder="*****"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
              />
              <label
                htmlFor="remember"
                className="cursor-pointer select-none text-sm font-medium text-on-surface-variant"
              >
                {mode === "signin" ? "Stay signed in for 30 days" : "Send product updates by email"}
              </label>
            </div>

            {status ? (
              <p
                className={`rounded-xl px-3 py-2 text-sm ${
                  status.type === "error"
                    ? "border border-error/20 bg-error/10 text-on-error-container"
                    : "border border-green-500/20 bg-green-500/10 text-green-700"
                }`}
              >
                {status.text}
              </p>
            ) : null}

            <button
              className="w-full rounded-xl bg-primary py-4 font-headline font-bold text-on-primary shadow-lg shadow-primary/10 transition-all duration-300 active:scale-[0.98] hover:bg-primary-container"
              type="submit"
              disabled={authBusy || submitting}
            >
              {authBusy || submitting ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-10 text-center">
            {mode === "signin" ? (
              <p className="text-sm font-medium text-on-surface-variant">
                Don&apos;t have an account?
                <button
                  type="button"
                  onClick={() => {
                    onModeChange("signup");
                    resetMessages();
                  }}
                  className="ml-1 font-bold text-secondary hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-sm font-medium text-on-surface-variant">
                Already have an account?
                <button
                  type="button"
                  onClick={() => {
                    onModeChange("signin");
                    resetMessages();
                  }}
                  className="ml-1 font-bold text-secondary hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-12 md:pt-0">
          <p className="max-w-xs text-center text-[10px] leading-relaxed text-outline">
            By continuing, you agree to Lakshay AI&apos;s <a href="#" className="underline">Terms of Service</a>{" "}
            and <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parseHash(window.location.hash));
  const { status: authStatus, accessToken, user, signIn, signUp } = useAuth();

  const hasSession = Boolean(accessToken);
  const hasOnboarded = Boolean(user?.targetExam);
  const onboardingRevisit = route.page === "onboarding" ? Boolean(route.revisit) : false;
  const isProtectedRoute =
    route.page === "onboarding" ||
    route.page === "dashboard" ||
    route.page === "planner" ||
    route.page === "adaptive-practice" ||
    route.page === "video-notes" ||
    route.page === "adaptive-review" ||
    route.page === "doubt-solver" ||
    route.page === "revision" ||
    route.page === "analytics" ||
    route.page === "profile";

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (authStatus !== "ready") {
      return;
    }

    if (isProtectedRoute && !hasSession) {
      window.location.hash = "#/auth/signin";
      return;
    }

    if (hasSession && route.page === "auth") {
      window.location.hash = hasOnboarded ? "#/dashboard" : "#/onboarding";
      return;
    }

    if (hasSession && hasOnboarded && route.page === "onboarding" && !onboardingRevisit) {
      window.location.hash = "#/dashboard";
    }
  }, [authStatus, hasOnboarded, hasSession, isProtectedRoute, onboardingRevisit, route.page]);

  const navigateToAuth = (mode: AuthMode) => {
    window.location.hash = `#/auth/${mode}`;
  };

  const navigateToLanding = () => {
    window.location.hash = "#/";
  };

  const navigateToOnboarding = () => {
    window.location.hash = "#/onboarding";
  };

  const navigateToOnboardingRevisit = () => {
    window.location.hash = "#/onboarding/revisit";
  };

  const navigateToPlanner = () => {
    window.location.hash = "#/planner";
  };

  if (authStatus === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface font-body text-on-surface">
        <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-white px-4 py-3 shadow-sm">
          <span className="material-symbols-outlined animate-spin text-secondary">progress_activity</span>
          <span className="text-sm font-semibold text-primary">Restoring session...</span>
        </div>
      </main>
    );
  }

  if (route.page === "auth") {
    return (
      <AuthPage
        mode={route.mode}
        onModeChange={navigateToAuth}
        onBackToLanding={navigateToLanding}
        onSignIn={signIn}
        onSignUp={signUp}
        authBusy={false}
      />
    );
  }

  if (route.page === "onboarding") {
    return (
      <OnboardingPage
        onContinue={route.revisit ? () => (window.location.hash = "#/dashboard") : navigateToPlanner}
        revisitMode={Boolean(route.revisit)}
      />
    );
  }

  if (route.page === "dashboard") {
    return <DashboardPage onCompleteOnboarding={navigateToOnboardingRevisit} />;
  }

  if (route.page === "planner") {
    return <StudyPlannerPage />;
  }

  if (route.page === "adaptive-practice") {
    return <AdaptivePracticePage />;
  }

  if (route.page === "video-notes") {
    return <VideoNotesPage />;
  }

  if (route.page === "adaptive-review") {
    return <AdaptiveReviewPage />;
  }

  if (route.page === "doubt-solver") {
    return <DoubtSolverPage />;
  }

  if (route.page === "revision") {
    return <RevisionPage />;
  }

  if (route.page === "analytics") {
    return <AnalyticsPage />;
  }

  if (route.page === "profile") {
    return <ProfilePage />;
  }

  return <LandingPage onLogin={() => navigateToAuth("signin")} onSignup={() => navigateToAuth("signup")} />;
}

