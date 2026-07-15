import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPORT_HANDOFF_MODES,
  renderHandoffByMode
} from "../packages/export/src/handoff-modes.js";

const conversation = {
  provider: "claude",
  title: "Migration test",
  url: "https://claude.ai/chat/example",
  messages: [
    { role: "user", content: "Message one" },
    { role: "assistant", content: "Reply one" },
    { role: "user", content: "Message two" },
    { role: "assistant", content: "Reply two" },
    { role: "user", content: "Message three" }
  ]
};

const handoff = {
  goal: "Build migration MVP",
  currentTask: "Message three",
  decisions: ["Use browser extension first"],
  constraints: ["Never auto-send"]
};

test("renderHandoffByMode supports the planned export modes", () => {
  assert.deepEqual(EXPORT_HANDOFF_MODES, [
    "full",
    "recent",
    "context-pack"
  ]);
});

test("renderHandoffByMode full mode keeps the entire transcript", () => {
  const markdown = renderHandoffByMode({
    conversation,
    handoff,
    mode: "full"
  });

  assert.match(markdown, /Message one/);
  assert.match(markdown, /Reply two/);
  assert.match(markdown, /Message three/);
  assert.match(markdown, /## Conversation/);
  assert.doesNotMatch(markdown, /Handoff mode:/);
});

test("renderHandoffByMode recent mode keeps structured context and recent messages only", () => {
  const markdown = renderHandoffByMode({
    conversation,
    handoff,
    mode: "recent",
    recentMessageLimit: 2
  });

  assert.match(markdown, /Handoff mode: recent messages/);
  assert.match(markdown, /Build migration MVP/);
  assert.match(markdown, /Message three/);
  assert.match(markdown, /Reply two/);
  assert.doesNotMatch(markdown, /Message one/);
  assert.doesNotMatch(markdown, /Reply one/);
});

test("renderHandoffByMode context-pack mode omits the transcript", () => {
  const markdown = renderHandoffByMode({
    conversation,
    handoff,
    mode: "context-pack"
  });

  assert.match(markdown, /Handoff mode: context pack/);
  assert.match(markdown, /Build migration MVP/);
  assert.match(markdown, /Use browser extension first/);
  assert.doesNotMatch(markdown, /## Conversation/);
  assert.doesNotMatch(markdown, /Reply two/);
});

test("renderHandoffByMode rejects unknown modes", () => {
  assert.throws(
    () =>
      renderHandoffByMode({
        conversation,
        handoff,
        mode: "summary"
      }),
    /Unsupported handoff mode/
  );
});
