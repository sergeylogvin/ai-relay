import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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

test("inbox HTTP bridge stores handoff records", async () => {
  const { spawn } = await import("node:child_process");
  const directory = await mkdtemp(join(tmpdir(), "ai-relay-inbox-http-"));
  const serverPath = resolve(
    import.meta.dirname,
    "../apps/macos/shared/inbox-http-server.mjs"
  );

  const child = spawn(
    process.execPath,
    [serverPath],
    {
      env: {
        ...process.env,
        HOME: directory,
        AI_RELAY_INBOX_HTTP_PORT: "17832"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  try {
    await new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Inbox HTTP bridge did not start in time."));
      }, 5000);

      child.stderr.on("data", (chunk) => {
        if (String(chunk).includes("listening on")) {
          clearTimeout(timeout);
          resolvePromise();
        }
      });

      child.on("error", reject);
    });

    const response = await fetch("http://127.0.0.1:17832/handoff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        markdown: "# AI Relay Handoff\n\nНайкращий короп в Україні",
        metadata: {
          provider: "claude",
          title: "Найкращий короп в Україні",
          handoffMode: "context-pack"
        }
      })
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.title, "Найкращий короп в Україні");

    const loaded = await readHandoffInbox(
      join(directory, "Library/Application Support/AI Relay/pending-handoff.json")
    );
    assert.equal(loaded.title, "Найкращий короп в Україні");
  } finally {
    child.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  }
});
