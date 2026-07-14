import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PROVIDER_CAPABILITIES,
  PROVIDER_CAPABILITIES,
  ProviderRegistry,
  defineProviderPlugin,
  normalizeProviderCapabilities,
  supportsCapability
} from "../packages/providers/src/index.js";

function createPlugin(id, hostname, capabilities) {
  return defineProviderPlugin({
    id,
    displayName: id,
    hosts: [hostname],
    createAdapter: () => ({
      id,
      matches(input) {
        const value =
          typeof input === "string"
            ? new URL(input).hostname
            : input?.hostname ?? "";
        return value === hostname;
      },
      capabilities() {
        return capabilities;
      },
      readConversation() {
        return {
          provider: id,
          title: "Test",
          url: `https://${hostname}`,
          messages: []
        };
      }
    })
  });
}

test("normalizeProviderCapabilities fills missing values", () => {
  const capabilities = normalizeProviderCapabilities({
    readConversation: true,
    uploadFiles: true
  });

  assert.deepEqual(capabilities, {
    ...DEFAULT_PROVIDER_CAPABILITIES,
    readConversation: true,
    uploadFiles: true
  });

  assert.equal(Object.isFrozen(capabilities), true);
});

test("normalizeProviderCapabilities ignores unknown keys", () => {
  const capabilities = normalizeProviderCapabilities({
    readConversation: true,
    experimentalThing: true
  });

  assert.equal(capabilities.readConversation, true);
  assert.equal("experimentalThing" in capabilities, false);
});

test("supportsCapability validates capability names", () => {
  const capabilities = normalizeProviderCapabilities({
    artifacts: true
  });

  assert.equal(
    supportsCapability(capabilities, PROVIDER_CAPABILITIES.ARTIFACTS),
    true
  );

  assert.throws(
    () => supportsCapability(capabilities, "unknownCapability"),
    /Unknown provider capability/
  );
});

test("ProviderRegistry exposes normalized capabilities", () => {
  const registry = new ProviderRegistry([
    createPlugin("example", "example.ai", {
      readConversation: true,
      uploadFiles: true
    })
  ]);

  assert.deepEqual(
    registry.getCapabilities("https://example.ai/chat/1"),
    {
      ...DEFAULT_PROVIDER_CAPABILITIES,
      readConversation: true,
      uploadFiles: true
    }
  );

  assert.equal(
    registry.supports(
      "https://example.ai/chat/1",
      PROVIDER_CAPABILITIES.UPLOAD_FILES
    ),
    true
  );
});

test("ProviderRegistry filters providers by capability", () => {
  const registry = new ProviderRegistry([
    createPlugin("alpha", "alpha.ai", {
      readConversation: true,
      artifacts: true
    }),
    createPlugin("beta", "beta.ai", {
      readConversation: true,
      artifacts: false
    })
  ]);

  assert.deepEqual(
    registry
      .providersSupporting(PROVIDER_CAPABILITIES.ARTIFACTS)
      .map(({ id }) => id),
    ["alpha"]
  );
});
