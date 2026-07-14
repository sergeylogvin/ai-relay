import { defineProviderPlugin } from "../plugin.js";
import { ChatGPTAdapter } from "./adapter.js";

export const chatgptPlugin = defineProviderPlugin({
  id: "chatgpt",
  displayName: "ChatGPT",
  hosts: ["chatgpt.com"],
  createAdapter: () => new ChatGPTAdapter()
});
