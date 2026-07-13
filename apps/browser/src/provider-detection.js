export const PROVIDERS = Object.freeze({
  CLAUDE: "claude",
  CHATGPT: "chatgpt",
  GEMINI: "gemini",
  UNKNOWN: "unknown",
});

export function detectProvider(input) {
  const hostname =
    typeof input === "string"
      ? new URL(input).hostname
      : input?.hostname ?? "";

  if (hostname === "claude.ai") return PROVIDERS.CLAUDE;
  if (hostname === "chatgpt.com") return PROVIDERS.CHATGPT;
  if (hostname === "gemini.google.com") return PROVIDERS.GEMINI;

  return PROVIDERS.UNKNOWN;
}
