import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");

test("content script loads the provider registry at runtime", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/content-script.js"),
    "utf8"
  );

  assert.match(source, /providers\/registry\.js/);
  assert.match(source, /new ProviderRegistry\(\)/);
  assert.match(source, /registry\.readConversation/);
  assert.doesNotMatch(source, /ROLE_SELECTORS/);
});

test("manifest exposes provider modules only on supported hosts", async () => {
  const manifest = JSON.parse(
    await readFile(
      resolve(root, "apps/browser/src/manifest.json"),
      "utf8"
    )
  );

  assert.deepEqual(manifest.web_accessible_resources, [
    {
      resources: [
        "providers/*.js",
        "providers/*/*.js",
        "core/*.js",
        "export/*.js",
    "capture-metadata.js",
    "library/*.js"
      ],
      matches: [
        "https://claude.ai/*",
        "https://chatgpt.com/*",
        "https://gemini.google.com/*"
      ]
    }
  ]);
});

test("browser build copies provider registry and adapters", async () => {
  await execFileAsync(
    process.execPath,
    [resolve(root, "scripts/build-browser.mjs")],
    { cwd: root }
  );

  await stat(resolve(root, "apps/browser/dist/providers/registry.js"));
  await stat(
    resolve(root, "apps/browser/dist/providers/claude/adapter.js")
  );
  await stat(
    resolve(root, "apps/browser/dist/providers/chatgpt/adapter.js")
  );
  await stat(
    resolve(root, "apps/browser/dist/providers/gemini/adapter.js")
  );
});
