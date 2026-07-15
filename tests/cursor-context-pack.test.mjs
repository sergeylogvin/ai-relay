import assert from "node:assert/strict";
import test from "node:test";

import { renderCursorContextPack } from "../packages/export/src/cursor-context-pack.js";

const sampleConversation = {
  provider: "claude",
  title: "Migration plan",
  url: "https://claude.ai/chat/example",
  messages: [
    { role: "user", content: "Start the migration." },
    { role: "assistant", content: "Captured the first step." }
  ]
};

const sampleHandoff = {
  currentTask: "Continue the browser migration MVP.",
  constraints: ["Local-first", "No auto-send"],
  decisions: ["Use context-pack for Cursor"]
};

test("renderCursorContextPack omits the transcript and keeps structured context", () => {
  const markdown = renderCursorContextPack({
    conversation: sampleConversation,
    handoff: sampleHandoff
  });

  assert.match(markdown, /# AI Relay Handoff/);
  assert.match(markdown, /Handoff mode: context pack/);
  assert.match(markdown, /## Current task/);
  assert.match(markdown, /Continue the browser migration MVP\./);
  assert.match(markdown, /## Constraints/);
  assert.match(markdown, /Local-first/);
  assert.match(markdown, /## Continuation instruction/);
  assert.doesNotMatch(markdown, /### USER/);
  assert.doesNotMatch(markdown, /Start the migration\./);
});
