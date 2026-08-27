import { isMode, MODE_MODELS, type TMode } from "@/lib/models";
import { MODE_PROMPTS } from "@/lib/prompts";
import { callOpenRouter, OpenRouterError, type TChatMessage } from "@/lib/openrouter";

type THistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type TStoicRequest = {
  mode: TMode;
  input?: string;
  history?: THistoryTurn[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHistoryTurn(value: unknown): value is THistoryTurn {
  if (!isRecord(value)) return false;
  return (
    (value.role === "user" || value.role === "assistant") && typeof value.content === "string"
  );
}

// Parses and validates the untrusted request body. Returns an error message on any defect.
function parseRequest(body: unknown): { ok: true; value: TStoicRequest } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (!isMode(body.mode)) {
    return { ok: false, error: "mode must be one of: conversation, guidance, reflection." };
  }

  const mode = body.mode;
  const input = typeof body.input === "string" ? body.input : undefined;

  if (mode !== "reflection" && (!input || input.trim().length === 0)) {
    return { ok: false, error: "input is required for this mode." };
  }

  let history: THistoryTurn[] | undefined;
  if (body.history !== undefined) {
    if (!Array.isArray(body.history) || !body.history.every(isHistoryTurn)) {
      return { ok: false, error: "history must be an array of {role, content} turns." };
    }
    history = body.history;
  }

  return { ok: true, value: { mode, input, history } };
}

type TGuidanceStructured = {
  theme: string;
  reasoning: string;
  insight: string;
  takeaway: string;
};

// Best-effort parse of the guidance JSON block. Never throws — a parse failure just
// means the caller falls back to plain text (an eloquent model should not 500).
function parseGuidance(text: string): TGuidanceStructured | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed)) return undefined;

  const { theme, reasoning, insight, takeaway } = parsed;
  if (
    typeof theme === "string" &&
    typeof reasoning === "string" &&
    typeof insight === "string" &&
    typeof takeaway === "string"
  ) {
    return { theme, reasoning, insight, takeaway };
  }

  return undefined;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { mode, input, history } = parsed.value;

  const messages: TChatMessage[] = [{ role: "system", content: MODE_PROMPTS[mode] }];
  if (history) {
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }
  }
  if (input) {
    messages.push({ role: "user", content: input });
  }

  try {
    const text = await callOpenRouter(MODE_MODELS[mode], messages);

    if (mode === "guidance") {
      const structured = parseGuidance(text);
      if (structured) {
        return Response.json({ reply: { text, structured } });
      }
    }

    return Response.json({ reply: { text } });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      if (error.kind === "exhausted") {
        console.error(`stoic route: key pool exhausted for mode "${mode}"`);
        return Response.json(
          { error: "The signal is lost for now — a moment of patience, then try again." },
          { status: 502 },
        );
      }

      if (error.kind === "model-not-found") {
        console.error(`stoic route: model configuration problem for mode "${mode}": ${error.message}`);
        return Response.json(
          { error: "A model in this mode is misconfigured. Please let the keeper of this app know." },
          { status: 502 },
        );
      }

      console.error(`stoic route: upstream request defect for mode "${mode}": ${error.message}`);
      return Response.json({ error: "The request to the Stoic voice was malformed." }, { status: 502 });
    }

    console.error(`stoic route: unexpected error for mode "${mode}":`, error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
