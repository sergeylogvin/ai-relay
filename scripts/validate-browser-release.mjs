import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const distDir = path.join(root, "apps", "browser", "dist");
const manifestPath = path.join(distDir, "manifest.json");

async function assertFile(filePath, label) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error();
  } catch {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

await assertFile(manifestPath, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

for (const field of ["name", "version", "manifest_version"]) {
  if (!manifest[field]) {
    throw new Error(`manifest.json is missing required field: ${field}`);
  }
}

const referencedFiles = new Set();

function add(value) {
  if (typeof value === "string" && value.trim()) {
    referencedFiles.add(value.trim());
  }
}

add(manifest.action?.default_popup);
add(manifest.browser_action?.default_popup);
add(manifest.options_page);
add(manifest.options_ui?.page);
add(manifest.background?.service_worker);

for (const file of manifest.background?.scripts ?? []) add(file);

for (const item of manifest.content_scripts ?? []) {
  for (const file of item.js ?? []) add(file);
  for (const file of item.css ?? []) add(file);
}

for (const file of referencedFiles) {
  await assertFile(
    path.join(distDir, file),
    `Manifest-referenced file "${file}"`
  );
}

console.log(
  `Browser release validation passed for ${manifest.name} ${manifest.version}.`
);
