import { chatgptPlugin } from "./chatgpt/plugin.js";
import { claudePlugin } from "./claude/plugin.js";
import { geminiPlugin } from "./gemini/plugin.js";

export const DEFAULT_PROVIDER_PLUGINS = Object.freeze([
  claudePlugin,
  chatgptPlugin,
  geminiPlugin
]);
