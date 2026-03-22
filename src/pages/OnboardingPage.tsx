import { useMemo, useState } from "react";
import { post } from "../lib/apiClient";
import type {
  OnboardingPayloadDto,
  OnboardingResponseDto
} from "../lib/apiTypes";
import { useAuth } from "../contexts/AuthContext";

type ExamId = "jee" | "neet" | "upsc";
type SubjectId = "physics" | "chemistry" | "mathematics";

type OnboardingPageProps = {
  onContinue: () => void;
};

const exams: Array<{
  id: ExamId;
  name: string;
  track: string;
  icon: string;
}> = [
  { id: "jee", name: "JEE Main", track: "Engineering", icon: "architecture" },
  { id: "neet", name: "NEET UG", track: "Medical", icon: "medical_services" },
  { id: "upsc", name: "UPSC CSE", track: "Civil Services", icon: "account_balance" }
];

const subjects: Array<{ id: SubjectId; name: string; icon: string }> = [
  { id: "physics", name: "Physics", icon: "bolt" },
  { id: "chemistry", name: "Chemistry", icon: "science" },
  { id: "mathematics", name: "Mathematics", icon: "functions" }
];

const confidenceEmojis = ["😟", "😐", "😊", "🚀"];

function SubjectRow({
  name,
  icon,
  value,
  onChange
}: {
  name: string;
  icon: string;
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-container-lowest p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-white">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <span className="font-headline text-xl font-bold text-primary">{name}</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-surface p-2">
        {confidenceEmojis.map((emoji, index) => (
          <button
            key={`${name}-${emoji}`}
            type="button"
            onClick={() => onChange(index)}
            className={`h-10 w-10 rounded text-2xl transition-colors ${
              value === index ? "bg-secondary-container/20" : "hover:bg-secondary-container/10"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage({ onContinue }: OnboardingPageProps) {
  const { accessToken } = useAuth();
  const [selectedExam, setSelectedExam] = useState<ExamId>("jee");
  const [examDate, setExamDate] = useState("2026-01-15");
  const [dailyHours, setDailyHours] = useState(6);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Record<SubjectId, number>>({
    physics: 2,
    chemistry: 1,
    mathematics: 0
  });

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const target = new Date(`${examDate}T00:00:00`);
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [examDate]);

  const examLabel = exams.find((exam) => exam.id === selectedExam)?.name ?? "JEE Main";

  const handleStartAssessment = async () => {
    if (!accessToken) {
      setSubmitError("You need to be signed in to continue.");
      return;
    }

    const payload: OnboardingPayloadDto = {
      examType: selectedExam.toUpperCase() as OnboardingPayloadDto["examType"],
      targetDate: examDate,
      dailyHoursTarget: dailyHours,
      confidenceBySubject: confidence
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await post<OnboardingResponseDto>("/onboarding", payload, accessToken);
      onContinue();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save onboarding settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background font-body text-on-surface">
      {!showSummary ? (
        <main className="min-h-screen p-6 md:p-12">
          <header className="mx-auto mb-12 w-full max-w-4xl text-center">
            <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
              Personalize Your Journey
            </h1>
            <p className="mx-auto max-w-xl text-lg text-on-surface-variant">
              Help Lakshay AI understand your goals to build a curriculum that
              moves at your speed.
            </p>
          </header>

          <div className="mx-auto mb-12 flex w-full max-w-4xl items-center justify-center gap-3">
            <div className="h-2 w-12 rounded-full bg-secondary" />
            <div className="h-2 w-12 rounded-full bg-surface-container-high" />
            <div className="h-2 w-12 rounded-full bg-surface-container-high" />
            <span className="ml-4 text-sm font-bold text-secondary">Step 1 of 3</span>
          </div>

          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <section className="space-y-8 lg:col-span-7">
              <div className="space-y-6">
                <h2 className="flex items-center gap-2 font-headline text-2xl font-bold text-primary">
                  <span className="material-symbols-outlined text-secondary">target</span>
                  Choose Your Target Exam
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {exams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setSelectedExam(exam.id)}
                      className={`flex flex-col rounded-xl bg-surface-container-lowest p-6 text-left transition-all ${
                        selectedExam === exam.id
                          ? "border-2 border-secondary shadow-xl shadow-secondary/5"
                          : "border border-outline-variant/20 hover:border-secondary/50"
                      }`}
                    >
                      <span className="material-symbols-outlined mb-4 text-3xl text-on-surface-variant">
                        {exam.icon}
                      </span>
                      <span className="font-headline text-lg font-bold text-primary">{exam.name}</span>
                      <span className="mt-1 text-xs text-on-surface-variant">{exam.track}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="flex items-center gap-2 font-headline text-2xl font-bold text-primary">
                  <span className="material-symbols-outlined text-secondary">calendar_month</span>
                  When is the big day?
                </h2>
                <div className="flex flex-wrap items-center gap-6 rounded-xl bg-surface-container-lowest p-6">
                  <div className="min-w-[240px] flex-1">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Target Exam Date
                    </label>
                    <input
                      className="w-full rounded-lg border-none bg-surface p-3 font-semibold text-primary focus:ring-2 focus:ring-secondary/20"
                      type="date"
                      value={examDate}
                      onChange={(event) => setExamDate(event.target.value)}
                    />
                  </div>
                  <div className="hidden h-12 w-px bg-surface-container md:block" />
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-secondary">~{daysRemaining}</span>
                    <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Days Remaining
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-headline text-2xl font-bold text-primary">
                    <span className="material-symbols-outlined text-secondary">psychology</span>
                    Subject Confidence
                  </h2>
                  <span className="rounded bg-secondary-container/20 px-2 py-1 text-[10px] font-bold uppercase text-secondary">
                    Personalization Depth
                  </span>
                </div>
                {subjects.map((subject) => (
                  <SubjectRow
                    key={subject.id}
                    name={subject.name}
                    icon={subject.icon}
                    value={confidence[subject.id]}
                    onChange={(value) =>
                      setConfidence((prev) => ({ ...prev, [subject.id]: value }))
                    }
                  />
                ))}
              </div>
            </section>

            <aside className="space-y-6 lg:col-span-5">
              <div className="relative overflow-hidden rounded-[24px] bg-primary p-8 text-white shadow-2xl">
                <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
                <h3 className="relative z-10 mb-8 font-headline text-xl font-bold">Daily Commitment</h3>
                <div className="relative z-10 mb-8">
                  <div className="mb-4 flex items-end justify-between">
                    <span className="text-4xl font-black">{dailyHours}<span className="ml-1 text-lg opacity-60">Hours</span></span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Recommended</span>
                  </div>
                  <input className="onboarding-slider w-full" type="range" min={1} max={12} value={dailyHours} onChange={(e)=>setDailyHours(Number(e.target.value))} />
                  <div className="mt-2 flex justify-between text-[10px] font-bold opacity-40"><span>1H</span><span>6H</span><span>12H</span></div>
                </div>
                <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm italic opacity-80">"Lakshay AI will distribute 200+ topics across your available {dailyHours} daily hours to ensure 100% syllabus coverage."</p>
                </div>
              </div>

              <button type="button" onClick={() => setShowSummary(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-5 font-headline text-xl font-bold text-white shadow-lg shadow-secondary/20 transition-all hover:bg-secondary-container">Build My Smart Plan <span className="material-symbols-outlined">arrow_forward</span></button>
            </aside>
          </div>
        </main>
      ) : (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-background/95 p-6 backdrop-blur-md md:p-12">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-8 text-center shadow-2xl md:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10"><span className="material-symbols-outlined text-4xl text-secondary">check_circle</span></div>
            <h2 className="mb-2 font-headline text-3xl font-extrabold text-primary">Profile Created!</h2>
            <p className="mb-10 text-on-surface-variant">Here is a summary of your personalized settings.</p>
            <div className="mb-10 grid grid-cols-1 gap-4 text-left md:grid-cols-3">
              <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Exam</span><p className="font-headline font-bold text-primary">{examLabel} 2026</p></div>
              <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Daily Goal</span><p className="font-headline font-bold text-primary">{dailyHours} Hours / Day</p></div>
              <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Confidence</span><p className="font-headline font-bold text-primary">PHY:{confidenceEmojis[confidence.physics]} CHM:{confidenceEmojis[confidence.chemistry]}</p></div>
            </div>
            {submitError ? (
              <p className="mb-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
                {submitError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-5 font-headline text-xl font-bold text-white transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : "Start Diagnostic Assessment"}
              <span className="material-symbols-outlined">rocket_launch</span>
            </button>
            <button type="button" onClick={() => setShowSummary(false)} className="mt-6 text-sm font-bold text-on-surface-variant underline decoration-2 underline-offset-4 hover:text-secondary">Back to Edit Profile</button>
          </div>
        </div>
      )}
    </div>
  );
}
