import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("library page exposes collection controls", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/library-page.js"),
    "utf8"
  );

  assert.match(source, /collectionFilter/);
  assert.match(source, /recordCollectionInput/);
  assert.match(source, /collectionSuggestions/);
  assert.match(source, /listLibraryCollections/);
  assert.match(source, /collection: collectionFilter\.value/);
});
