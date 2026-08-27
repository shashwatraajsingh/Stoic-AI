export type TMode = "conversation" | "guidance" | "reflection";

export const MODE_MODELS: Record<TMode, string> = {
  conversation: "minimax/minimax-m3:free",
  guidance: "z-ai/glm-5.2:free",
  reflection: "nvidia/nemotron-3.5-lightning:free",
};

export function isMode(value: unknown): value is TMode {
  return value === "conversation" || value === "guidance" || value === "reflection";
}
