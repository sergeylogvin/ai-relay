import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("popup exposes continue-in-provider controls", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/popup.html"),
    "utf8"
  );

  assert.match(html, /id="handoffMode"/);
  assert.match(html, /id="continueChatgptButton"/);
  assert.match(html, /id="continueClaudeButton"/);
  assert.match(html, /id="continueGeminiButton"/);
  assert.match(html, /Continue in another AI/);
  assert.match(html, /id="tokenEstimateValue"/);
  assert.match(html, /id="handoffSizeValue"/);
});

test("popup re-renders handoff modes from the stored capture envelope", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(source, /renderHandoffByMode/);
  assert.match(source, /applyHandoffMode/);
  assert.match(source, /handoffModeSelect/);
  assert.match(source, /capture\.json/);
});

test("popup can continue in another provider and insert the handoff", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );

  assert.match(source, /AI_RELAY_CONTINUE_IN_PROVIDER/);
  assert.match(source, /chrome\.runtime\.sendMessage/);
  assert.match(source, /formatMigrationRoute/);
  assert.match(source, /savePendingHandoff\(lastCapture\)/);
});

test("background service worker continues migration after popup closes", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(root, "apps/browser/src/manifest.json"), "utf8")
  );
  const background = await readFile(
    resolve(root, "apps/browser/src/background.js"),
    "utf8"
  );

  assert.equal(manifest.background?.service_worker, "background.js");
  assert.equal(manifest.background?.type, "module");
  assert.match(background, /AI_RELAY_CONTINUE_IN_PROVIDER/);
  assert.match(background, /continueInProvider/);
});

test("continue-in-provider opens provider URLs and retries insertion", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/continue-in-provider.js"),
    "utf8"
  );

  assert.match(source, /getProviderUrl/);
  assert.match(source, /chrome\.tabs\.create/);
  assert.match(source, /AI_RELAY_INSERT_CONTEXT/);
  assert.match(source, /insertContextWithRetry/);
});
