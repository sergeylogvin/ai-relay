import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("popup exposes Claude usage panel and refresh action", async () => {
  const html = await readFile(resolve(root, "apps/browser/src/popup.html"), "utf8");
  const popup = await readFile(resolve(root, "apps/browser/src/popup.js"), "utf8");
  const manifest = await readFile(resolve(root, "apps/browser/src/manifest.json"), "utf8");

  assert.match(html, /id="usagePanel"/);
  assert.match(html, /id="refreshUsageButton"/);
  assert.match(html, /Account usage/);
  assert.match(popup, /refreshClaudeUsage/);
  assert.match(popup, /syncUsageSnapshotToDesktop/);
  assert.match(popup, /usage-bar-fill/);
  assert.match(manifest, /"cookies"/);
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
