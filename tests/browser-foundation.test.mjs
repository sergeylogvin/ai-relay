import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  detectProvider,
  PROVIDERS
} from "../apps/browser/src/provider-detection.js";

test("detectProvider recognizes supported AI hosts", () => {
  assert.equal(
    detectProvider("https://claude.ai/chat/example"),
    PROVIDERS.CLAUDE
  );
  assert.equal(
    detectProvider("https://chatgpt.com/c/example"),
    PROVIDERS.CHATGPT
  );
  assert.equal(
    detectProvider("https://gemini.google.com/app/example"),
    PROVIDERS.GEMINI
  );
});

test("detectProvider reports unsupported hosts", () => {
  assert.equal(
    detectProvider("https://example.com"),
    PROVIDERS.UNKNOWN
  );
});

test("browser manifest uses minimum permissions", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../apps/browser/src/manifest.json", import.meta.url),
      "utf8"
    )
  );

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), [
    "activeTab",
    "nativeMessaging",
    "storage"
  ]);
  assert.equal(manifest.permissions.includes("cookies"), false);
  assert.equal(manifest.permissions.includes("tabs"), false);
});

test("browser manifest supports the initial providers", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../apps/browser/src/manifest.json", import.meta.url),
      "utf8"
    )
  );

  assert.deepEqual(manifest.host_permissions.sort(), [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ]);
});
