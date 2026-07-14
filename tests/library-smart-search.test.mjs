import test from "node:test";
import assert from "node:assert/strict";

import {
  smartSearchLibrary,
  highlightSearchTerms
} from "../packages/library/src/smart-search.js";

const collections = [
  { id: "seo", name: "SEO Research" },
  { id: "product", name: "Product Notes" }
];

const records = [
  {
    id: "r1",
    title: "Google Search Console analysis",
    provider: "chatgpt",
    url: "https://chatgpt.com/c/example",
    tags: ["seo", "gsc"],
    collectionIds: ["seo"],
    notes: "Weekly organic traffic investigation",
    updatedAt: "2026-07-14T08:00:00.000Z"
  },
  {
    id: "r2",
    title: "Gemini adapter implementation",
    provider: "gemini",
    url: "https://gemini.google.com/app/example",
    tags: ["engineering"],
    collectionIds: ["product"],
    notes: "Provider registry and browser integration",
    updatedAt: "2026-07-13T08:00:00.000Z"
  },
  {
    id: "r3",
    title: "Search console typo test",
    provider: "claude",
    url: "https://claude.ai/chat/example",
    tags: ["seo"],
    collectionIds: ["seo"],
    notes: "Tests fuzzy matching",
    pinned: true,
    updatedAt: "2026-07-12T08:00:00.000Z"
  }
];

test("ranks exact title and tag matches above weaker matches", () => {
  const results = smartSearchLibrary({
    records,
    collections,
    query: "google search console"
  });

  assert.equal(results[0].record.id, "r1");
  assert.ok(results[0].score > results[1].score);
  assert.ok(results[0].matchedFields.includes("title"));
  assert.ok(results[0].matchedFields.length > 0);
});

test("supports fuzzy matching for misspelled queries", () => {
  const results = smartSearchLibrary({
    records,
    collections,
    query: "serch consol"
  });

  assert.ok(results.length >= 2);
  assert.ok(["r1", "r3"].includes(results[0].record.id));
});

test("searches provider, domain, tags, and collection names", () => {
  assert.equal(
    smartSearchLibrary({
      records,
      collections,
      query: "gemini.google.com"
    })[0].record.id,
    "r2"
  );

  assert.ok(
    ["r1", "r3"].includes(
      smartSearchLibrary({
        records,
        collections,
        query: "SEO Research"
      })[0].record.id
    )
  );

  assert.equal(
    smartSearchLibrary({
      records,
      collections,
      query: "engineering"
    })[0].record.id,
    "r2"
  );
});

test("returns deterministic highlights", () => {
  assert.deepEqual(
    highlightSearchTerms("Google Search Console", ["search", "console"]),
    [
      { text: "Google ", match: false },
      { text: "Search", match: true },
      { text: " ", match: false },
      { text: "Console", match: true }
    ]
  );
});

test("returns an empty result for an empty query", () => {
  assert.deepEqual(
    smartSearchLibrary({
      records,
      collections,
      query: "   "
    }),
    []
  );
});

test("validates search inputs", () => {
  assert.throws(
    () => smartSearchLibrary({ records: null, query: "test" }),
    /Records must be an array/
  );

  assert.throws(
    () => smartSearchLibrary({ collections: null, query: "test" }),
    /Collections must be an array/
  );

  assert.throws(
    () => smartSearchLibrary({ records, query: "test", limit: 0 }),
    /positive integer/
  );
});
