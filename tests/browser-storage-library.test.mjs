import test from "node:test";
import assert from "node:assert/strict";

import {
  BrowserStorageLibraryAdapter,
  ConversationLibrary
} from "../packages/library/src/index.js";

function createFakeStorageArea() {
  const state = {};

  return {
    async get(key) {
      return { [key]: structuredClone(state[key]) };
    },
    async set(values) {
      Object.assign(state, structuredClone(values));
    }
  };
}

function buildRecord(overrides = {}) {
  return {
    id: "capture-1",
    provider: "chatgpt",
    title: "Browser storage test",
    sourceUrl: "https://chatgpt.com/c/example",
    createdAt: "2026-07-13T18:00:00.000Z",
    updatedAt: "2026-07-13T18:00:00.000Z",
    messageCount: 5,
    checksum: "abc123",
    handoffMarkdown: "# Handoff\n",
    captureJson: "{}\n",
    tags: [],
    ...overrides
  };
}

test("browser storage adapter persists records", async () => {
  const library = new ConversationLibrary(
    new BrowserStorageLibraryAdapter({
      storageArea: createFakeStorageArea()
    })
  );

  await library.save(buildRecord());
  const record = await library.get("capture-1");

  assert.equal(record.title, "Browser storage test");
});

test("browser storage adapter lists and deletes records", async () => {
  const library = new ConversationLibrary(
    new BrowserStorageLibraryAdapter({
      storageArea: createFakeStorageArea()
    })
  );

  await library.save(buildRecord());
  await library.save(buildRecord({ id: "capture-2" }));

  assert.equal((await library.list()).length, 2);

  await library.delete("capture-1");

  assert.deepEqual(
    (await library.list()).map(({ id }) => id),
    ["capture-2"]
  );
});

test("browser storage adapter clears records", async () => {
  const library = new ConversationLibrary(
    new BrowserStorageLibraryAdapter({
      storageArea: createFakeStorageArea()
    })
  );

  await library.save(buildRecord());
  await library.clear();

  assert.deepEqual(await library.list(), []);
});
