import { access } from "node:fs/promises";

const requiredFiles = [
  "README.md",
  "LICENSE",
  "package.json",
  "pnpm-workspace.yaml",
  "product/CHARTER.md",
  "docs/ARCHITECTURE.md"
];

for (const file of requiredFiles) {
  await access(file);
}

console.log("Repository structure is valid.");
