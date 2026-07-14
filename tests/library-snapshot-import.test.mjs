import test from "node:test";
import assert from "node:assert/strict";

import {
  parseLibrarySnapshot,
  planLibrarySnapshotImport
} from "../packages/library/src/snapshot-import.js";

const snapshot = {
  schema: "ai-relay-library-snapshot",
  version: 1,
  exportedAt: "2026-07-14T08:00:00.000Z",
  records: [
    { id: "r1", title: "Imported" },
    { id: "r2", title: "New" }
  ],
  collections: [
    { id: "work", name: "Work" }
  ],
  tags: ["seo", "work", "seo"]
};

test("parses and normalizes a valid snapshot", () => {
  const parsed = parseLibrarySnapshot(JSON.stringify(snapshot));

  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.collections.length, 1);
  assert.deepEqual(parsed.tags, ["seo", "work"]);
});

test("plans merge imports without mutating the existing library", () => {
  const result = planLibrarySnapshotImport({
    snapshot,
    existingRecords: [
      { id: "r1", title: "Existing", pinned: true }
    ],
    existingCollections: [
      { id: "archive", name: "Archive" }
    ],
    existingTags: ["archive"],
    mode: "merge"
  });

  const mergedRecord = result.records.find((record) => record.id === "r1");

  assert.equal(result.mode, "merge");
  assert.equal(result.records.length, 2);
  assert.equal(mergedRecord.title, "Imported");
  assert.equal(mergedRecord.pinned, true);
  assert.equal(result.collections.length, 2);
  assert.deepEqual(result.tags, ["archive", "seo", "work"]);
  assert.deepEqual(result.summary, {
    addedRecords: 1,
    updatedRecords: 1,
    addedCollections: 1,
    updatedCollections: 0,
    addedTags: 2
  });
});

test("plans complete replacement imports", () => {
  const result = planLibrarySnapshotImport({
    snapshot,
    existingRecords: [{ id: "old" }],
    existingCollections: [{ id: "old" }],
    existingTags: ["old"],
    mode: "replace"
  });

  assert.deepEqual(result.records, snapshot.records);
  assert.deepEqual(result.collections, snapshot.collections);
  assert.deepEqual(result.tags, ["seo", "work"]);
});

test("rejects invalid schemas, versions, and modes", () => {
  assert.throws(
    () => parseLibrarySnapshot("{invalid"),
    /valid JSON/
  );

  assert.throws(
    () =>
      parseLibrarySnapshot({
        ...snapshot,
        schema: "other"
      }),
    /Unsupported snapshot schema/
  );

  assert.throws(
    () =>
      parseLibrarySnapshot({
        ...snapshot,
        version: 99
      }),
    /Unsupported snapshot version/
  );

  assert.throws(
    () =>
      planLibrarySnapshotImport({
        snapshot,
        mode: "append"
      }),
    /Import mode/
  );
});
