import { defineProviderPlugin } from "../plugin.js";
import { ClaudeAdapter } from "./adapter.js";

export const claudePlugin = defineProviderPlugin({
  id: "claude",
  displayName: "Claude",
  hosts: ["claude.ai"],
  createAdapter: () => new ClaudeAdapter()
});
