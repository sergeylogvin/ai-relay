import test from "node:test";
import assert from "node:assert/strict";

import {
  filterLibraryRecords,
  listLibraryTags,
  normalizeTags,
  sortLibraryRecords,
  updateRecordOrganization
} from "../packages/library/src/organization.js";

const records = [
  {
    id: "one",
    provider: "chatgpt",
    title: "Product strategy",
    sourceUrl: "https://chatgpt.com/c/one",
    updatedAt: "2026-07-11T10:00:00.000Z",
    handoffMarkdown: "Roadmap and priorities",
    tags: ["product", "roadmap"],
    pinned: false
  },
  {
    id: "two",
    provider: "claude",
    title: "Research notes",
    sourceUrl: "https://claude.ai/chat/two",
    updatedAt: "2026-07-13T10:00:00.000Z",
    handoffMarkdown: "Competitive research",
    tags: ["research"],
    pinned: true
  }
];

test("normalizes and deduplicates tags", () => {
  assert.deepEqual(
    normalizeTags([" Product ", "product", "Long Term"]),
    ["long-term", "product"]
  );
});

test("updates tags and pinned state", () => {
  const updated = updateRecordOrganization(records[0], {
    tags: ["Product", "Important"],
    pinned: true
  });

  assert.deepEqual(updated.tags, ["important", "product"]);
  assert.equal(updated.pinned, true);
});

test("lists unique library tags", () => {
  assert.deepEqual(
    listLibraryTags(records),
    ["product", "research", "roadmap"]
  );
});

test("filters and sorts organized records", () => {
  assert.deepEqual(
    filterLibraryRecords(records, {
      tag: "research",
      pinnedOnly: true
    }).map(({ id }) => id),
    ["two"]
  );

  assert.deepEqual(
    sortLibraryRecords(records).map(({ id }) => id),
    ["two", "one"]
  );
});
