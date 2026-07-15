export const FIT_LEVELS = Object.freeze({
  OK: "ok",
  CAUTION: "caution",
  WARNING: "warning",
  OVER: "over"
});

const PROVIDER_DEFAULT_WINDOWS = Object.freeze({
  claude: 200_000,
  chatgpt: 128_000,
  gemini: 1_000_000,
  unknown: 128_000
});

const MODEL_WINDOW_OVERRIDES = Object.freeze([
  { pattern: /haiku/i, window: 200_000 },
  { pattern: /sonnet/i, window: 200_000 },
  { pattern: /opus/i, window: 200_000 },
  { pattern: /claude/i, window: 200_000 },
  { pattern: /gpt-4o/i, window: 128_000 },
  { pattern: /gpt-4/i, window: 128_000 },
  { pattern: /gpt-3\.5/i, window: 16_000 },
  { pattern: /gemini.*flash/i, window: 1_000_000 },
  { pattern: /gemini.*pro/i, window: 1_000_000 },
  { pattern: /gemini/i, window: 1_000_000 }
]);

export function estimateTokensFromText(text) {
  const characters = String(text ?? "").trim().length;

  return Math.max(0, Math.ceil(characters / 4));
}

export function resolveContextWindow({ provider = "unknown", model = null } = {}) {
  const normalizedProvider = String(provider ?? "unknown").toLowerCase();
  const modelText = String(model ?? "").trim();

  if (modelText) {
    for (const override of MODEL_WINDOW_OVERRIDES) {
      if (override.pattern.test(modelText)) {
        return override.window;
      }
    }
  }

  return PROVIDER_DEFAULT_WINDOWS[normalizedProvider] ?? PROVIDER_DEFAULT_WINDOWS.unknown;
}

export function assessContextFit({
  handoffMarkdown = "",
  provider = "unknown",
  model = null,
  handoffMode = "full"
} = {}) {
  const estimatedTokens = estimateTokensFromText(handoffMarkdown);
  const contextWindow = resolveContextWindow({ provider, model });
  const percentUsed =
    contextWindow > 0 ? estimatedTokens / contextWindow : null;

  let level = FIT_LEVELS.OK;

  if (percentUsed !== null) {
    if (percentUsed >= 0.95) {
      level = FIT_LEVELS.OVER;
    } else if (percentUsed >= 0.75) {
      level = FIT_LEVELS.WARNING;
    } else if (percentUsed >= 0.5) {
      level = FIT_LEVELS.CAUTION;
    }
  }

  let recommendation = null;

  if (level === FIT_LEVELS.OVER || level === FIT_LEVELS.WARNING) {
    if (handoffMode === "full") {
      recommendation =
        "This handoff may exceed the model context window. Try Recent messages or Context pack.";
    } else if (handoffMode === "recent") {
      recommendation =
        "This handoff is still large. Try Context pack to reduce size.";
    } else {
      recommendation =
        "This handoff may exceed the model context window. Trim the conversation before continuing.";
    }
  } else if (level === FIT_LEVELS.CAUTION && handoffMode === "full") {
    recommendation =
      "The handoff is getting large. Context pack keeps the essentials only.";
  }

  return Object.freeze({
    estimatedTokens,
    contextWindow,
    percentUsed,
    level,
    recommendation,
    modelLabel: model?.trim() || `${provider} default`
  });
}

export function formatTokenCount(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return "—";
  }

  if (numeric >= 1_000_000) {
    return `${trimTrailingZero(numeric / 1_000_000)}M`;
  }

  if (numeric >= 1_000) {
    return `${trimTrailingZero(numeric / 1_000)}k`;
  }

  return String(Math.round(numeric));
}

function trimTrailingZero(value) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatPercent(value) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatContextFitSummary(assessment) {
  const used = formatTokenCount(assessment.estimatedTokens);
  const total = formatTokenCount(assessment.contextWindow);
  const percent = formatPercent(assessment.percentUsed);

  return `${used} / ${total} est. tokens (${percent})`;
}

export function formatContextFitBadge(assessment) {
  switch (assessment.level) {
    case FIT_LEVELS.OVER:
      return "Likely exceeds context window";
    case FIT_LEVELS.WARNING:
      return "May exceed context window";
    case FIT_LEVELS.CAUTION:
      return "Large handoff";
    default:
      return "Fits current model";
  }
}
