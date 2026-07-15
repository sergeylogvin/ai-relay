import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("popup exposes Claude usage panel and refresh action", async () => {
  const html = await readFile(resolve(root, "apps/browser/src/popup.html"), "utf8");
  const popup = await readFile(resolve(root, "apps/browser/src/popup.js"), "utf8");
  const manifest = await readFile(resolve(root, "apps/browser/src/manifest.json"), "utf8");
  const contentScript = await readFile(
    resolve(root, "apps/browser/src/content-script.js"),
    "utf8"
  );
  const chatgptClient = await readFile(
    resolve(root, "apps/browser/src/chatgpt-usage-client.js"),
    "utf8"
  );
  const usageTabBridge = await readFile(
    resolve(root, "apps/browser/src/usage-tab-bridge.js"),
    "utf8"
  );
  const geminiClient = await readFile(
    resolve(root, "apps/browser/src/gemini-usage-client.js"),
    "utf8"
  );

  assert.match(html, /id="usagePanel"/);
  assert.match(html, /id="refreshUsageButton"/);
  assert.match(html, /Account usage/);
  assert.match(popup, /refreshClaudeUsage/);
  assert.match(popup, /refreshChatGPTUsage/);
  assert.match(popup, /refreshGeminiUsage/);
  assert.match(chatgptClient, /fetchProviderUsageFromTab/);
  assert.match(geminiClient, /fetchProviderUsageFromTab/);
  assert.match(usageTabBridge, /geminiMainWorldUsageRunner/);
  assert.match(usageTabBridge, /AI_RELAY_GEMINI_EXTRACT_TOKENS/);
  assert.match(usageTabBridge, /world: "MAIN"/);
  assert.match(contentScript, /AI_RELAY_GEMINI_EXTRACT_TOKENS/);
  assert.match(contentScript, /AI_RELAY_FETCH_CHATGPT_USAGE/);
  assert.match(contentScript, /AI_RELAY_FETCH_GEMINI_USAGE/);
  assert.match(popup, /syncUsageSnapshotToDesktop/);
  assert.match(popup, /usage-bar-fill/);
  assert.match(manifest, /"cookies"/);
  assert.match(manifest, /https:\/\/www\.google\.com\/\*/);
  assert.match(manifest, /usage-fetch-handlers\.js/);
});

test("macOS companion includes usage snapshot store", async () => {
  const usageStore = await readFile(
    resolve(root, "apps/macos/MenuBar/Sources/AIRelayMenuBar/UsageStore.swift"),
    "utf8"
  );
  const appDelegate = await readFile(
    resolve(root, "apps/macos/MenuBar/Sources/AIRelayMenuBar/AppDelegate.swift"),
    "utf8"
  );

  assert.match(usageStore, /usage-snapshot\.json/);
  assert.match(appDelegate, /usageStore/);
  assert.match(appDelegate, /renderUsage/);
});
