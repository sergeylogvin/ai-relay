import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("Claude usage modules use dist-safe import paths", async () => {
  const usageClient = await readFile(
    resolve(root, "apps/browser/src/claude-usage-client.js"),
    "utf8"
  );
  const claudeUsage = await readFile(
    resolve(root, "packages/core/src/claude-usage.js"),
    "utf8"
  );

  assert.match(usageClient, /\.\/core\/claude-usage\.js/);
  assert.match(claudeUsage, /from "\.\/usage-snapshot\.js"/);
  assert.doesNotMatch(claudeUsage, /core\/src/);
});
