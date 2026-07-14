import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeLibraryFilters,
  recordMatchesLibraryFilters,
  filterLibraryRecords,
  summarizeLibraryFilters
} from "../packages/library/src/filters.js";

const records = [
  {
    id: "r1",
    provider: "chatgpt",
    tags: ["seo", "research"],
    collectionIds: ["work"],
    pinned: true,
    url: "https://chatgpt.com/c/one",
    notes: "Weekly traffic review",
    content: "Search Console findings",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z"
  },
  {
    id: "r2",
    provider: "claude",
    tags: ["engineering"],
    collectionIds: ["product", "work"],
    pinned: false,
    notes: "",
    markdown: "Implementation notes",
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z"
  },
  {
    id: "r3",
    provider: "gemini",
    tags: ["seo", "ideas"],
    collectionIds: ["archive"],
    pinned: false,
    url: "",
    summary: "Archived keyword ideas",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z"
  }
];

test("filters by provider, tag, and collection", () => {
  const result = filterLibraryRecords({
    records,
    filters: {
      providers: ["chatgpt"],
      tags: ["seo"],
      collections: ["work"]
    }
  });

  assert.deepEqual(result.map((record) => record.id), ["r1"]);
});

test("supports all-match semantics for tags and collections", () => {
  assert.deepEqual(
    filterLibraryRecords({
      records,
      filters: {
        tags: ["seo", "research"],
        tagMode: "all"
      }
    }).map((record) => record.id),
    ["r1"]
  );

  assert.deepEqual(
    filterLibraryRecords({
      records,
      filters: {
        collections: ["product", "work"],
        collectionMode: "all"
      }
    }).map((record) => record.id),
    ["r2"]
  );
});

test("filters by presence and pinned state", () => {
  assert.deepEqual(
    filterLibraryRecords({
      records,
      filters: {
        pinned: true,
        hasUrl: true,
        hasNotes: true,
        hasContent: true
      }
    }).map((record) => record.id),
    ["r1"]
  );

  assert.deepEqual(
    filterLibraryRecords({
      records,
      filters: {
        hasUrl: false
      }
    }).map((record) => record.id),
    ["r2", "r3"]
  );
});

test("filters by inclusive date range", () => {
  const result = filterLibraryRecords({
    records,
    filters: {
      dateField: "updatedAt",
      from: "2026-07-10T08:00:00.000Z",
      to: "2026-07-14T08:00:00.000Z"
    }
  });

  assert.deepEqual(
    result.map((record) => record.id),
    ["r1", "r2"]
  );
});

test("combines multiple filters deterministically", () => {
  const filters = {
    tags: ["seo"],
    collections: ["work", "archive"],
    collectionMode: "any",
    hasNotes: true,
    pinned: false
  };

  assert.equal(recordMatchesLibraryFilters(records[2], filters), true);
  assert.equal(recordMatchesLibraryFilters(records[0], filters), false);
});

test("normalizes and summarizes active filters", () => {
  const normalized = normalizeLibraryFilters({
    providers: ["chatgpt", "chatgpt", ""],
    pinned: false
  });

  assert.deepEqual(normalized.providers, ["chatgpt"]);

  assert.deepEqual(
    summarizeLibraryFilters({
      providers: ["chatgpt"],
      pinned: false,
      hasUrl: true
    }),
    {
      active: [
        {
          type: "providers",
          mode: "any",
          values: ["chatgpt"]
        },
        {
          type: "pinned",
          value: false
        },
        {
          type: "hasUrl",
          value: true
        }
      ],
      count: 3,
      isEmpty: false
    }
  );
});

test("validates filter input", () => {
  assert.throws(
    () => filterLibraryRecords({ records: null }),
    /Records must be an array/
  );

  assert.throws(
    () => normalizeLibraryFilters({ tags: "seo" }),
    /tags must be an array/
  );

  assert.throws(
    () => normalizeLibraryFilters({ pinned: "yes" }),
    /pinned must be a boolean/
  );

  assert.throws(
    () =>
      normalizeLibraryFilters({
        from: "2026-07-14",
        to: "2026-07-01"
      }),
    /from must be earlier/
  );

  assert.throws(
    () => normalizeLibraryFilters({ dateField: "publishedAt" }),
    /dateField/
  );
});
