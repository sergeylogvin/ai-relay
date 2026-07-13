import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryBackup,
  importLibraryBackup,
  serializeLibraryBackup,
  validateLibraryBackup
} from "../packages/library/src/backup.js";
import { ConversationLibrary } from "../packages/library/src/library.js";
import { MemoryLibraryAdapter } from "../packages/library/src/memory-adapter.js";

const record = {
  id: "record-1",
  provider: "chatgpt",
  title: "AI Relay",
  sourceUrl: "https://chatgpt.com/c/example",
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T11:00:00.000Z",
  messageCount: 4,
  checksum: "abc123",
  handoffMarkdown: "# Handoff\n\nContinue implementation.",
  captureJson: '{"messages":[]}',
  tags: ["product"]
};

test("creates a versioned library backup", () => {
  const backup = createLibraryBackup([record], {
    exportedAt: "2026-07-13T12:00:00.000Z"
  });

  assert.equal(backup.format, "ai-relay-library");
  assert.equal(backup.version, 1);
  assert.equal(backup.count, 1);
  assert.equal(backup.records[0].id, "record-1");
});

test("serializes and validates a library backup", () => {
  const serialized = serializeLibraryBackup([record]);
  const validated = validateLibraryBackup(serialized);

  assert.equal(validated.count, 1);
  assert.equal(validated.records[0].title, "AI Relay");
});

test("rejects unsupported backup payloads", () => {
  assert.throws(
    () => validateLibraryBackup('{"format":"unknown","version":1,"records":[]}'),
    /Unsupported backup format/
  );

  assert.throws(
    () => validateLibraryBackup("not json"),
    /not valid JSON/
  );
});

test("imports backups in merge mode", async () => {
  const library = new ConversationLibrary(new MemoryLibraryAdapter());

  const result = await importLibraryBackup(
    library,
    serializeLibraryBackup([record])
  );

  assert.deepEqual(result, {
    imported: 1,
    mode: "merge"
  });

  assert.equal((await library.list()).length, 1);
});

test("imports backups in replace mode", async () => {
  const library = new ConversationLibrary(new MemoryLibraryAdapter());

  await library.save({
    ...record,
    id: "old-record"
  });

  const result = await importLibraryBackup(
    library,
    serializeLibraryBackup([record]),
    { replace: true }
  );

  assert.deepEqual(result, {
    imported: 1,
    mode: "replace"
  });

  const records = await library.list();
  assert.deepEqual(records.map(({ id }) => id), ["record-1"]);
});
