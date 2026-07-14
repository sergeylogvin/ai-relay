import test from "node:test";
import assert from "node:assert/strict";

import {
  PENDING_HANDOFF_KEY,
  clearPendingHandoff,
  loadPendingHandoff,
  savePendingHandoff
} from "../apps/browser/src/handoff-session-storage.js";

function createMemoryStorageArea() {
  const values = new Map();

  return {
    async set(items) {
      for (const [key, value] of Object.entries(items)) {
        values.set(key, value);
      }
    },
    async get(key) {
      return values.has(key) ? { [key]: values.get(key) } : {};
    },
    async remove(key) {
      values.delete(key);
    }
  };
}

test("pending handoff survives popup instances in session storage", async () => {
  const storage = createMemoryStorageArea();
  const capture = {
    provider: "claude",
    title: "Portable context",
    files: { "handoff.md": "# AI Relay Handoff" }
  };

  await savePendingHandoff(capture, storage);

  assert.deepEqual(await loadPendingHandoff(storage), capture);
});

test("pending handoff can be cleared explicitly", async () => {
  const storage = createMemoryStorageArea();

  await storage.set({ [PENDING_HANDOFF_KEY]: { provider: "claude" } });
  await clearPendingHandoff(storage);

  assert.equal(await loadPendingHandoff(storage), null);
});

test("pending handoff storage rejects missing captures", async () => {
  const storage = createMemoryStorageArea();

  await assert.rejects(
    savePendingHandoff(null, storage),
    /capture is required/i
  );
});
