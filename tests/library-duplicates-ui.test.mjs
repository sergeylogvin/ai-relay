import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("library UI exposes a duplicates-only control", async () => {
  const html = await readFile(
    new URL("../apps/browser/src/library.html", import.meta.url),
    "utf8"
  );

  assert.match(html, /id="duplicates-only"/);
  assert.match(html, /Duplicates only/);
});

test("library UI marks and filters duplicate records", async () => {
  const source = await readFile(
    new URL("../apps/browser/src/library-page.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /getDuplicateRecordIds/);
  assert.match(source, /dataset\.duplicate/);
  assert.match(source, /applyDuplicateVisibility/);
});
