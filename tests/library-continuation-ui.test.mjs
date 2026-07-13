import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("library UI exposes continuation actions", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/library.html"),
    "utf8"
  );

  assert.match(html, /id="copyContinuationButton"/);
  assert.match(html, /data-provider="chatgpt"/);
  assert.match(html, /data-provider="claude"/);
  assert.match(html, /data-provider="gemini"/);
});

test("library UI copies prompts and opens providers", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/library-page.js"),
    "utf8"
  );

  assert.match(source, /buildContinuationPrompt/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /getProviderUrl/);
  assert.match(source, /chrome\.tabs\.create/);
});
