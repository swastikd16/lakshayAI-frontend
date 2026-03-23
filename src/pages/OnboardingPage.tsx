import { useEffect, useMemo, useState } from "react";
import { get, post } from "../lib/apiClient";
import type {
  DiagnosticAnswerDto,
  DiagnosticQuestionBankDto,
  DiagnosticQuestionDto,
  OnboardingPayloadDto,
  OnboardingResponseDto
} from "../lib/apiTypes";
import { useAuth } from "../contexts/AuthContext";

type ExamId = "jee" | "neet" | "upsc";
type SubjectId = "physics" | "chemistry" | "mathematics";
type OnboardingStep = "profile" | "diagnostic";

type OnboardingPageProps = {
  onContinue: () => void;
  revisitMode?: boolean;
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

const confidenceLabels = ["Needs support", "Building", "Comfortable", "Strong"];
const subjectAccent: Record<string, string> = {
  physics: "bg-sky-100 text-sky-700",
  chemistry: "bg-emerald-100 text-emerald-700",
  mathematics: "bg-violet-100 text-violet-700"
};

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
        <div>
          <span className="font-headline text-xl font-bold text-primary">{name}</span>
          <p className="text-xs text-on-surface-variant">{confidenceLabels[value]}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2">
        {confidenceLabels.map((label, index) => (
          <button
            key={`${name}-${label}`}
            type="button"
            onClick={() => onChange(index)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              value === index
                ? "bg-secondary text-white shadow-md shadow-secondary/20"
                : "bg-surface-container-high text-on-surface-variant hover:bg-secondary/10 hover:text-secondary"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepIndicator({
  current,
  revisitMode
}: {
  current: OnboardingStep;
  revisitMode: boolean;
}) {
  return (
    <div className="mx-auto mb-12 flex w-full max-w-4xl items-center justify-center gap-3">
      <div className={`h-2 w-12 rounded-full ${current === "profile" ? "bg-secondary" : "bg-secondary/40"}`} />
      <div className={`h-2 w-12 rounded-full ${current === "diagnostic" ? "bg-secondary" : "bg-surface-container-high"}`} />
      <span className="ml-4 text-sm font-bold text-secondary">
        {current === "profile" ? "Step 1 of 2" : "Step 2 of 2"}
      </span>
      {revisitMode ? (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          Revisit mode
        </span>
      ) : null}
    </div>
  );
}

export default function OnboardingPage({
  onContinue,
  revisitMode = false
}: OnboardingPageProps) {
  const { accessToken } = useAuth();
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [selectedExam, setSelectedExam] = useState<ExamId>("jee");
  const [examDate, setExamDate] = useState("2026-01-15");
  const [dailyHours, setDailyHours] = useState(6);
  const [questions, setQuestions] = useState<DiagnosticQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
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
  const currentQuestion = questions[questionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = useMemo(
    () => questions.filter((question) => Boolean(answers[question.id])).length,
    [answers, questions]
  );
  const questionProgress = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 0;
  const completionProgress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const subjectBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach((question) => {
      const key = question.subject.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [questions]);

  useEffect(() => {
    if (step !== "diagnostic" || !accessToken) {
      return;
    }

    let alive = true;
    setIsLoadingQuestions(true);
    setQuestionError(null);

    get<DiagnosticQuestionBankDto | DiagnosticQuestionDto[]>(
      `/onboarding/diagnostic?examType=${selectedExam.toUpperCase()}`,
      accessToken
    )
      .then((payload) => {
        if (!alive) {
          return;
        }
        const normalizedQuestions = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.questions)
            ? payload.questions
            : [];
        setQuestions(normalizedQuestions);
        setAnswers({});
        setQuestionIndex(0);
      })
      .catch((error: unknown) => {
        if (!alive) {
          return;
        }
        setQuestionError(
          error instanceof Error ? error.message : "Unable to load diagnostic questions."
        );
        setQuestions([]);
      })
      .finally(() => {
        if (!alive) {
          return;
        }
        setIsLoadingQuestions(false);
      });

    return () => {
      alive = false;
    };
  }, [accessToken, selectedExam, step]);

  const goToDiagnostic = () => {
    setSubmitError(null);
    setQuestionError(null);
    setStep("diagnostic");
  };

  const handleDiagnosticBack = () => {
    setStep("profile");
    setQuestionError(null);
  };

  const handleSelectAnswer = (selectedOption: string) => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedOption
    }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!accessToken) {
      setSubmitError("You need to be signed in to continue.");
      return;
    }

    if (!questions.length) {
      setSubmitError("Diagnostic questions are still loading. Please try again.");
      return;
    }

    if (answeredCount !== questions.length) {
      setSubmitError("Please answer all diagnostic questions before continuing.");
      return;
    }

    const diagnosticAnswers: DiagnosticAnswerDto[] = questions.map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id]
    }));

    const payload: OnboardingPayloadDto = {
      examType: selectedExam.toUpperCase() as OnboardingPayloadDto["examType"],
      targetDate: examDate,
      dailyHoursTarget: dailyHours,
      confidenceBySubject: confidence,
      diagnosticAnswers
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await post<OnboardingResponseDto>("/onboarding", payload, accessToken);
      onContinue();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save onboarding settings."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "diagnostic") {
    return (
      <div className="min-h-screen bg-background font-body text-on-surface">
        <main className="min-h-screen p-6 md:p-12">
          <header className="mx-auto mb-12 w-full max-w-6xl">
            <StepIndicator current="diagnostic" revisitMode={revisitMode} />
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
                    Diagnostic assessment
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {examLabel}
                  </span>
                </div>
                <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
                  Map your strongest and weakest concepts
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
                  We&apos;ll use this 15-question diagnostic to generate topic-level weak areas and
                  personalize your plan from day one.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="rounded-2xl border border-outline-variant/20 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {subject.name}
                    </p>
                    <p className="mt-1 text-lg font-black text-primary">
                      {subjectBreakdown[subject.id] ?? 0}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">questions</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
            <aside className="space-y-6 lg:col-span-4">
              <div className="rounded-[28px] bg-primary p-8 text-white shadow-2xl shadow-primary/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Completion
                </p>
                <p className="mt-3 font-headline text-4xl font-black">{completionProgress}%</p>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${completionProgress}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Answered
                    </p>
                    <p className="mt-1 text-2xl font-black">{answeredCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Remaining
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {Math.max(0, questions.length - answeredCount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-outline-variant/20 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">neurology</span>
                  <h2 className="font-headline text-lg font-bold text-primary">Diagnostic frame</h2>
                </div>
                <ul className="space-y-3 text-sm text-on-surface-variant">
                  <li>5 questions each across Physics, Chemistry, and Mathematics.</li>
                  <li>Topics are weighted toward high-yield syllabus blocks.</li>
                  <li>Your weak-topic map will be written to the database on submit.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleDiagnosticBack}
                className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-secondary"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to profile settings
              </button>
            </aside>

            <section className="lg:col-span-8">
              {questionError ? (
                <div className="rounded-2xl border border-error/20 bg-error/10 p-5 text-sm text-on-error-container">
                  {questionError}
                </div>
              ) : null}

              {isLoadingQuestions ? (
                <div className="rounded-[28px] border border-outline-variant/20 bg-white p-10 shadow-sm">
                  <div className="animate-pulse space-y-5">
                    <div className="h-4 w-40 rounded bg-surface-container-high" />
                    <div className="h-10 w-3/4 rounded bg-surface-container-high" />
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-16 rounded-2xl bg-surface-container-high" />
                      ))}
                    </div>
                  </div>
                </div>
              ) : currentQuestion ? (
                <div className="rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          subjectAccent[currentQuestion.subject.toLowerCase()] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {currentQuestion.subject}
                      </span>
                      <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {currentQuestion.topic}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-secondary">
                      Question {questionIndex + 1} / {questions.length}
                    </span>
                  </div>

                  <div className="mb-8">
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${questionProgress}%` }}
                      />
                    </div>
                    <h2 className="font-headline text-2xl font-bold leading-tight text-primary md:text-3xl">
                      {currentQuestion.prompt}
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const selected = currentAnswer === option;
                      return (
                        <button
                          key={`${currentQuestion.id}-${index}`}
                          type="button"
                          onClick={() => handleSelectAnswer(option)}
                          className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? "border-secondary bg-secondary/5 shadow-md shadow-secondary/10"
                              : "border-outline-variant/20 bg-surface-container-lowest hover:border-secondary/40 hover:bg-secondary/5"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              selected
                                ? "bg-secondary text-white"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-sm font-medium leading-relaxed text-on-surface">
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {submitError ? (
                    <p className="mt-6 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
                      {submitError}
                    </p>
                  ) : null}

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                      disabled={questionIndex === 0}
                      className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">arrow_back</span>
                      Previous
                    </button>

                    {questionIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))}
                        disabled={!currentAnswer}
                        className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition-all hover:bg-secondary-container disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Next question
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!currentAnswer || isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? "Saving..." : "Finish onboarding"}
                        <span className="material-symbols-outlined text-base">rocket_launch</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-6 text-sm text-slate-500">
                  No diagnostic questions available right now.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background font-body text-on-surface">
      <main className="min-h-screen p-6 md:p-12">
        <header className="mx-auto mb-12 w-full max-w-4xl text-center">
          <StepIndicator current="profile" revisitMode={revisitMode} />
          <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
            {revisitMode ? "Refresh your onboarding profile" : "Personalize Your Journey"}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-on-surface-variant">
            {revisitMode
              ? "Re-run your profile and diagnostic so Lakshay AI can refresh your weak-topic map."
              : "Help Lakshay AI understand your goals to build a curriculum that moves at your speed."}
          </p>
        </header>

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
              <h3 className="relative z-10 mb-8 font-headline text-xl font-bold">
                Daily Commitment
              </h3>
              <div className="relative z-10 mb-8">
                <div className="mb-4 flex items-end justify-between">
                  <span className="text-4xl font-black">
                    {dailyHours}
                    <span className="ml-1 text-lg opacity-60">Hours</span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                    Recommended
                  </span>
                </div>
                <input
                  className="onboarding-slider w-full"
                  type="range"
                  min={1}
                  max={12}
                  value={dailyHours}
                  onChange={(event) => setDailyHours(Number(event.target.value))}
                />
                <div className="mt-2 flex justify-between text-[10px] font-bold opacity-40">
                  <span>1H</span>
                  <span>6H</span>
                  <span>12H</span>
                </div>
              </div>
              <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm italic opacity-80">
                  Lakshay AI will use this commitment alongside your diagnostic performance to
                  balance study, revision, and testing automatically.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-outline-variant/20 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">quiz</span>
                <h3 className="font-headline text-xl font-bold text-primary">
                  Upcoming diagnostic
                </h3>
              </div>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>15 total MCQs across the most important PCM topics.</p>
                <p>Physics, Chemistry, and Mathematics get equal coverage.</p>
                <p>Your answers will directly shape the weak topics saved in the database.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={goToDiagnostic}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-5 font-headline text-xl font-bold text-white shadow-lg shadow-secondary/20 transition-all hover:bg-secondary-container"
            >
              Start diagnostic
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
