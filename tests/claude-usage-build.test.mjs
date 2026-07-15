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
  const chatgptUsageClient = await readFile(
    resolve(root, "apps/browser/src/chatgpt-usage-client.js"),
    "utf8"
  );
  const geminiUsageClient = await readFile(
    resolve(root, "apps/browser/src/gemini-usage-client.js"),
    "utf8"
  );
  const claudeUsage = await readFile(
    resolve(root, "packages/core/src/claude-usage.js"),
    "utf8"
  );
  const chatgptUsage = await readFile(
    resolve(root, "packages/core/src/chatgpt-usage.js"),
    "utf8"
  );
  const geminiUsage = await readFile(
    resolve(root, "packages/core/src/gemini-usage.js"),
    "utf8"
  );

  assert.match(usageClient, /\.\/core\/claude-usage\.js/);
  assert.match(chatgptUsageClient, /\.\/core\/chatgpt-usage\.js/);
  assert.match(geminiUsageClient, /\.\/core\/gemini-usage\.js/);
  assert.match(claudeUsage, /from "\.\/usage-snapshot\.js"/);
  assert.match(chatgptUsage, /from "\.\/usage-snapshot\.js"/);
  assert.match(geminiUsage, /from "\.\/usage-snapshot\.js"/);
  assert.doesNotMatch(claudeUsage, /core\/src/);
  assert.doesNotMatch(chatgptUsage, /core\/src/);
  assert.doesNotMatch(geminiUsage, /core\/src/);
});
