import test from "node:test";
import assert from "node:assert/strict";

import { ExportEngine } from "../packages/export/src/exporter.js";
import {
  ImportEngine,
  ImportValidationError,
  validateExportEnvelope
} from "../packages/importer/src/index.js";

const conversation = {
  provider: "chatgpt",
  title: "AI Relay import",
  url: "https://chatgpt.com/c/example",
  messages: [
    {
      role: "user",
      content: "Goal: Continue this project in another AI."
    },
    {
      role: "assistant",
      content: "Decision: Use a provider-neutral handoff."
    }
  ]
};

const handoff = {
  goal: "Continue this project in another AI.",
  currentTask: "Build the import engine.",
  constraints: ["Keep everything local."],
  decisions: ["Use a provider-neutral handoff."],
  pendingTasks: ["Connect import UI."]
};

test("validateExportEnvelope accepts supported exports", () => {
  const envelope = validateExportEnvelope({
    schema: "ai-relay.export",
    schemaVersion: 1,
    createdAt: "2026-07-13T15:00:00.000Z",
    source: {
      provider: "chatgpt",
      title: "AI Relay import",
      url: "https://chatgpt.com/c/example"
    },
    conversation: {
      messages: conversation.messages
    },
    handoff
  });

  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.source.provider, "chatgpt");
  assert.equal(envelope.conversation.messages.length, 2);
});

test("validateExportEnvelope rejects unsupported versions", () => {
  assert.throws(
    () =>
      validateExportEnvelope({
        schema: "ai-relay.export",
        schemaVersion: 999,
        source: {},
        conversation: {
          messages: []
        }
      }),
    ImportValidationError
  );
});

test("ImportEngine imports and verifies an ExportEngine result", async () => {
  const exporter = new ExportEngine();
  const exported = await exporter.create({
    conversation,
    handoff,
    createdAt: "2026-07-13T15:00:00.000Z"
  });

  const importer = new ImportEngine();
  const imported = await importer.import({
    captureJson: exported.files["capture.json"],
    checksumFile: exported.files["checksum.sha256"]
  });

  assert.equal(imported.checksumVerified, true);
  assert.equal(imported.envelope.source.title, "AI Relay import");
  assert.match(
    imported.continuationPrompt,
    /# Continue this AI Relay handoff/
  );
  assert.match(imported.continuationPrompt, /## Pending tasks/);
  assert.match(imported.continuationPrompt, /Connect import UI/);
});

test("ImportEngine rejects a checksum mismatch", async () => {
  const importer = new ImportEngine();

  await assert.rejects(
    importer.import({
      captureJson: JSON.stringify({
        schema: "ai-relay.export",
        schemaVersion: 1,
        source: {},
        conversation: {
          messages: []
        }
      }),
      checksumFile:
        "0000000000000000000000000000000000000000000000000000000000000000  capture.json\n"
    }),
    /checksum does not match/
  );
});

test("ImportEngine rejects invalid JSON", async () => {
  const importer = new ImportEngine();

  await assert.rejects(
    importer.import({
      captureJson: "{not-json}"
    }),
    /not valid JSON/
  );
});
