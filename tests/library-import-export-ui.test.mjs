import test from "node:test";
import assert from "node:assert/strict";

import {
  isSupportedLibraryImportFile,
  formatImportSummary,
  createImportExportState
} from "../apps/browser/src/import-export-ui.js";

test("accepts JSON and ZIP library backups", () => {
  assert.equal(
    isSupportedLibraryImportFile({ name: "library.json" }),
    true
  );

  assert.equal(
    isSupportedLibraryImportFile({ name: "library.ZIP" }),
    true
  );

  assert.equal(
    isSupportedLibraryImportFile({ name: "notes.txt" }),
    false
  );
});

test("rejects missing file metadata", () => {
  assert.equal(isSupportedLibraryImportFile(null), false);
  assert.equal(isSupportedLibraryImportFile({}), false);
});

test("formats import summaries", () => {
  assert.equal(
    formatImportSummary({
      imported: 12,
      updated: 3,
      skipped: 2
    }),
    "Imported 12, updated 3, skipped 2 conversation(s)."
  );

  assert.equal(
    formatImportSummary({ imported: 4 }),
    "Imported 4 conversation(s)."
  );
});

test("normalizes UI state", () => {
  assert.deepEqual(
    createImportExportState({
      status: "working",
      message: "Importing",
      progress: 140,
      fileName: "backup.zip"
    }),
    {
      status: "working",
      message: "Importing",
      progress: 100,
      fileName: "backup.zip"
    }
  );

  assert.equal(
    createImportExportState({ progress: -20 }).progress,
    0
  );
});
