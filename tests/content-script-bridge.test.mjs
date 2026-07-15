import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("content script bridge reinjects after extension reload", async () => {
  const bridge = await readFile(
    resolve(root, "apps/browser/src/content-script-bridge.js"),
    "utf8"
  );
  const contentScript = await readFile(
    resolve(root, "apps/browser/src/content-script.js"),
    "utf8"
  );
  const popup = await readFile(resolve(root, "apps/browser/src/popup.js"), "utf8");

  assert.match(bridge, /AI_RELAY_PING/);
  assert.match(bridge, /chrome\.scripting\.executeScript/);
  assert.match(contentScript, /AI_RELAY_PING/);
  assert.match(popup, /sendTabMessage/);
});
