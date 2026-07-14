import test from "node:test";
import assert from "node:assert/strict";

import {
  LIBRARY_SNAPSHOT_VERSION,
  createLibrarySnapshot,
  serializeLibrarySnapshot,
  getLibrarySnapshotFilename
} from "../packages/library/src/snapshot.js";

test("creates a deterministic full-library snapshot", () => {
  const snapshot = createLibrarySnapshot({
    records: [
      { id: "b", title: "Second" },
      { id: "a", title: "First" }
    ],
    collections: [
      { id: "work", name: "Work" },
      { id: "archive", name: "Archive" }
    ],
    tags: ["seo", "work", "seo", ""],
    exportedAt: "2026-07-14T08:00:00.000Z"
  });

  assert.equal(snapshot.schema, "ai-relay-library-snapshot");
  assert.equal(snapshot.version, LIBRARY_SNAPSHOT_VERSION);
  assert.deepEqual(snapshot.counts, {
    records: 2,
    collections: 2,
    tags: 4
  });
  assert.deepEqual(snapshot.records.map((record) => record.id), ["a", "b"]);
  assert.deepEqual(
    snapshot.collections.map((collection) => collection.id),
    ["archive", "work"]
  );
  assert.deepEqual(snapshot.tags, ["seo", "work"]);
});

test("serializes snapshots as readable JSON with a trailing newline", () => {
  const snapshot = createLibrarySnapshot({
    exportedAt: "2026-07-14T08:00:00.000Z"
  });

  const serialized = serializeLibrarySnapshot(snapshot);

  assert.equal(serialized.endsWith("\n"), true);
  assert.deepEqual(JSON.parse(serialized), snapshot);
});

test("builds a stable dated export filename", () => {
  assert.equal(
    getLibrarySnapshotFilename("2026-07-14T08:00:00.000Z"),
    "ai-relay-library-2026-07-14.json"
  );
});

test("validates snapshot input", () => {
  assert.throws(
    () => createLibrarySnapshot({ records: null }),
    /Records must be an array/
  );

  assert.throws(
    () => createLibrarySnapshot({ collections: null }),
    /Collections must be an array/
  );

  assert.throws(
    () => createLibrarySnapshot({ tags: null }),
    /Tags must be an array/
  );

  assert.throws(
    () => createLibrarySnapshot({ exportedAt: "invalid" }),
    /valid ISO date/
  );
});
