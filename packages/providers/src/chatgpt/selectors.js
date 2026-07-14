export const CHATGPT_SELECTORS = Object.freeze({
  conversationRoot: Object.freeze([
    "main",
    '[role="main"]'
  ]),
  userMessage: Object.freeze([
    '[data-message-author-role="user"]',
    '[data-testid*="user-message"]',
    '[data-testid*="conversation-turn-user"]'
  ]),
  assistantMessage: Object.freeze([
    '[data-message-author-role="assistant"]',
    '[data-testid*="assistant-message"]',
    '[data-testid*="conversation-turn-assistant"]'
  ]),
  messageContent: Object.freeze([
    '[data-message-content]',
    ".markdown",
    '[class*="markdown"]',
    ".prose"
  ]),
  conversationTitle: Object.freeze([
    'button[data-testid*="conversation-title"]',
    '[data-testid*="conversation-title"]',
    "h1"
  ]),
  composer: Object.freeze([
    '#prompt-textarea[contenteditable="true"]',
    'textarea#prompt-textarea',
    'textarea[data-testid="prompt-textarea"]',
    '[data-testid="composer"] [contenteditable="true"]',
    'main form textarea'
  ])
});
