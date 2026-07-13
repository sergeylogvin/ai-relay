import test from "node:test";
import assert from "node:assert/strict";

import {
  buildContinuationPrompt,
  getProviderUrl,
  listContinuationProviders
} from "../packages/core/src/continuation.js";

const record = {
  id: "capture-1",
  provider: "chatgpt",
  title: "AI Relay implementation",
  sourceUrl: "https://chatgpt.com/c/example",
  handoffMarkdown: "# Handoff\n\nContinue building the browser extension."
};

test("buildContinuationPrompt preserves handoff context", () => {
  const prompt = buildContinuationPrompt(record, {
    targetProvider: "claude"
  });

  assert.match(prompt, /Conversation title: AI Relay implementation/);
  assert.match(prompt, /Source AI provider: chatgpt/);
  assert.match(prompt, /Target AI provider: claude/);
  assert.match(prompt, /Continue building the browser extension/);
});

test("buildContinuationPrompt rejects missing handoff Markdown", () => {
  assert.throws(
    () => buildContinuationPrompt({ title: "Missing handoff" }),
    /no handoff Markdown/
  );
});

test("continuation providers expose supported destinations", () => {
  assert.equal(getProviderUrl("chatgpt"), "https://chatgpt.com/");
  assert.equal(getProviderUrl("claude"), "https://claude.ai/new");
  assert.equal(getProviderUrl("gemini"), "https://gemini.google.com/app");
  assert.equal(getProviderUrl("unsupported"), null);
  assert.deepEqual(
    listContinuationProviders().map(({ id }) => id),
    ["chatgpt", "claude", "gemini"]
  );
});
