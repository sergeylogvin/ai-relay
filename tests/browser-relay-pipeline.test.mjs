import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  stat
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");

test("content script composes registry, context, and export engines", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/content-script.js"),
    "utf8"
  );

  assert.match(source, /new ProviderRegistry\(\)/);
  assert.match(source, /new ContextEngine/);
  assert.match(source, /createSnapshot/);
  assert.match(source, /createHandoff/);
  assert.match(source, /new ExportEngine\(\)/);
  assert.match(source, /exportEngine\.create/);
});

test("content script returns export files and checksum", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/content-script.js"),
    "utf8"
  );

  assert.match(source, /files: exported\.files/);
  assert.match(source, /checksum: exported\.checksum/);
  assert.match(source, /handoff\.md/);
});

test("manifest exposes shared runtime modules only on supported hosts", async () => {
  const manifest = JSON.parse(
    await readFile(
      resolve(root, "apps/browser/src/manifest.json"),
      "utf8"
    )
  );

  const [entry] = manifest.web_accessible_resources;

  assert.deepEqual(entry.resources, [
    "providers/*.js",
    "providers/*/*.js",
    "core/*.js",
    "export/*.js",
    "capture-metadata.js",
    "library/*.js"
  ]);

  assert.deepEqual(entry.matches, [
    "https://claude.ai/*",
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ]);
});

test("browser build contains the complete relay runtime", async () => {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "ai-relay-browser-build-")
  );
  const output = join(temporaryRoot, "dist");

  try {
    await execFileAsync(
      process.execPath,
      [resolve(root, "scripts/build-browser.mjs")],
      {
        cwd: root,
        env: {
          ...process.env,
          AI_RELAY_BROWSER_DIST: output
        }
      }
    );

    await stat(resolve(output, "providers/registry.js"));
    await stat(resolve(output, "core/context-engine.js"));
    await stat(resolve(output, "export/exporter.js"));
    await stat(resolve(output, "export/markdown.js"));
    await stat(resolve(output, "export/checksum.js"));
    await stat(resolve(output, "capture-metadata.js"));
  } finally {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
});
