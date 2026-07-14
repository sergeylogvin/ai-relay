import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PROVIDER_PLUGINS,
  DuplicateProviderError,
  ProviderRegistry,
  defineProviderPlugin
} from "../packages/providers/src/index.js";

function createTestAdapter(id, hostname) {
  return {
    id,
    matches(input) {
      const value =
        typeof input === "string" ? new URL(input).hostname : input?.hostname;
      return value === hostname;
    },
    capabilities() {
      return Object.freeze({
        readConversation: true,
        insertContext: false,
        uploadFiles: false,
        readLimits: false
      });
    },
    readConversation() {
      return Object.freeze({
        provider: id,
        title: "Test",
        url: `https://${hostname}/chat/test`,
        messages: Object.freeze([])
      });
    }
  };
}

test("default provider plugins expose metadata", () => {
  const registry = new ProviderRegistry();
  const providers = registry.list();

  assert.equal(providers.length, 3);
  assert.deepEqual(
    providers.map(({ id }) => id),
    ["claude", "chatgpt", "gemini"]
  );
  assert.deepEqual(providers[0].hosts, ["claude.ai"]);
  assert.equal(providers[1].displayName, "ChatGPT");
});

test("custom plugins can be injected without changing the registry", () => {
  const plugin = defineProviderPlugin({
    id: "example",
    displayName: "Example AI",
    hosts: ["example.ai"],
    createAdapter: () => createTestAdapter("example", "example.ai")
  });

  const registry = new ProviderRegistry([plugin]);

  assert.equal(
    registry.require("https://example.ai/chat/123").id,
    "example"
  );
});

test("plugins can be registered after construction", () => {
  const registry = new ProviderRegistry([]);
  const plugin = defineProviderPlugin({
    id: "later",
    displayName: "Later AI",
    hosts: ["later.ai"],
    createAdapter: () => createTestAdapter("later", "later.ai")
  });

  registry.register(plugin);

  assert.equal(registry.list()[0].id, "later");
});

test("duplicate provider ids are rejected", () => {
  const plugin = DEFAULT_PROVIDER_PLUGINS[0];
  const registry = new ProviderRegistry([plugin]);

  assert.throws(
    () => registry.register(plugin),
    DuplicateProviderError
  );
});

test("invalid adapters are rejected at registration time", () => {
  assert.throws(
    () =>
      defineProviderPlugin({
        id: "broken",
        displayName: "Broken",
        hosts: ["broken.ai"],
        createAdapter: () => ({ id: "broken" })
      }).createAdapter(),
    /must implement matches/
  );
});
