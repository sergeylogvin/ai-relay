const PROVIDER_URLS = Object.freeze({
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  gemini: "https://gemini.google.com/app"
});

function normalizeProvider(provider) {
  return String(provider ?? "").trim().toLowerCase();
}

export function getProviderUrl(provider) {
  return PROVIDER_URLS[normalizeProvider(provider)] ?? null;
}

export function listContinuationProviders() {
  return Object.entries(PROVIDER_URLS).map(([id, url]) => ({ id, url }));
}

export function buildContinuationPrompt(record, options = {}) {
  if (!record || typeof record !== "object") {
    throw new TypeError("A conversation record is required.");
  }

  const handoff = String(record.handoffMarkdown ?? "").trim();
  if (!handoff) {
    throw new TypeError("The conversation record has no handoff Markdown.");
  }

  const targetProvider = normalizeProvider(options.targetProvider);
  const sourceProvider = normalizeProvider(record.provider) || "unknown";
  const title = String(record.title ?? "Untitled conversation").trim();
  const sourceUrl = String(record.sourceUrl ?? "").trim();

  return [
    "# Continue this conversation",
    "",
    "Use the handoff below as reliable context from a previous AI conversation.",
    "Do not repeat completed work unless verification is necessary.",
    "Preserve established decisions, constraints, terminology, and open tasks.",
    "Start by briefly confirming what you understand, then continue with the next actionable step.",
    "",
    `Conversation title: ${title}`,
    `Source AI provider: ${sourceProvider}`,
    targetProvider
      ? `Target AI provider: ${targetProvider}`
      : "Target AI provider: not specified",
    sourceUrl
      ? `Original conversation: ${sourceUrl}`
      : "Original conversation: not available",
    "",
    "---",
    "",
    handoff
  ].join("\n");
}
