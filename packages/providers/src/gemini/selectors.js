export const GEMINI_SELECTORS = Object.freeze({
  conversationRoot: Object.freeze([
    "main",
    '[role="main"]'
  ]),
  userMessage: Object.freeze([
    "user-query",
    '[data-test-id*="user-query"]',
    '[data-testid*="user-query"]',
    '[class*="user-query"]'
  ]),
  assistantMessage: Object.freeze([
    "model-response",
    '[data-test-id*="model-response"]',
    '[data-testid*="model-response"]',
    '[class*="model-response"]'
  ]),
  messageContent: Object.freeze([
    ".query-text",
    ".response-content",
    ".markdown",
    '[class*="markdown"]',
    ".prose"
  ]),
  conversationTitle: Object.freeze([
    '[data-test-id*="conversation-title"]',
    '[data-testid*="conversation-title"]',
    "h1"
  ])
});
