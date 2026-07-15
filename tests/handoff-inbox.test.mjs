import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  normalizeHandoffInboxRecord,
  readHandoffInbox,
  resolveHandoffInboxPath,
  writeHandoffInbox
} from "../apps/macos/shared/handoff-inbox.mjs";

test("resolveHandoffInboxPath uses Application Support", () => {
  assert.equal(
    resolveHandoffInboxPath("/Users/example"),
    "/Users/example/Library/Application Support/AI Relay/pending-handoff.json"
  );
});

test("writeHandoffInbox persists a normalized record", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-relay-inbox-"));
  const inboxPath = join(directory, "pending-handoff.json");

  try {
    const record = await writeHandoffInbox(
      {
        markdown: "# AI Relay Handoff\n\nContinue here.",
        metadata: {
          provider: "claude",
          title: "Migration plan",
          url: "https://claude.ai/chat/example",
          handoffMode: "context-pack"
        },
        storedAt: "2026-07-15T08:00:00.000Z"
      },
      inboxPath
    );

    assert.equal(record.provider, "claude");
    assert.equal(record.title, "Migration plan");
    assert.equal(record.handoffMode, "context-pack");
    assert.equal(
      record.characters,
      "# AI Relay Handoff\n\nContinue here.".length
    );

    const persisted = JSON.parse(await readFile(inboxPath, "utf8"));
    assert.equal(persisted.markdown, "# AI Relay Handoff\n\nContinue here.");

    const loaded = await readHandoffInbox(inboxPath);
    assert.equal(loaded.title, "Migration plan");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("readHandoffInbox returns null for a missing file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-relay-inbox-"));

  try {
    assert.equal(
      await readHandoffInbox(join(directory, "missing.json")),
      null
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("normalizeHandoffInboxRecord rejects empty markdown", () => {
  assert.throws(
    () =>
      normalizeHandoffInboxRecord({
        markdown: "   "
      }),
    /markdown is required/i
  );
});
