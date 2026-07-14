import { defineProviderPlugin } from "../plugin.js";
import { GeminiAdapter } from "./adapter.js";

export const geminiPlugin = defineProviderPlugin({
  id: "gemini",
  displayName: "Gemini",
  hosts: ["gemini.google.com"],
  createAdapter: () => new GeminiAdapter()
});
