import assert from "node:assert/strict";
import test from "node:test";

import {
  collectCaptureMetadata,
  estimateTokens,
  extractConversationId
} from "../apps/browser/src/capture-metadata.js";

test("extractConversationId reads supported URL shapes", () => {
  assert.equal(
    extractConversationId("https://claude.ai/chat/abc-123"),
    "abc-123"
  );
  assert.equal(
    extractConversationId("https://chatgpt.com/c/conversation-42"),
    "conversation-42"
  );
});

test("estimateTokens returns a deterministic approximation", () => {
  assert.equal(
    estimateTokens([{ role: "user", content: "12345678" }]),
    2
  );
});

test("collectCaptureMetadata returns portable metadata", () => {
  const root = {
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  const metadata = collectCaptureMetadata({
    conversation: {
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" }
      ]
    },
    root,
    url: "https://claude.ai/chat/demo-id",
    capturedAt: "2026-07-14T10:00:00.000Z"
  });

  assert.deepEqual(metadata, {
    providerVersion: "web",
    conversationId: "demo-id",
    capturedAt: "2026-07-14T10:00:00.000Z",
    model: null,
    messageCount: 2,
    estimatedTokens: 4,
    attachmentCount: 0,
    imageCount: 0,
    artifactCount: 0
  });
});
