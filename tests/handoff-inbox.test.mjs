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

    const health = await fetch("http://127.0.0.1:17832/health");
    const healthBody = await health.json();
    assert.equal(healthBody.features?.pasteRequests, true);

    const loaded = await readHandoffInbox(
      join(directory, "Library/Application Support/AI Relay/pending-handoff.json")
    );
    assert.equal(loaded.title, "Найкращий короп в Україні");
  } finally {
    child.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  }
});

test("inbox HTTP bridge writes paste requests for cursor auto-paste", async () => {
  const { spawn } = await import("node:child_process");
  const directory = await mkdtemp(join(tmpdir(), "ai-relay-inbox-http-"));
  const serverPath = resolve(
    import.meta.dirname,
    "../apps/macos/shared/inbox-http-server.mjs"
  );
  const { readPasteRequest } = await import("../apps/macos/shared/paste-request.mjs");

  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      HOME: directory,
      AI_RELAY_INBOX_HTTP_PORT: "17833"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

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

    const response = await fetch("http://127.0.0.1:17833/handoff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        markdown: "# Cursor Context Pack\n\nContinue here.",
        metadata: {
          provider: "claude",
          title: "Cursor task",
          handoffMode: "context-pack",
          targetApp: "cursor",
          pasteRequested: true
        }
      })
    });

    assert.equal(response.status, 200);

    const pasteRequest = await readPasteRequest(
      join(directory, "Library/Application Support/AI Relay/pending-paste-request.json")
    );

    assert.equal(pasteRequest.targetApp, "cursor");
    assert.equal(typeof pasteRequest.storedAt, "string");
  } finally {
    child.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  }
});

test("inbox HTTP bridge writes paste requests for ChatGPT desktop auto-paste", async () => {
  const { spawn } = await import("node:child_process");
  const directory = await mkdtemp(join(tmpdir(), "ai-relay-inbox-http-"));
  const serverPath = resolve(
    import.meta.dirname,
    "../apps/macos/shared/inbox-http-server.mjs"
  );
  const { readPasteRequest } = await import("../apps/macos/shared/paste-request.mjs");

  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      HOME: directory,
      AI_RELAY_INBOX_HTTP_PORT: "17834"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

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

    const response = await fetch("http://127.0.0.1:17834/handoff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        markdown: "# AI Relay Handoff\n\nContinue in ChatGPT.",
        metadata: {
          provider: "claude",
          title: "Desktop task",
          handoffMode: "context-pack",
          targetApp: "chatgpt",
          pasteRequested: true
        }
      })
    });

    assert.equal(response.status, 200);

    const pasteRequest = await readPasteRequest(
      join(directory, "Library/Application Support/AI Relay/pending-paste-request.json")
    );

    assert.equal(pasteRequest.targetApp, "chatgpt");
    assert.equal(typeof pasteRequest.storedAt, "string");
  } finally {
    child.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  }
});

test("inbox HTTP bridge clears stale paste requests on capture-only sync", async () => {
  const { spawn } = await import("node:child_process");
  const directory = await mkdtemp(join(tmpdir(), "ai-relay-inbox-http-"));
  const serverPath = resolve(
    import.meta.dirname,
    "../apps/macos/shared/inbox-http-server.mjs"
  );
  const { readPasteRequest } = await import("../apps/macos/shared/paste-request.mjs");
  const pasteRequestPath = join(
    directory,
    "Library/Application Support/AI Relay/pending-paste-request.json"
  );

  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      HOME: directory,
      AI_RELAY_INBOX_HTTP_PORT: "17835"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

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

    await fetch("http://127.0.0.1:17835/handoff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        markdown: "# AI Relay Handoff\n\nPaste me.",
        metadata: {
          provider: "claude",
          title: "Paste task",
          targetApp: "chatgpt",
          pasteRequested: true
        }
      })
    });

    assert.equal((await readPasteRequest(pasteRequestPath))?.targetApp, "chatgpt");

    await fetch("http://127.0.0.1:17835/handoff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        markdown: "# AI Relay Handoff\n\nCapture only.",
        metadata: {
          provider: "claude",
          title: "Capture task"
        }
      })
    });

    assert.equal(await readPasteRequest(pasteRequestPath), null);
  } finally {
    child.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  }
});
