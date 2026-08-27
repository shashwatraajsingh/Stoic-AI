"use client";

import { useState } from "react";

type TMode = "conversation" | "guidance" | "reflection";

type THistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type TGuidanceStructured = {
  theme: string;
  reasoning: string;
  insight: string;
  takeaway: string;
};

type TReply = {
  text: string;
  structured?: TGuidanceStructured;
};

const MODE_LABELS: Record<TMode, string> = {
  conversation: "Conversation",
  guidance: "Guidance",
  reflection: "Daily Reflection",
};

// Splits a text on [[quote: text — Author]] markers and renders each match as a
// boxed Quote, leaving unterminated markers and ordinary quote marks as plain text.
function renderWithQuotes(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const markerStart = "[[quote:";
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const start = text.indexOf(markerStart, cursor);
    if (start === -1) {
      nodes.push(<span key={key++}>{text.slice(cursor)}</span>);
      break;
    }

    const end = text.indexOf("]]", start);
    if (end === -1) {
      nodes.push(<span key={key++}>{text.slice(cursor)}</span>);
      break;
    }

    if (start > cursor) {
      nodes.push(<span key={key++}>{text.slice(cursor, start)}</span>);
    }

    const inner = text.slice(start + markerStart.length, end).trim();
    const dashIndex = inner.lastIndexOf(" — ");
    const quoteText = dashIndex === -1 ? inner : inner.slice(0, dashIndex).trim();
    const attribution = dashIndex === -1 ? "" : inner.slice(dashIndex + 3).trim();

    nodes.push(<Quote key={key++} text={quoteText} attribution={attribution} />);

    cursor = end + 2;
  }

  return nodes;
}

function Quote({ text, attribution }: { text: string; attribution: string }) {
  return (
    <blockquote className="my-3 border-l-2 border-[var(--border)] pl-4 italic">
      <p>{text}</p>
      {attribution && <footer className="mt-1 text-sm not-italic opacity-70">{attribution}</footer>}
    </blockquote>
  );
}

function StoicText({ text }: { text: string }) {
  return <div className="whitespace-pre-wrap leading-relaxed">{renderWithQuotes(text)}</div>;
}

async function postStoic(body: unknown): Promise<{ ok: true; reply: TReply } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/stoic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();

    if (!res.ok) {
      const message =
        typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : "Something went wrong. Please try again.";
      return { ok: false, error: message };
    }

    const reply = (data as { reply: TReply }).reply;
    return { ok: true, reply };
  } catch {
    return { ok: false, error: "Could not reach the server. Please try again." };
  }
}

function ConversationPanel() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<THistoryTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    const nextHistory: THistoryTurn[] = [...history, { role: "user", content: trimmed }];
    setHistory(nextHistory);
    setInput("");

    const result = await postStoic({ mode: "conversation", input: trimmed, history });

    if (result.ok) {
      setHistory([...nextHistory, { role: "assistant", content: result.reply.text }]);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {history.map((turn, index) => (
          <div
            key={index}
            className={`rounded border border-[var(--border)] p-3 ${
              turn.role === "user" ? "ml-8" : "mr-8"
            }`}
          >
            <StoicText text={turn.content} />
          </div>
        ))}
      </div>
      {error && <p className="rounded border border-[var(--border)] p-3 text-sm">{error}</p>}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-[var(--border)] bg-transparent p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Share a thought..."
          disabled={loading}
        />
        <button
          className="rounded border border-[var(--border)] px-4 py-2 disabled:opacity-50"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

function GuidancePanel() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<TReply | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setReply(null);

    const result = await postStoic({ mode: "guidance", input: trimmed });

    if (result.ok) {
      setReply(result.reply);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="min-h-24 rounded border border-[var(--border)] bg-transparent p-2"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe your dilemma..."
        disabled={loading}
      />
      <button
        className="self-start rounded border border-[var(--border)] px-4 py-2 disabled:opacity-50"
        onClick={() => void submit()}
        disabled={loading || !input.trim()}
      >
        {loading ? "Seeking..." : "Seek Guidance"}
      </button>
      {error && <p className="rounded border border-[var(--border)] p-3 text-sm">{error}</p>}
      {reply && reply.structured && (
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="text-sm tracking-wide opacity-70">Theme</h3>
            <StoicText text={reply.structured.theme} />
          </section>
          <section>
            <h3 className="text-sm tracking-wide opacity-70">Stoic Reasoning</h3>
            <StoicText text={reply.structured.reasoning} />
          </section>
          <section>
            <h3 className="text-sm tracking-wide opacity-70">Ancient Insight</h3>
            <StoicText text={reply.structured.insight} />
          </section>
          <section>
            <h3 className="text-sm tracking-wide opacity-70">Modern Takeaway</h3>
            <StoicText text={reply.structured.takeaway} />
          </section>
        </div>
      )}
      {reply && !reply.structured && (
        <div className="rounded border border-[var(--border)] p-3">
          <StoicText text={reply.text} />
        </div>
      )}
    </div>
  );
}

function ReflectionPanel() {
  const [reply, setReply] = useState<TReply | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReflection() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setReply(null);

    const result = await postStoic({ mode: "reflection" });

    if (result.ok) {
      setReply(result.reply);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        className="self-start rounded border border-[var(--border)] px-4 py-2 disabled:opacity-50"
        onClick={() => void fetchReflection()}
        disabled={loading}
      >
        {loading ? "Reflecting..." : "Receive Today's Reflection"}
      </button>
      {error && <p className="rounded border border-[var(--border)] p-3 text-sm">{error}</p>}
      {reply && (
        <div className="rounded border border-[var(--border)] p-3">
          <StoicText text={reply.text} />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<TMode>("conversation");

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="text-center">
          <h1 className="text-3xl">The Stoic AI</h1>
          <p className="mt-2 text-sm opacity-70">A calm voice in a noisy world.</p>
        </header>

        <nav className="flex justify-center gap-2 border-b border-[var(--border)] pb-4">
          {(Object.keys(MODE_LABELS) as TMode[]).map((m) => (
            <button
              key={m}
              className={`rounded px-4 py-2 text-sm ${
                mode === m ? "border border-[var(--border)]" : "opacity-60"
              }`}
              onClick={() => setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </nav>

        {mode === "conversation" && <ConversationPanel />}
        {mode === "guidance" && <GuidancePanel />}
        {mode === "reflection" && <ReflectionPanel />}
      </main>
    </div>
  );
}
