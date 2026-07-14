import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCollection,
  sortCollections,
  countCollectionRecords,
  buildCollectionViewModel,
  createCollectionId
} from "../apps/browser/src/collections-ui.js";

test("normalizes collection display data", () => {
  assert.deepEqual(
    normalizeCollection({
      id: " seo ",
      name: " SEO Research ",
      color: "",
      icon: ""
    }),
    {
      id: "seo",
      name: "SEO Research",
      color: "#6b7280",
      icon: "folder",
      createdAt: null,
      updatedAt: null
    }
  );
});

test("sorts collections deterministically by name", () => {
  const sorted = sortCollections([
    { id: "z", name: "Zulu" },
    { id: "a", name: "Alpha" },
    { id: "a-2", name: "alpha" }
  ]);

  assert.deepEqual(
    sorted.map((collection) => collection.id),
    ["a", "a-2", "z"]
  );
});

test("counts records assigned to collections", () => {
  const counts = countCollectionRecords([
    { collectionIds: ["work", "seo"] },
    { collectionIds: ["work"] },
    { collectionIds: [] },
    {}
  ]);

  assert.equal(counts.get("work"), 2);
  assert.equal(counts.get("seo"), 1);
});

test("builds selected collection view models", () => {
  const view = buildCollectionViewModel({
    collections: [
      { id: "work", name: "Work" },
      { id: "archive", name: "Archive" }
    ],
    records: [
      { collectionIds: ["work"] },
      { collectionIds: ["work", "archive"] }
    ],
    selectedId: "archive"
  });

  assert.deepEqual(
    view.map(({ id, count, selected }) => ({
      id,
      count,
      selected
    })),
    [
      { id: "archive", count: 1, selected: true },
      { id: "work", count: 2, selected: false }
    ]
  );
});

test("creates stable unique collection ids", () => {
  assert.equal(
    createCollectionId("SEO Research", []),
    "seo-research"
  );

  assert.equal(
    createCollectionId("SEO Research", [
      "seo-research",
      "seo-research-2"
    ]),
    "seo-research-3"
  );
});

test("requires collection id and name", () => {
  assert.throws(
    () => normalizeCollection({ name: "Missing id" }),
    /id is required/
  );

  assert.throws(
    () => normalizeCollection({ id: "missing-name" }),
    /name is required/
  );
});
