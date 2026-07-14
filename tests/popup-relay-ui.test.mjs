import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("popup exposes relay metadata and export actions", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/popup.html"),
    "utf8"
  );

  assert.match(html, /id="metadata"/);
  assert.match(html, /id="messageCountValue"/);
  assert.match(html, /id="checksumValue"/);
  assert.match(html, /id="copyMarkdownButton"/);
  assert.match(html, /id="copyJsonButton"/);
  assert.match(html, /id="downloadMarkdownButton"/);
  assert.match(html, /id="downloadJsonButton"/);
});

test("popup consumes export-engine files from capture response", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(source, /files\?\.\["handoff\.md"\]/);
  assert.match(source, /files\?\.\["capture\.json"\]/);
  assert.match(source, /capture\.checksum/);
  assert.match(source, /capture\.messageCount/);
});

test("popup persists a pending handoff between tabs", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(source, /savePendingHandoff\(response\.capture\)/);
  assert.match(source, /loadPendingHandoff\(\)/);
  assert.match(source, /renderCapture\(pendingCapture\)/);
  assert.match(source, /clearPendingHandoff\(\)/);
});

test("popup requires explicit user actions for copy and download", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /addEventListener\("click"/);
  assert.match(source, /downloadText/);
  assert.doesNotMatch(source, /form\.submit/);
});
