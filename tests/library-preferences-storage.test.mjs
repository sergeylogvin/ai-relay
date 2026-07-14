import test from "node:test";
import assert from "node:assert/strict";

import {
  LIBRARY_PREFERENCES_KEY,
  loadLibraryPreferences,
  saveLibraryPreferences,
  clearLibraryPreferences
} from "../apps/browser/src/preferences-storage.js";

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

test("saves and loads normalized preferences", () => {
  const storage = createMemoryStorage();

  saveLibraryPreferences(
    {
      theme: "dark",
      pageSize: 100
    },
    storage
  );

  const loaded = loadLibraryPreferences(storage);

  assert.equal(loaded.theme, "dark");
  assert.equal(loaded.pageSize, 100);
  assert.ok(storage.getItem(LIBRARY_PREFERENCES_KEY));
});

test("falls back when stored JSON is invalid", () => {
  const storage = createMemoryStorage();

  storage.setItem(LIBRARY_PREFERENCES_KEY, "{invalid");

  const loaded = loadLibraryPreferences(storage);

  assert.equal(loaded.theme, "system");
  assert.equal(loaded.pageSize, 50);
});

test("clears stored preferences", () => {
  const storage = createMemoryStorage();

  saveLibraryPreferences({ theme: "dark" }, storage);
  clearLibraryPreferences(storage);

  assert.equal(
    storage.getItem(LIBRARY_PREFERENCES_KEY),
    null
  );
});
