import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("popup exposes a save-to-library action", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/popup.html"),
    "utf8"
  );

  assert.match(html, /id="saveLibraryButton"/);
  assert.match(html, /Save to Library/);
});

test("popup stores captures through the shared library", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(source, /new ConversationLibrary/);
  assert.match(source, /new BrowserStorageLibraryAdapter/);
  assert.match(source, /library\.save/);
});

test("manifest requests local storage permission", async () => {
  const manifest = JSON.parse(
    await readFile(
      resolve(root, "apps/browser/src/manifest.json"),
      "utf8"
    )
  );

  assert.ok(manifest.permissions.includes("storage"));
});
