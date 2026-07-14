export const CLAUDE_SELECTORS = Object.freeze({
  conversationRoot: Object.freeze([
    "main",
    '[role="main"]'
  ]),
  userMessage: Object.freeze([
    '[data-testid*="user-message"]',
    '[data-testid*="human-message"]',
    '[data-message-author-role="user"]',
    '[class*="font-user-message"]',
    '[class*="human-message"]'
  ]),
  assistantMessage: Object.freeze([
    '[data-testid*="assistant-message"]',
    '[data-testid*="model-response"]',
    '[data-message-author-role="assistant"]',
    '[class*="font-claude-message"]',
    '[class*="assistant-message"]'
  ]),
  messageContent: Object.freeze([
    '[data-testid*="message-content"]',
    ".prose",
    '[class*="markdown"]'
  ]),
  conversationTitle: Object.freeze([
    'button[data-testid*="conversation-title"]',
    '[data-testid*="conversation-title"]',
    "h1"
  ]),
  composer: Object.freeze([
    'div.ProseMirror[contenteditable="true"]',
    '[data-testid*="composer"] [contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'textarea[placeholder*="Claude" i]',
    "main textarea"
  ])
});
