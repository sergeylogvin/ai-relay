import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LIBRARY_PREFERENCES,
  normalizeLibraryPreferences,
  mergeLibraryPreferences,
  diffLibraryPreferences,
  resetLibraryPreferences,
  shouldConfirmLibraryAction
} from "../packages/library/src/preferences.js";

test("normalizes preferences with defaults", () => {
  assert.deepEqual(
    normalizeLibraryPreferences({
      defaultSort: "title-asc",
      defaultView: "compact",
      rememberFilters: false,
      pageSize: 100,
      theme: "dark"
    }),
    {
      ...DEFAULT_LIBRARY_PREFERENCES,
      defaultSort: "title-asc",
      defaultView: "compact",
      rememberFilters: false,
      pageSize: 100,
      theme: "dark"
    }
  );
});

test("falls back for invalid enum and page size values", () => {
  const normalized = normalizeLibraryPreferences({
    defaultSort: "random",
    defaultView: "tiny",
    pageSize: 2,
    theme: "blue"
  });

  assert.equal(
    normalized.defaultSort,
    DEFAULT_LIBRARY_PREFERENCES.defaultSort
  );
  assert.equal(
    normalized.defaultView,
    DEFAULT_LIBRARY_PREFERENCES.defaultView
  );
  assert.equal(
    normalized.pageSize,
    DEFAULT_LIBRARY_PREFERENCES.pageSize
  );
  assert.equal(
    normalized.theme,
    DEFAULT_LIBRARY_PREFERENCES.theme
  );
});

test("merges preference changes", () => {
  const merged = mergeLibraryPreferences(
    DEFAULT_LIBRARY_PREFERENCES,
    {
      theme: "dark",
      pageSize: 200,
      confirmBeforeDelete: false
    }
  );

  assert.equal(merged.theme, "dark");
  assert.equal(merged.pageSize, 200);
  assert.equal(merged.confirmBeforeDelete, false);
});

test("diffs preference values", () => {
  assert.deepEqual(
    diffLibraryPreferences(
      DEFAULT_LIBRARY_PREFERENCES,
      {
        ...DEFAULT_LIBRARY_PREFERENCES,
        theme: "dark",
        pageSize: 100
      }
    ),
    {
      pageSize: {
        from: 50,
        to: 100
      },
      theme: {
        from: "system",
        to: "dark"
      }
    }
  );
});

test("resets preferences without sharing mutable state", () => {
  const first = resetLibraryPreferences();
  const second = resetLibraryPreferences();

  first.pageSize = 200;

  assert.equal(second.pageSize, 50);
});

test("maps confirmation preferences to actions", () => {
  assert.equal(
    shouldConfirmLibraryAction(
      {
        ...DEFAULT_LIBRARY_PREFERENCES,
        confirmBeforeDelete: true
      },
      "delete"
    ),
    true
  );

  assert.equal(
    shouldConfirmLibraryAction(
      {
        ...DEFAULT_LIBRARY_PREFERENCES,
        confirmBeforeImport: false
      },
      "import"
    ),
    false
  );

  assert.equal(
    shouldConfirmLibraryAction(
      DEFAULT_LIBRARY_PREFERENCES,
      "export"
    ),
    false
  );
});

test("rejects non-object preferences", () => {
  assert.throws(
    () => normalizeLibraryPreferences(null),
    /must be an object/
  );
});
