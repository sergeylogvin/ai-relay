importScriptsNotAvailable();

function importScriptsNotAvailable() {
  // Marker to keep this file valid in both browser runtime and static tests.
}

const ROLE_SELECTORS = Object.freeze({
  user: [
    '[data-message-author-role="user"]',
    '[data-testid*="user"]',
    '[class*="user-message"]',
    '[class*="human-message"]'
  ],
  assistant: [
    '[data-message-author-role="assistant"]',
    '[data-testid*="assistant"]',
    '[class*="assistant-message"]',
    '[class*="model-response"]'
  ]
});

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectProvider() {
  const hostname = window.location.hostname;

  if (hostname === "claude.ai") return "claude";
  if (hostname === "chatgpt.com") return "chatgpt";
  if (hostname === "gemini.google.com") return "gemini";

  return "unknown";
}

function collectMessages() {
  const found = [];

  for (const [role, selectors] of Object.entries(ROLE_SELECTORS)) {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const content = cleanText(element.innerText ?? element.textContent);
        if (!content) continue;

        found.push({ role, content, element });
      }
    }
  }

  found.sort((left, right) => {
    if (left.element === right.element) return 0;

    const relation = left.element.compareDocumentPosition(right.element);
    if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  const result = [];
  const seen = new Set();

  for (const item of found) {
    const key = `${item.role}:${item.content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      role: item.role,
      content: item.content
    });
  }

  return result;
}

function formatRawHandoff(provider, title, messages) {
  const lines = [
    "# AI Relay Capture",
    "",
    `Provider: ${provider}`,
    `Title: ${title || "Untitled conversation"}`,
    "",
    "## Conversation",
    ""
  ];

  for (const message of messages) {
    lines.push(
      `### ${message.role.toUpperCase()}`,
      "",
      message.content,
      ""
    );
  }

  lines.push(
    "## Continuation instruction",
    "",
    "Continue from this conversation. Preserve prior decisions and constraints. Ask before assuming missing facts."
  );

  return lines.join("\n").trim();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AI_RELAY_CAPTURE") return false;

  try {
    const provider = detectProvider();
    const messages = collectMessages();

    sendResponse({
      ok: true,
      capture: {
        schemaVersion: 1,
        provider,
        title: document.title,
        url: window.location.href,
        capturedAt: new Date().toISOString(),
        messages,
        markdown: formatRawHandoff(provider, document.title, messages)
      }
    });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return true;
});
