import { FormEvent, useEffect, useMemo, useState } from "react";
import StudyShell from "../components/StudyShell";
import { useAuth } from "../contexts/AuthContext";
import { get, postWithMeta } from "../lib/apiClient";
import type { MultimodalVideoNotesDto } from "../lib/apiTypes";

type HistoryResponse = {
  items?: MultimodalVideoNotesDto[];
};

type ProcessResponseMeta = {
  summarySource?: string;
};

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

function encodeMermaidToUrl(mermaidCode: string) {
  const data = new TextEncoder().encode(mermaidCode);
  let binary = "";
  data.forEach((item) => {
    binary += String.fromCharCode(item);
  });
  return `https://mermaid.ink/img/${btoa(binary)}`;
}

function renderMarkdownBlock(markdown: string) {
  const lines = markdown.split("\n");
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (!listBuffer.length) return;
    const entries = [...listBuffer];
    listBuffer = [];
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
        {entries.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    );
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2).trim());
      return;
    }

    flushList();

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="mt-4 text-base font-bold text-primary">
          {line.slice(4)}
        </h3>
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="mt-5 text-lg font-extrabold text-primary">
          {line.slice(3)}
        </h2>
      );
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${elements.length}`} className="mt-5 text-xl font-extrabold text-primary">
          {line.slice(2)}
        </h1>
      );
      return;
    }

    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-slate-700">
        {line}
      </p>
    );
  });

  flushList();
  return elements.length ? elements : <p className="text-sm text-slate-500">No structured notes available.</p>;
}

export default function VideoNotesPage() {
  const { accessToken } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MultimodalVideoNotesDto[]>([]);
  const [selected, setSelected] = useState<MultimodalVideoNotesDto | null>(null);
  const [meta, setMeta] = useState<ProcessResponseMeta | null>(null);

  async function loadHistory() {
    if (!accessToken) return;
    const payload = await get<HistoryResponse>("/multimodal/youtube/history?limit=20", accessToken);
    const items = payload.items ?? [];
    setHistory(items);
    if (!selected && items.length > 0) {
      setSelected(items[0]);
    }
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        await loadHistory();
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Unable to load video notes history.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const mermaidImageUrl = useMemo(() => {
    if (!selected?.mermaidCode) return "";
    return encodeMermaidToUrl(selected.mermaidCode);
  }, [selected?.mermaidCode]);

  async function processVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !url.trim()) return;

    setProcessing(true);
    setError(null);
    setMeta(null);

    try {
      const response = await postWithMeta<MultimodalVideoNotesDto, { url: string; languagePreference: string[] }>(
        "/multimodal/youtube/process",
        {
          url: url.trim(),
          languagePreference: ["en", "en-IN", "hi"]
        },
        accessToken
      );

      setSelected(response.data);
      setHistory((current) => [response.data, ...current.filter((item) => item.id !== response.data.id)]);
      setMeta({
        summarySource: typeof response.meta?.summarySource === "string" ? response.meta.summarySource : undefined
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process YouTube video.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <StudyShell activePage="video-notes">
      <main className="min-h-screen pb-28 md:ml-64 md:pb-12">
        <section className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="truncate font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                  Multimodal Content Processor
                </h1>
                <span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
                  YouTube Notes
                </span>
              </div>
              <p className="max-w-3xl text-sm text-slate-500 sm:text-base">
                Paste a YouTube educational video URL to generate structured revision notes, concept summary, and a Mermaid flowchart.
              </p>
            </div>
          </header>

          <form onSubmit={processVideo} className="mb-6 rounded-3xl border border-secondary/10 bg-white p-5 shadow-sm">
            <label htmlFor="video-url" className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              YouTube URL
            </label>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id="video-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none transition focus:border-secondary"
              />
              <button
                type="submit"
                disabled={processing || !url.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-white shadow-md shadow-secondary/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="auto_awesome" className="text-lg" />
                {processing ? "Generating..." : "Generate Notes"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">Transcript source: youtube-transcript-api</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">Languages: en, en-IN, hi</span>
              {meta?.summarySource ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                  Summary source: {meta.summarySource}
                </span>
              ) : null}
            </div>
          </form>

          {error ? <div className="mb-6 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-on-error-container">{error}</div> : null}

          {loading ? (
            <div className="space-y-4 rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
              <div className="h-16 animate-pulse rounded-2xl bg-surface-container" />
              <div className="h-64 animate-pulse rounded-3xl bg-surface-container" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <section className="space-y-6">
                <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="font-headline text-xl font-bold text-primary">Concept Summary</h2>
                    <span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                      AI
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {selected?.conceptSummary ?? "Generate a video summary to view concept insights."}
                  </p>
                  {selected?.transcriptMeta ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                        Language: {selected.transcriptMeta.language ?? "unknown"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                        Source: {selected.transcriptMeta.source ?? "unknown"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                        Segments: {selected.transcriptMeta.segmentCount ?? 0}
                      </span>
                    </div>
                  ) : null}
                </article>

                <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 font-headline text-xl font-bold text-primary">Structured Notes</h2>
                  <div className="space-y-2">{selected?.notesMarkdown ? renderMarkdownBlock(selected.notesMarkdown) : <p className="text-sm text-slate-500">No notes generated yet.</p>}</div>
                </article>

                <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 font-headline text-xl font-bold text-primary">Flowchart (Mermaid)</h2>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Raw Markdown</p>
                      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
{selected?.mermaidCode ? `\`\`\`mermaid\n${selected.mermaidCode}\n\`\`\`` : "No mermaid flowchart generated yet."}
                      </pre>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Rendered Preview</p>
                      {mermaidImageUrl ? (
                        <img src={mermaidImageUrl} alt="Mermaid diagram preview" className="w-full rounded-xl border border-slate-200 bg-white p-2" />
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                          Diagram preview appears after generation.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-headline text-xl font-bold text-primary">History</h2>
                      <p className="text-sm text-slate-500">Recent generated sessions</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {history.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {history.length ? (
                      history.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelected(item)}
                          className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                            selected?.id === item.id ? "border-secondary/30 bg-secondary/5" : "border-slate-100 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <p className="truncate text-sm font-bold text-primary">{item.videoTitle || item.videoId}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{item.youtubeUrl}</p>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "saved"}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        No processed videos yet.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 font-headline text-xl font-bold text-primary">Transcript Preview</h2>
                  <p className="max-h-[360px] overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {selected?.transcript ?? "Transcript text will appear here after processing."}
                  </p>
                </section>
              </aside>
            </div>
          )}
        </section>
      </main>
    </StudyShell>
  );
}
