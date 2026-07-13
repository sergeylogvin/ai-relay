import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const browserSource = resolve(root, "apps/browser/src");
const providerSource = resolve(root, "packages/providers/src");
const output = resolve(root, "apps/browser/dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await cp(browserSource, output, { recursive: true });
await cp(providerSource, resolve(output, "providers"), {
  recursive: true
});

console.log(`Browser extension built at ${output}`);
