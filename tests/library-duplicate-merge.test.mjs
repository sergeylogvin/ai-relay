import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeDuplicateGroup
} from "../packages/library/src/merge-duplicates.js";

const records = [
  {
    id: "newer",
    provider: "chatgpt",
    sourceUrl: "https://chatgpt.com/c/example?utm_source=test",
    title: "SEO plan",
    tags: ["seo", "work"],
    collectionIds: ["active"],
    pinned: false,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z"
  },
  {
    id: "older",
    provider: "chatgpt",
    sourceUrl: "https://chatgpt.com/c/example#section",
    title: "SEO plan — detailed working copy",
    tags: ["seo", "archive"],
    collectionIds: ["research"],
    pinned: true,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-12T08:00:00.000Z"
  }
];

test("merges duplicate metadata into the selected canonical record", () => {
  const result = mergeDuplicateGroup(records, "newer");

  assert.equal(result.canonical.id, "newer");
  assert.deepEqual(
    [...result.canonical.tags].sort(),
    ["archive", "seo", "work"]
  );
  assert.deepEqual(
    [...result.canonical.collectionIds].sort(),
    ["active", "research"]
  );
  assert.equal(result.canonical.pinned, true);
  assert.equal(
    result.canonical.createdAt,
    "2026-07-01T08:00:00.000Z"
  );
  assert.equal(
    result.canonical.updatedAt,
    "2026-07-14T08:00:00.000Z"
  );
  assert.deepEqual(result.canonical.mergedFromIds, ["older"]);
  assert.deepEqual(result.obsoleteIds, ["older"]);
});

test("preserves canonical identity and title", () => {
  const result = mergeDuplicateGroup(records, "newer");

  assert.equal(result.canonical.id, "newer");
  assert.equal(result.canonical.title, "SEO plan");
});

test("rejects records from different duplicate groups", () => {
  assert.throws(
    () =>
      mergeDuplicateGroup(
        [
          records[0],
          {
            ...records[1],
            id: "different",
            sourceUrl: "https://chatgpt.com/c/another"
          }
        ],
        "newer"
      ),
    /same duplicate group/
  );
});

test("requires a canonical record from the supplied group", () => {
  assert.throws(
    () => mergeDuplicateGroup(records, "missing"),
    /canonical record/
  );
});
