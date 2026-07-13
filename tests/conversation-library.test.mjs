import test from "node:test";
import assert from "node:assert/strict";

import {
  ConversationLibrary,
  LibraryRecordNotFoundError,
  MemoryLibraryAdapter,
  createLibraryRecord,
  matchesLibraryQuery
} from "../packages/library/src/index.js";

function buildRecord(overrides = {}) {
  return {
    id: "record-1",
    provider: "claude",
    title: "AI Relay roadmap",
    sourceUrl: "https://claude.ai/chat/example",
    createdAt: "2026-07-13T15:00:00.000Z",
    updatedAt: "2026-07-13T15:00:00.000Z",
    messageCount: 12,
    checksum: "abc123",
    handoffMarkdown: "# AI Relay Handoff\n\nPending tasks: library",
    captureJson: "{\"schema\":\"ai-relay.export\"}\n",
    tags: ["Product", "Alpha"],
    ...overrides
  };
}

test("createLibraryRecord normalizes title and tags", () => {
  const record = createLibraryRecord(buildRecord());

  assert.equal(record.title, "AI Relay roadmap");
  assert.deepEqual(record.tags, ["alpha", "product"]);
});

test("matchesLibraryQuery searches title, provider, tags, and handoff", () => {
  const record = createLibraryRecord(buildRecord());

  assert.equal(matchesLibraryQuery(record, "relay roadmap"), true);
  assert.equal(matchesLibraryQuery(record, "claude alpha"), true);
  assert.equal(matchesLibraryQuery(record, "pending library"), true);
  assert.equal(matchesLibraryQuery(record, "gemini"), false);
});

test("ConversationLibrary saves and retrieves records", async () => {
  const library = new ConversationLibrary(
    new MemoryLibraryAdapter()
  );

  await library.save(buildRecord());
  const record = await library.get("record-1");

  assert.equal(record.provider, "claude");
  assert.equal(record.messageCount, 12);
});

test("ConversationLibrary updates records without changing createdAt", async () => {
  const library = new ConversationLibrary(
    new MemoryLibraryAdapter()
  );

  await library.save(buildRecord());
  await library.save(
    buildRecord({
      title: "Updated roadmap",
      updatedAt: "2026-07-13T16:00:00.000Z"
    })
  );

  const record = await library.get("record-1");

  assert.equal(record.title, "Updated roadmap");
  assert.equal(record.createdAt, "2026-07-13T15:00:00.000Z");
  assert.equal(record.updatedAt, "2026-07-13T16:00:00.000Z");
});

test("ConversationLibrary lists newest records first", async () => {
  const library = new ConversationLibrary(
    new MemoryLibraryAdapter()
  );

  await library.save(
    buildRecord({
      id: "older",
      title: "Older",
      updatedAt: "2026-07-13T15:00:00.000Z"
    })
  );

  await library.save(
    buildRecord({
      id: "newer",
      title: "Newer",
      updatedAt: "2026-07-13T17:00:00.000Z"
    })
  );

  const records = await library.list();

  assert.deepEqual(
    records.map(({ id }) => id),
    ["newer", "older"]
  );
});

test("ConversationLibrary filters by query, provider, and tags", async () => {
  const library = new ConversationLibrary(
    new MemoryLibraryAdapter()
  );

  await library.save(buildRecord());

  await library.save(
    buildRecord({
      id: "record-2",
      provider: "gemini",
      title: "SEO planning",
      tags: ["seo"],
      handoffMarkdown: "# SEO handoff"
    })
  );

  const records = await library.list({
    query: "relay",
    provider: "claude",
    tags: ["alpha"]
  });

  assert.deepEqual(records.map(({ id }) => id), ["record-1"]);
});

test("ConversationLibrary deletes records", async () => {
  const library = new ConversationLibrary(
    new MemoryLibraryAdapter()
  );

  await library.save(buildRecord());
  await library.delete("record-1");

  await assert.rejects(
    library.get("record-1"),
    LibraryRecordNotFoundError
  );
});
