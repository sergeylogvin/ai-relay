import test from "node:test";
import assert from "node:assert/strict";

import {
  filterLibraryRecords,
  listLibraryCollections,
  updateRecordOrganization
} from "../packages/library/src/organization.js";

const records = [
  {
    id: "one",
    provider: "chatgpt",
    title: "SEO roadmap",
    sourceUrl: "https://chatgpt.com/c/one",
    handoffMarkdown: "Roadmap",
    tags: ["seo"],
    collection: "Work",
    pinned: false
  },
  {
    id: "two",
    provider: "claude",
    title: "Travel research",
    sourceUrl: "https://claude.ai/chat/two",
    handoffMarkdown: "Travel",
    tags: ["research"],
    collection: "Personal",
    pinned: false
  }
];

test("lists unique non-empty collections", () => {
  assert.deepEqual(listLibraryCollections(records), ["Personal", "Work"]);
});

test("updates a record collection", () => {
  const updated = updateRecordOrganization(records[0], {
    collection: " Research "
  });

  assert.equal(updated.collection, "Research");
});

test("filters records by collection", () => {
  assert.deepEqual(
    filterLibraryRecords(records, { collection: "work" }).map(({ id }) => id),
    ["one"]
  );
});

test("includes collection names in text search", () => {
  assert.deepEqual(
    filterLibraryRecords(records, { query: "personal" }).map(({ id }) => id),
    ["two"]
  );
});
