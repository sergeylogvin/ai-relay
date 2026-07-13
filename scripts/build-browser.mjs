import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const browserSource = resolve(root, "apps/browser/src");
const providerSource = resolve(root, "packages/providers/src");
const coreSource = resolve(root, "packages/core/src");
const exportSource = resolve(root, "packages/export/src");
const librarySource = resolve(root, "packages/library/src");

const output = process.env.AI_RELAY_BROWSER_DIST
  ? resolve(process.env.AI_RELAY_BROWSER_DIST)
  : resolve(root, "apps/browser/dist");

await rm(output, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 100
});

await mkdir(output, { recursive: true });

await cp(browserSource, output, { recursive: true });
await cp(providerSource, resolve(output, "providers"), { recursive: true });
await cp(coreSource, resolve(output, "core"), { recursive: true });
await cp(exportSource, resolve(output, "export"), { recursive: true });
await cp(librarySource, resolve(output, "library"), { recursive: true });

console.log(`Browser extension built at ${output}`);
