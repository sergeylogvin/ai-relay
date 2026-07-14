import test from "node:test";
import assert from "node:assert/strict";

import {
  planLibraryCleanup
} from "../packages/library/src/cleanup.js";

test("plans removal of empty collections and orphan tags", () => {
  const result = planLibraryCleanup({
    records: [
      {
        id: "r1",
        tags: ["seo", "seo", "work"],
        collectionIds: ["active", "active"]
      },
      {
        id: "r2",
        tags: ["research"],
        collectionIds: ["research"]
      }
    ],
    collections: [
      { id: "active", name: "Active" },
      { id: "research", name: "Research" },
      { id: "empty", name: "Empty" }
    ],
    tags: ["seo", "work", "research", "unused"]
  });

  assert.deepEqual(result.emptyCollectionIds, ["empty"]);
  assert.deepEqual(result.orphanTags, ["unused"]);
  assert.deepEqual(result.changedRecordIds, ["r1"]);
  assert.deepEqual(result.normalizedRecords[0].tags, ["seo", "work"]);
  assert.deepEqual(result.normalizedRecords[0].collectionIds, ["active"]);
  assert.equal(result.hasChanges, true);
});

test("returns a no-op cleanup plan for a normalized library", () => {
  const result = planLibraryCleanup({
    records: [
      {
        id: "r1",
        tags: ["seo"],
        collectionIds: ["active"]
      }
    ],
    collections: [{ id: "active", name: "Active" }],
    tags: ["seo"]
  });

  assert.deepEqual(result.emptyCollectionIds, []);
  assert.deepEqual(result.orphanTags, []);
  assert.deepEqual(result.changedRecordIds, []);
  assert.equal(result.hasChanges, false);
});

test("validates cleanup inputs", () => {
  assert.throws(
    () => planLibraryCleanup({ records: null }),
    /Records must be an array/
  );

  assert.throws(
    () => planLibraryCleanup({ collections: null }),
    /Collections must be an array/
  );

  assert.throws(
    () => planLibraryCleanup({ tags: null }),
    /Tags must be an array/
  );
});
