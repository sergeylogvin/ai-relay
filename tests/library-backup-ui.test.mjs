import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("library UI exposes import and export controls", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/library.html"),
    "utf8"
  );

  assert.match(html, /id="exportLibraryButton"/);
  assert.match(html, /id="importLibraryButton"/);
  assert.match(html, /id="importLibraryInput"/);
});

test("library UI uses backup import and export helpers", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/library-page.js"),
    "utf8"
  );

  assert.match(source, /serializeLibraryBackup/);
  assert.match(source, /importLibraryBackup/);
  assert.match(source, /file\.text/);
  assert.match(source, /replace/);
});
