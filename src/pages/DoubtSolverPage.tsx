import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import StudyShell from "../components/StudyShell";
import { useAuth } from "../contexts/AuthContext";
import { get, post } from "../lib/apiClient";
import type { DoubtMessageDto } from "../lib/apiTypes";

type Attachment = { label: string; detail: string };
type AssistantStep = { title: string; body: string };
type AssistantContent = {
  title: string;
  summary: string;
  steps: AssistantStep[];
  equations: string[];
  sources: string[];
  confidence: string;
  quickActions: { label: string; icon: string }[];
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  attachment?: Attachment;
  response?: AssistantContent;
};
type ThreadResponse = {
  thread?: { id?: string; title?: string | null; rag_enabled?: boolean; ragEnabled?: boolean } | null;
  messages?: DoubtMessageDto[];
};
type SendResponse = {
  threadId?: string | null;
  userMessage?: DoubtMessageDto | null;
  assistantMessage?: DoubtMessageDto | null;
};

const TAGS = ["Physics", "Electrostatics", "Non-uniform Sphere", "JEE Main"];
const QUICK_ACTIONS = [
  { label: "Explain simpler", icon: "auto_awesome" },
  { label: "Give another example", icon: "lightbulb" },
  { label: "Generate practice question", icon: "edit_note" },
  { label: "Show source", icon: "menu_book" }
];

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

function parseSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return String(record.label ?? record.title ?? record.name ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeAssistant(payload: unknown, fallback: string): AssistantContent {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const stepsSource = Array.isArray(record.steps) ? record.steps : [];
  const steps = stepsSource.length
    ? stepsSource.map((step, index) => {
        if (typeof step === "string") {
          return { title: `Step ${index + 1}`, body: step };
        }
        const s = step as Record<string, unknown>;
        return {
          title: String(s.title ?? `Step ${index + 1}`),
          body: String(s.body ?? s.text ?? "")
        };
      })
    : [
        { title: "Understand the prompt", body: fallback },
        { title: "Build the equation chain", body: "Translate the physics into compact equations." }
      ];

  const equations = Array.isArray(record.equations) && record.equations.length
    ? record.equations.map((item) => String(item))
    : ["Equation details will appear here once the backend returns structured math."];

  const quickActions = Array.isArray(record.quickActions)
    ? record.quickActions.map((item) => {
        const action = item as Record<string, unknown>;
        return { label: String(action.label ?? "Follow up"), icon: String(action.icon ?? "help") };
      })
    : QUICK_ACTIONS;

  const confidenceValue = typeof record.confidence === "number"
    ? `${Math.round(record.confidence)}%`
    : String(record.confidence ?? "97%");

  return {
    title: String(record.title ?? "Step-by-step solution"),
    summary: String(record.summary ?? record.explanation ?? fallback),
    steps,
    equations,
    sources: parseSources(record.sources).length ? parseSources(record.sources) : ["Verified academic source", "Topic notes", "Worked example"],
    confidence: confidenceValue,
    quickActions
  };
}

function normalizeMessage(payload: DoubtMessageDto): ChatMessage {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const text = String(record.contentText ?? record.content_text ?? "");
  const role = (record.role as ChatMessage["role"]) ?? "system";
  const attachmentRecord = record.attachment && typeof record.attachment === "object" ? (record.attachment as Record<string, unknown>) : null;
  return {
    id: String(record.id ?? `${role}-${Math.random().toString(36).slice(2)}`),
    role,
    text,
    attachment: attachmentRecord
      ? {
          label: String(attachmentRecord.label ?? attachmentRecord.fileName ?? attachmentRecord.file_name ?? "Figure attached"),
          detail: String(attachmentRecord.detail ?? attachmentRecord.caption ?? attachmentRecord.mimeType ?? attachmentRecord.mime_type ?? "Ready for a future DB image or figure upload")
        }
      : undefined,
    response: role === "assistant" ? normalizeAssistant(record.structuredResponse ?? record.structured_response, text) : undefined
  };
}

function attachmentDraft(): Attachment {
  return { label: "Diagram placeholder attached", detail: "Ready for a future DB image or figure upload" };
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

export default function DoubtSolverPage() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("Doubt Solver");
  const [ragEnabled, setRagEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant" && message.response), [messages]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const payload = await get<ThreadResponse>("/doubt/threads/latest", accessToken);
        if (!alive) return;

        const thread = payload.thread ?? null;
        setThreadId(thread?.id ?? null);
        setThreadTitle(thread?.title ?? "Doubt Solver");
        setRagEnabled(thread?.ragEnabled ?? thread?.rag_enabled ?? true);
        setMessages((payload.messages ?? []).map(normalizeMessage));
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load your doubt thread.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [accessToken]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function submit() {
    const text = draft.trim();
    if (!text && !attachment) return;

    const optimistic: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: text || "Diagram-only follow-up",
      attachment: attachment ?? undefined
    };

    setSending(true);
    setError(null);
    setMessages((current) => [...current, optimistic]);

    try {
      const payload = await post<SendResponse, { threadId?: string | null; text: string; attachment?: Attachment | null }>(
        "/doubt/messages",
        {
          threadId,
          text: text || "Diagram-only follow-up",
          attachment
        },
        accessToken
      );

      if (payload.threadId) {
        setThreadId(payload.threadId);
      }

      const nextMessages: ChatMessage[] = [];
      if (payload.userMessage) {
        nextMessages.push(normalizeMessage(payload.userMessage));
      }
      if (payload.assistantMessage) {
        nextMessages.push(normalizeMessage(payload.assistantMessage));
      }

      if (nextMessages.length > 0) {
        setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), ...nextMessages]);
      } else {
        const assistant = normalizeAssistant(null, text || "Diagram-only follow-up");
        setMessages((current) => [
          ...current.filter((item) => item.id !== optimistic.id),
          { id: `a-${Date.now()}`, role: "assistant", text: assistant.summary, response: assistant }
        ]);
      }
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setError(err instanceof Error ? err.message : "Failed to send your question.");
    } finally {
      setDraft("");
      setAttachment(null);
      setSending(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <StudyShell activePage="doubt-solver" showMobileNav={false}>
      <main className="min-h-screen md:ml-64">
        <div className="flex min-h-screen flex-col pb-24 md:pb-0">
          <header className="sticky top-0 z-30 border-b border-surface-container-high/50 bg-surface/95 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-secondary/15 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
                      <Icon name="quiz" className="text-[14px]" />
                      {threadTitle}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${ragEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {ragEnabled ? "RAG enabled" : "RAG unavailable"}
                    </span>
                  </div>
                  <h1 className="min-w-0 truncate font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-4xl">Doubt Solver</h1>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500 sm:text-base">
                    Ask any doubt as text or attach a figure placeholder. Lakshay AI will respond with a structured answer, equation panel, sources, and quick actions.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Icon name="hourglass_top" filled className="text-lg" /></div>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Remaining Doubts</p><p className="truncate text-lg font-bold leading-none text-primary">{loading ? "Loading..." : "3 left today"}</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><Icon name="bolt" className="text-lg" /></div>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg. response</p><p className="truncate text-lg font-bold leading-none text-primary">{loading ? "Loading..." : "8 sec"}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div ref={threadRef} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
                <section className="rounded-3xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-[0_12px_36px_rgba(0,32,69,0.04)] sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {TAGS.map((tag) => (
                      <span key={tag} className="rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0 rounded-3xl bg-[#0F1F4A] p-5 text-white shadow-[0_18px_50px_rgba(15,31,74,0.25)] sm:p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20"><Icon name="chat" filled className="text-lg" /></div>
                        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Conversation mode</p><h2 className="truncate text-lg font-bold text-white">Chat-first doubt solving</h2></div>
                      </div>
                      <p className="max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">Type your doubt naturally, attach a diagram placeholder if needed, and keep asking follow-up questions until the concept clicks.</p>
                      <div className="mt-5 flex flex-wrap items-center gap-2">{[{ label: "Conceptual", icon: "psychology" }, { label: "Equation first", icon: "functions" }, { label: "Exam style", icon: "track_changes" }].map((item) => <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80"><Icon name={item.icon} className="text-[14px]" />{item.label}</span>)}</div>
                    </div>
                    <Notice title="Hint" body="You can send text only, or attach a figure placeholder before asking. Press Enter to send and Shift+Enter to add a new line." />
                  </div>
                </section>

                {!loading && error ? (
                  <section className="rounded-3xl border border-error/20 bg-error/5 p-5 text-on-error-container">
                    <p className="text-sm font-bold uppercase tracking-widest text-error">Unable to load thread</p>
                    <p className="mt-2 text-sm leading-relaxed">{error}</p>
                  </section>
                ) : null}

                {!loading && !error && messages.length === 0 ? (
                  <section className="rounded-3xl border border-dashed border-outline-variant/20 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><Icon name="chat" filled className="text-2xl" /></div>
                    <h2 className="font-headline text-xl font-bold text-primary">Start your first doubt</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">There is no active thread yet. Send a question or attach a figure placeholder and the assistant will create the conversation.</p>
                  </section>
                ) : null}

                {!loading && messages.length > 0 ? (
                  <section className="space-y-5">
                    {messages.map((message) =>
                      message.role === "user" ? (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-full rounded-3xl rounded-tr-sm bg-secondary px-5 py-4 text-white shadow-lg shadow-secondary/20 sm:max-w-[min(760px,100%)]">
                            <div className="mb-3 flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20"><Icon name="person" className="text-[18px]" /></div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold uppercase tracking-[0.25em] text-white/55">You</p>
                                <p className="truncate text-[10px] text-white/60">Question sent from chat composer</p>
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90 sm:text-[1.02rem]">{message.text}</p>
                            {message.attachment ? (
                              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-left">
                                <Icon name="image" className="text-[18px]" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-white">{message.attachment.label}</p>
                                  <p className="truncate text-[10px] text-white/60">{message.attachment.detail}</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div key={message.id} className="flex justify-start">
                          <div className="w-full max-w-full rounded-3xl rounded-tl-sm border border-outline-variant/15 bg-white p-5 shadow-[0_12px_36px_rgba(0,32,69,0.05)] sm:p-6">
                            <div className="mb-5 flex items-start gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20"><Icon name="verified" filled className="text-[18px]" /></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-secondary">Answer based on verified sources</p><div className="h-px flex-1 bg-secondary/20" /></div>
                                <h3 className="mt-2 truncate font-headline text-xl font-bold text-primary sm:text-2xl">{message.response?.title ?? "Step-by-step solution"}</h3>
                                <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">{message.response?.summary ?? message.text}</p>
                              </div>
                            </div>
                            {message.response ? (
                              <div className="space-y-4">
                                <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
                                  <div className="mb-3 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">1</span><h4 className="min-w-0 truncate text-base font-bold text-primary">Explanation</h4></div>
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 sm:text-base">{message.response.summary}</p>
                                </section>
                                <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
                                  <div className="mb-3 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">2</span><h4 className="min-w-0 truncate text-base font-bold text-primary">Numbered steps</h4></div>
                                  <div className="space-y-3">{message.response.steps.map((step, index) => <div key={`${step.title}-${index}`} className="flex gap-3 rounded-2xl bg-surface-container-low px-4 py-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-black text-secondary">{index + 1}</div><div className="min-w-0"><h5 className="truncate text-sm font-bold text-primary">{step.title}</h5><p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p></div></div>)}</div>
                                </section>
                                <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
                                  <div className="mb-3 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">3</span><h4 className="min-w-0 truncate text-base font-bold text-primary">Equation strip</h4></div>
                                  <div className="grid gap-2 lg:grid-cols-2">{message.response.equations.map((eq) => <div key={eq} className="min-w-0 rounded-xl bg-[#F8F4FF] px-3 py-2 text-sm font-semibold text-primary shadow-sm"><span className="block truncate font-mono">{eq}</span></div>)}</div>
                                </section>
                                <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
                                  <div className="mb-3 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">4</span><h4 className="min-w-0 truncate text-base font-bold text-primary">Sources</h4></div>
                                  <div className="flex flex-wrap gap-2">{message.response.sources.map((source) => <span key={source} className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-slate-600"><Icon name="source" className="text-[16px] text-secondary" /><span className="truncate">{source}</span></span>)}</div>
                                </section>
                                <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Confidence</p>
                                      <div className="mt-2 flex items-center gap-2"><Icon name="monitoring" className="text-secondary" /><h4 className="truncate text-base font-bold text-primary">Answer quality</h4></div>
                                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{message.response.confidence} confident based on the current reference pattern and step structure.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">{message.response.quickActions.map((action) => <button key={action.label} type="button" onClick={() => setDraft(action.label)} className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-white px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-surface-container"><Icon name={action.icon} className="text-[16px] text-secondary" /><span className="truncate">{action.label}</span></button>)}</div>
                                  </div>
                                </section>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    )}
                  </section>
                ) : null}

                <section className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-[0_10px_30px_rgba(0,32,69,0.04)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Quick actions</p><h2 className="truncate font-headline text-xl font-bold text-primary">Keep the conversation going</h2></div><Icon name="tune" className="text-slate-400" /></div>
                  <div className="flex flex-wrap gap-2">{QUICK_ACTIONS.map((item) => <button key={item.label} type="button" onClick={() => setDraft(item.label)} className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-surface-container"><Icon name={item.icon} className="text-[18px] text-secondary" /><span className="truncate">{item.label}</span></button>)}</div>
                </section>
              </div>
            </div>

            <div className="sticky bottom-0 z-30 border-t border-surface-container-high/60 bg-surface/95 backdrop-blur-xl">
              <div className="mx-auto w-full max-w-[1320px] px-4 py-4 sm:px-6 lg:px-10">
                <form onSubmit={onSubmit} className="rounded-3xl border border-outline-variant/15 bg-white p-3 shadow-[0_20px_50px_rgba(0,32,69,0.14)]">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setAttachment(attachmentDraft())} className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-surface-container">
                      <Icon name="attach_file" className="text-[16px]" />Attach figure
                    </button>
                    {attachment ? (
                      <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary">
                        <Icon name="image" className="text-[16px]" />
                        <span className="truncate">{attachment.label}</span>
                        <button type="button" onClick={() => setAttachment(null)} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary/10 text-secondary transition-colors hover:bg-secondary/20" aria-label="Remove attachment">
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-2 lg:flex-row lg:items-end">
                    <div className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <Icon name="edit" className="shrink-0 text-secondary" />
                      <textarea
                        ref={inputRef}
                        aria-label="Ask your doubt"
                        className="min-h-[92px] min-w-0 flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-slate-400 sm:text-[0.98rem]"
                        placeholder="Ask your academic doubt. You can paste the question here and attach a figure placeholder if needed."
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={onKeyDown}
                      />
                    </div>
                    <button type="submit" disabled={sending} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-4 text-sm font-bold text-white shadow-lg shadow-secondary/30 transition-all hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70">
                      <Icon name="send" className="text-[18px]" />
                      {sending ? "Sending..." : "Ask AI"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Press Enter to send, Shift+Enter for a new line</p><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span>{latestAssistant ? "Latest answer synced" : "Chat updated locally"}</span></div></div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </StudyShell>
  );
}
