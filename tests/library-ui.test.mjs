import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("library page exposes search, provider filter, and record list", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/library.html"),
    "utf8"
  );

  assert.match(html, /id="searchInput"/);
  assert.match(html, /id="providerFilter"/);
  assert.match(html, /id="recordList"/);
  assert.match(html, /id="detailPanel"/);
});

test("library page supports copy, download, and delete actions", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/library-page.js"),
    "utf8"
  );

  assert.match(source, /library\.list/);
  assert.match(source, /library\.delete/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /downloadText/);
  assert.match(source, /confirm/);
});

test("manifest registers the library as the options page", async () => {
  const manifest = JSON.parse(
    await readFile(
      resolve(root, "apps/browser/src/manifest.json"),
      "utf8"
    )
  );

  assert.equal(manifest.options_page, "library.html");
});

test("popup exposes an Open Library action", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/popup.html"),
    "utf8"
  );
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(html, /id="openLibraryButton"/);
  assert.match(source, /chrome\.runtime\.openOptionsPage/);
});
