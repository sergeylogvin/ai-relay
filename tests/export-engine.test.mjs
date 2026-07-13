import test from "node:test";
import assert from "node:assert/strict";

import {
  ExportEngine,
  createExportEnvelope,
  renderHandoffMarkdown,
  serializeDeterministically,
  sha256
} from "../packages/export/src/index.js";

const conversation = {
  provider: "claude",
  title: "AI Relay alpha",
  url: "https://claude.ai/chat/example",
  messages: [
    {
      role: "user",
      content: "Goal: Ship the first alpha."
    },
    {
      role: "assistant",
      content: "Decision: Keep the product local-first."
    }
  ]
};

const handoff = {
  goal: "Ship the first alpha.",
  currentTask: "Build the export engine.",
  constraints: ["Local only"],
  decisions: ["Keep the product local-first."],
  completedWork: ["Provider adapters"],
  pendingTasks: ["Package the extension"],
  references: ["README.md"],
  fileReferences: [],
  notes: ["Review before copying"]
};

test("createExportEnvelope creates a versioned export object", () => {
  const envelope = createExportEnvelope({
    conversation,
    handoff,
    createdAt: "2026-07-13T12:00:00.000Z"
  });

  assert.equal(envelope.schema, "ai-relay.export");
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.source.provider, "claude");
  assert.equal(envelope.conversation.messages.length, 2);
});

test("serializeDeterministically sorts object keys", () => {
  const left = serializeDeterministically({
    z: 1,
    a: {
      d: 2,
      b: 1
    }
  });

  const right = serializeDeterministically({
    a: {
      b: 1,
      d: 2
    },
    z: 1
  });

  assert.equal(left, right);
});

test("renderHandoffMarkdown creates readable output", () => {
  const markdown = renderHandoffMarkdown({
    conversation,
    handoff
  });

  assert.match(markdown, /# AI Relay Handoff/);
  assert.match(markdown, /## Goal/);
  assert.match(markdown, /Ship the first alpha/);
  assert.match(markdown, /## Decisions/);
  assert.match(markdown, /Keep the product local-first/);
  assert.match(markdown, /## Conversation/);
});

test("sha256 returns a stable digest", async () => {
  assert.equal(
    await sha256("AI Relay"),
    "616dbe3d31fd06717f2c31273cc53c51460fca0ec307bbf65e6aac78f775c412"
  );
});

test("ExportEngine creates the expected files", async () => {
  const engine = new ExportEngine();

  const result = await engine.create({
    conversation,
    handoff,
    createdAt: "2026-07-13T12:00:00.000Z"
  });

  assert.deepEqual(Object.keys(result.files).sort(), [
    "capture.json",
    "checksum.sha256",
    "handoff.md"
  ]);

  assert.match(result.files["capture.json"], /"schema": "ai-relay.export"/);
  assert.match(result.files["handoff.md"], /Build the export engine/);
  assert.match(
    result.files["checksum.sha256"],
    new RegExp(`^${result.checksum}  capture\\.json`)
  );
});
