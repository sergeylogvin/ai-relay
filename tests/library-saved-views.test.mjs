import test from "node:test";
import assert from "node:assert/strict";

import {
  createSavedView,
  deleteSavedView,
  duplicateSavedView,
  exportSavedViews,
  importSavedViews,
  normalizeSavedView,
  normalizeSavedViews,
  setDefaultSavedView,
  updateSavedView
} from "../packages/library/src/saved-views.js";

const now = "2026-07-14T12:00:00.000Z";

test("creates a normalized saved view", () => {
  const view = createSavedView(
    {
      id: "seo",
      name: " SEO research ",
      description: " Work ",
      query: {
        search: "ranking",
        sort: "title-asc",
        collectionId: "research",
        filters: {
          providers: ["chatgpt", "chatgpt"],
          tags: ["seo"],
          pinned: true
        }
      }
    },
    { now }
  );

  assert.equal(view.id, "seo");
  assert.equal(view.name, "SEO research");
  assert.equal(view.description, "Work");
  assert.deepEqual(view.query.filters.providers, ["chatgpt"]);
  assert.equal(view.query.filters.pinned, true);
  assert.equal(view.createdAt, now);
  assert.equal(view.updatedAt, now);
});

test("normalizes duplicate names and defaults", () => {
  const views = normalizeSavedViews(
    [
      {
        id: "1",
        name: "Research",
        isDefault: true,
        query: {}
      },
      {
        id: "2",
        name: "research",
        isDefault: true,
        query: {}
      }
    ],
    { now }
  );

  assert.equal(views[0].name, "Research");
  assert.equal(views[1].name, "research (2)");
  assert.equal(views[0].isDefault, true);
  assert.equal(views[1].isDefault, false);
});

test("updates a saved view while preserving identity", () => {
  const original = createSavedView(
    {
      id: "1",
      name: "Initial",
      query: {
        filters: {
          tags: ["seo"]
        }
      }
    },
    { now }
  );

  const updated = updateSavedView(
    original,
    {
      name: "Updated",
      query: {
        search: "audit",
        filters: {
          pinned: true
        }
      }
    },
    {
      now: "2026-07-15T12:00:00.000Z"
    }
  );

  assert.equal(updated.id, "1");
  assert.equal(updated.name, "Updated");
  assert.equal(updated.query.search, "audit");
  assert.deepEqual(updated.query.filters.tags, ["seo"]);
  assert.equal(updated.query.filters.pinned, true);
  assert.equal(
    updated.updatedAt,
    "2026-07-15T12:00:00.000Z"
  );
});

test("sets one default view", () => {
  const views = setDefaultSavedView(
    [
      { id: "1", name: "One", query: {} },
      { id: "2", name: "Two", query: {} }
    ],
    "2"
  );

  assert.equal(views[0].isDefault, false);
  assert.equal(views[1].isDefault, true);
});

test("duplicates and deletes saved views", () => {
  const source = createSavedView(
    {
      id: "1",
      name: "Research",
      query: {}
    },
    { now }
  );

  const copy = duplicateSavedView(source, {
    now,
    name: "Research copy"
  });

  assert.notEqual(copy.id, source.id);
  assert.equal(copy.name, "Research copy");
  assert.equal(copy.isDefault, false);

  const remaining = deleteSavedView(
    [source, copy],
    source.id
  );

  assert.deepEqual(
    remaining.map((view) => view.id),
    [copy.id]
  );
});

test("exports and imports saved views", () => {
  const exported = exportSavedViews([
    {
      id: "1",
      name: "Research",
      query: {}
    }
  ]);

  const imported = importSavedViews(exported, {
    now
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].name, "Research");
});

test("rejects invalid saved view input", () => {
  assert.throws(
    () => normalizeSavedView({ id: "1", query: {} }),
    /name is required/
  );

  assert.throws(
    () =>
      importSavedViews(
        JSON.stringify({
          schemaVersion: 2,
          views: []
        })
      ),
    /Unsupported/
  );

  assert.throws(
    () =>
      setDefaultSavedView(
        [{ id: "1", name: "One", query: {} }],
        "missing"
      ),
    /not found/
  );
});
