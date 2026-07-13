import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "README.md",
  "LICENSE",
  "package.json",
  "pnpm-workspace.yaml",
  "product/CHARTER.md",
  "docs/ARCHITECTURE.md",
  "docs/ARCHITECTURE_PRINCIPLES.md",
  "apps/browser/package.json",
  "apps/macos/package.json",
  "packages/core/package.json",
  "packages/provider-sdk/package.json",
  "packages/security/package.json",
  "packages/storage/package.json"
];

for (const file of requiredFiles) {
  await access(file);
}

const workspace = await readFile("pnpm-workspace.yaml", "utf8");
if (!workspace.includes('"apps/*"') || !workspace.includes('"packages/*"')) {
  throw new Error("pnpm workspace does not include apps and packages");
}

console.log("Repository structure is valid.");
