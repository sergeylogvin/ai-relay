import { ClaudeAdapter } from "./claude/adapter.js";
import { ChatGPTAdapter } from "./chatgpt/adapter.js";
import { GeminiAdapter } from "./gemini/adapter.js";

export class ProviderNotFoundError extends Error {
  constructor(input) {
    super(`No provider adapter found for: ${String(input)}`);
    this.name = "ProviderNotFoundError";
    this.input = input;
  }
}

export class ProviderRegistry {
  constructor(adapters = [
    new ClaudeAdapter(),
    new ChatGPTAdapter(),
    new GeminiAdapter()
  ]) {
    this.adapters = Object.freeze([...adapters]);
  }

  list() {
    return this.adapters.map((adapter) => ({
      id: adapter.id,
      capabilities: adapter.capabilities()
    }));
  }

  find(input) {
    return this.adapters.find((adapter) => adapter.matches(input)) ?? null;
  }

  require(input) {
    const adapter = this.find(input);

    if (!adapter) {
      throw new ProviderNotFoundError(input);
    }

    return adapter;
  }

  readConversation(input, root = document) {
    return this.require(input).readConversation(root);
  }
}
