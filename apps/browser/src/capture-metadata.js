function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function firstText(root, selectors) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const text = cleanText(element?.innerText ?? element?.textContent);
    if (text) return text;
  }

  return null;
}

export function extractConversationId(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const markerIndex = segments.findIndex((segment) =>
      ["chat", "conversation", "conversations", "c"].includes(segment)
    );

    if (markerIndex >= 0 && segments[markerIndex + 1]) {
      return segments[markerIndex + 1];
    }

    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

export function detectVisibleModel(root = document) {
  const text = firstText(root, [
    '[data-testid*="model"]',
    '[aria-label*="model" i]',
    'button[aria-haspopup="menu"]',
    'button[data-state]'
  ]);

  if (!text) return null;

  const match = text.match(
    /\b(?:claude|opus|sonnet|haiku|gpt|gemini|grok|copilot|perplexity)[^|\n]{0,40}/i
  );

  return cleanText(match?.[0] ?? text).slice(0, 80) || null;
}

export function estimateTokens(messages = []) {
  const characters = messages.reduce(
    (total, message) => total + cleanText(message?.content).length,
    0
  );

  return Math.max(0, Math.ceil(characters / 4));
}

export function collectCaptureMetadata({
  conversation,
  root = document,
  url = globalThis.location?.href ?? "",
  capturedAt = new Date().toISOString()
} = {}) {
  const messages = conversation?.messages ?? [];

  return {
    providerVersion: "web",
    conversationId: extractConversationId(url),
    capturedAt,
    model: detectVisibleModel(root),
    messageCount: messages.length,
    estimatedTokens: estimateTokens(messages),
    attachmentCount: root.querySelectorAll(
      'a[download], [data-testid*="attachment"], [class*="attachment"]'
    ).length,
    imageCount: root.querySelectorAll(
      'main img, [data-testid*="message"] img, article img'
    ).length,
    artifactCount: root.querySelectorAll(
      '[data-testid*="artifact"], [class*="artifact"]'
    ).length
  };
}
