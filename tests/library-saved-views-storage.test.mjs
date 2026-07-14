import test from "node:test";
import assert from "node:assert/strict";

import {
  LIBRARY_SAVED_VIEWS_KEY,
  clearSavedViews,
  loadSavedViews,
  saveSavedViews
} from "../apps/browser/src/saved-views-storage.js";

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test("saves and loads saved views", () => {
  const storage = createMemoryStorage();

  saveSavedViews(
    [
      {
        id: "1",
        name: "Research",
        query: {}
      }
    ],
    storage
  );

  const loaded = loadSavedViews(storage);

  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, "Research");
  assert.ok(storage.getItem(LIBRARY_SAVED_VIEWS_KEY));
});

test("returns empty views for invalid storage", () => {
  const storage = createMemoryStorage();
  storage.setItem(LIBRARY_SAVED_VIEWS_KEY, "{invalid");

  assert.deepEqual(loadSavedViews(storage), []);
});

test("clears saved views", () => {
  const storage = createMemoryStorage();

  saveSavedViews(
    [{ id: "1", name: "Research", query: {} }],
    storage
  );

  clearSavedViews(storage);

  assert.equal(
    storage.getItem(LIBRARY_SAVED_VIEWS_KEY),
    null
  );
});
