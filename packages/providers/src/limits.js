export const LIMIT_SIGNAL_TYPES = Object.freeze({
  QUOTA: "quota",
  RATE_LIMIT: "rate_limit",
  CONTEXT_FULL: "context_full",
  UNKNOWN: "unknown"
});

const LIMIT_PATTERN_RULES = Object.freeze([
  {
    type: LIMIT_SIGNAL_TYPES.QUOTA,
    pattern:
      /message limit|usage limit|reached your (daily )?limit|out of messages|free plan limit|limit reached/i
  },
  {
    type: LIMIT_SIGNAL_TYPES.RATE_LIMIT,
    pattern:
      /rate limit|too many requests|slow down|try again (in|later)|temporarily unavailable/i
  },
  {
    type: LIMIT_SIGNAL_TYPES.CONTEXT_FULL,
    pattern:
      /context (window )?(is )?(full|limit)|conversation (is )?too long|maximum context|token limit|input is too long/i
  }
]);

const DEFAULT_BANNER_SELECTORS = Object.freeze([
  '[role="alert"]',
  '[aria-live="assertive"]',
  '[data-testid*="banner"]',
  '[data-testid*="limit"]',
  '[class*="banner"]',
  '[class*="limit"]'
]);

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyLimitMessage(message) {
  const normalized = normalizeText(message);

  for (const rule of LIMIT_PATTERN_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.type;
    }
  }

  return LIMIT_SIGNAL_TYPES.UNKNOWN;
}

export function looksLikeLimitMessage(message) {
  return classifyLimitMessage(message) !== LIMIT_SIGNAL_TYPES.UNKNOWN;
}

export function createLimitSignal({
  message,
  type = LIMIT_SIGNAL_TYPES.UNKNOWN,
  confidence = "low",
  source = null,
  detectedAt = new Date().toISOString()
}) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    throw new TypeError("Limit signal message is required.");
  }

  return Object.freeze({
    type,
    message: normalizedMessage,
    confidence,
    source,
    detectedAt
  });
}

function collectElements(root, selectors) {
  const elements = [];
  const seen = new Set();

  for (const selector of selectors) {
    const matches = root.querySelectorAll?.(selector) ?? [];

    for (const element of matches) {
      if (seen.has(element)) continue;
      seen.add(element);
      elements.push({ element, selector });
    }
  }

  return elements;
}

export function scanLimitSignals(root, { bannerSelectors = [] } = {}) {
  const providerSelectors = new Set(bannerSelectors);
  const selectors = [...bannerSelectors, ...DEFAULT_BANNER_SELECTORS];
  const signals = [];
  const seenMessages = new Set();

  for (const { element, selector } of collectElements(root, selectors)) {
    const message = normalizeText(element?.innerText ?? element?.textContent);

    if (!message || message.length > 240) {
      continue;
    }

    if (!looksLikeLimitMessage(message)) {
      continue;
    }

    const dedupeKey = message.toLowerCase();

    if (seenMessages.has(dedupeKey)) {
      continue;
    }

    seenMessages.add(dedupeKey);
    signals.push(
      createLimitSignal({
        message,
        type: classifyLimitMessage(message),
        confidence: providerSelectors.has(selector) ? "high" : "medium",
        source: selector
      })
    );
  }

  return Object.freeze(signals);
}

export function formatLimitSignalLabel(signal) {
  switch (signal?.type) {
    case LIMIT_SIGNAL_TYPES.QUOTA:
      return "Usage limit detected";
    case LIMIT_SIGNAL_TYPES.RATE_LIMIT:
      return "Rate limit detected";
    case LIMIT_SIGNAL_TYPES.CONTEXT_FULL:
      return "Context limit detected";
    default:
      return "Provider limit detected";
  }
}
