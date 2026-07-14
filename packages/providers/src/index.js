export {
  DEFAULT_PROVIDER_CAPABILITIES,
  PROVIDER_CAPABILITIES,
  normalizeProviderCapabilities,
  supportsCapability
} from "./capabilities.js";

export { ClaudeAdapter } from "./claude/adapter.js";
export { CLAUDE_SELECTORS } from "./claude/selectors.js";
export { claudePlugin } from "./claude/plugin.js";

export { ChatGPTAdapter } from "./chatgpt/adapter.js";
export { CHATGPT_SELECTORS } from "./chatgpt/selectors.js";
export { chatgptPlugin } from "./chatgpt/plugin.js";

export { GeminiAdapter } from "./gemini/adapter.js";
export { GEMINI_SELECTORS } from "./gemini/selectors.js";
export { geminiPlugin } from "./gemini/plugin.js";

export { DEFAULT_PROVIDER_PLUGINS } from "./default-plugins.js";
export {
  defineProviderPlugin,
  validateProviderAdapter
} from "./plugin.js";

export {
  DuplicateProviderError,
  ProviderCapabilityError,
  ProviderNotFoundError,
  ProviderRegistry
} from "./registry.js";

export {
  ContextComposerNotEmptyError,
  ContextComposerNotFoundError,
  insertContextIntoComposer
} from "./context-insertion.js";
