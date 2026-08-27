// Server-only: holds API keys. Never import from app/page.tsx or any client component.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type TChatRole = "system" | "user" | "assistant";

export type TChatMessage = {
  role: TChatRole;
  content: string;
};

export type TOpenRouterErrorKind = "exhausted" | "model-not-found" | "bad-request" | "config";

export class OpenRouterError extends Error {
  readonly kind: TOpenRouterErrorKind;

  constructor(kind: TOpenRouterErrorKind, message: string) {
    super(message);
    this.name = "OpenRouterError";
    this.kind = kind;
  }
}

function parseKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

const keys = parseKeys(process.env.OPENROUTER_API_KEYS);

// Module-level: selects the starting key index for the next call, advanced after every call.
let nextKeyIndex = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Narrows the untrusted upstream JSON body to the assistant's message content, if present.
function extractContent(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first = choices[0];
  if (!isRecord(first)) return undefined;
  const message = first.message;
  if (!isRecord(message)) return undefined;
  const content = message.content;
  return typeof content === "string" ? content : undefined;
}

export async function callOpenRouter(model: string, messages: TChatMessage[]): Promise<string> {
  if (keys.length === 0) {
    throw new OpenRouterError(
      "config",
      "OPENROUTER_API_KEYS is not set — add at least one key to .env.local.",
    );
  }

  const startIndex = nextKeyIndex % keys.length;
  nextKeyIndex = (startIndex + 1) % keys.length;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (startIndex + attempt) % keys.length;
    const key = keys[keyIndex];

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (response.status === 404) {
      throw new OpenRouterError(
        "model-not-found",
        `OpenRouter returned 404 for model "${model}" — the slug may be wrong or retired.`,
      );
    }

    if (response.status === 400) {
      throw new OpenRouterError("bad-request", "OpenRouter rejected the request as malformed (400).");
    }

    if (!response.ok) {
      console.error(`key ${keyIndex + 1} of ${keys.length} -> ${response.status}`);
      continue;
    }

    const body: unknown = await response.json();
    const content = extractContent(body);
    if (content === undefined) {
      console.error(`key ${keyIndex + 1} of ${keys.length} -> 200 with unexpected body shape`);
      continue;
    }

    return content;
  }

  throw new OpenRouterError("exhausted", "All OpenRouter keys failed for this request.");
}
