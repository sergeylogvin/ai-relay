import test from "node:test";
import assert from "node:assert/strict";

import {
  ProviderNotFoundError,
  ProviderRegistry
} from "../packages/providers/src/registry.js";
import { defineProviderPlugin } from "../packages/providers/src/plugin.js";

function createAdapter(id, hostname) {
  return {
    id,
    matches(input) {
      const value =
        typeof input === "string"
          ? new URL(input).hostname
          : input?.hostname ?? "";

      return value === hostname;
    },
    capabilities() {
      return {
        readConversation: true,
        insertContext: false,
        uploadFiles: false,
        readLimits: false
      };
    },
    readConversation(root) {
      return {
        provider: id,
        title: root?.title ?? "Untitled",
        url: root?.location?.href ?? null,
        messages: []
      };
    }
  };
}

function createPlugin(id, hostname, displayName = id) {
  return defineProviderPlugin({
    id,
    displayName,
    hosts: [hostname],
    createAdapter: () => createAdapter(id, hostname)
  });
}

test("ProviderRegistry lists registered adapters", () => {
  const registry = new ProviderRegistry([
    createPlugin("claude", "claude.ai", "Claude"),
    createPlugin("chatgpt", "chatgpt.com", "ChatGPT")
  ]);

  assert.deepEqual(
    registry.list().map(({ id }) => id),
    ["claude", "chatgpt"]
  );
});

test("ProviderRegistry finds an adapter by URL", () => {
  const registry = new ProviderRegistry([
    createPlugin("claude", "claude.ai", "Claude"),
    createPlugin("chatgpt", "chatgpt.com", "ChatGPT"),
    createPlugin("gemini", "gemini.google.com", "Gemini")
  ]);

  assert.equal(
    registry.find("https://claude.ai/chat/example")?.id,
    "claude"
  );
  assert.equal(
    registry.find("https://chatgpt.com/c/example")?.id,
    "chatgpt"
  );
  assert.equal(
    registry.find("https://gemini.google.com/app/example")?.id,
    "gemini"
  );
});

test("ProviderRegistry returns null for unsupported hosts", () => {
  const registry = new ProviderRegistry([
    createPlugin("claude", "claude.ai", "Claude")
  ]);

  assert.equal(registry.find("https://example.com"), null);
});

test("ProviderRegistry require throws for unsupported hosts", () => {
  const registry = new ProviderRegistry([
    createPlugin("claude", "claude.ai", "Claude")
  ]);

  assert.throws(
    () => registry.require("https://example.com"),
    ProviderNotFoundError
  );
});

test("ProviderRegistry delegates conversation reading", () => {
  const registry = new ProviderRegistry([
    createPlugin("chatgpt", "chatgpt.com", "ChatGPT")
  ]);

  const result = registry.readConversation(
    "https://chatgpt.com/c/example",
    {
      title: "AI Relay",
      location: {
        href: "https://chatgpt.com/c/example"
      }
    }
  );

  assert.equal(result.provider, "chatgpt");
  assert.equal(result.title, "AI Relay");
  assert.equal(result.url, "https://chatgpt.com/c/example");
});

test("default registry includes all initial providers", () => {
  const registry = new ProviderRegistry();

  assert.deepEqual(
    registry.list().map(({ id }) => id),
    ["claude", "chatgpt", "gemini"]
  );
});
