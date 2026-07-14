import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const distDir = path.join(root, "apps", "browser", "dist");
const releaseDir = path.join(root, "release");
const manifestPath = path.join(distDir, "manifest.json");

async function assertFile(filePath, label) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error();
  } catch {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

await assertFile(manifestPath, "Browser manifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

for (const field of ["name", "version", "manifest_version"]) {
  if (!manifest[field]) {
    throw new Error(`manifest.json is missing required field: ${field}`);
  }
}

const safeName = String(manifest.name)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const archiveName = `${safeName || "ai-relay"}-${manifest.version}.zip`;
const archivePath = path.join(releaseDir, archiveName);
const checksumPath = `${archivePath}.sha256`;

await mkdir(releaseDir, { recursive: true });
await rm(archivePath, { force: true });
await rm(checksumPath, { force: true });

const zip = spawnSync("zip", ["-r", "-q", archivePath, "."], {
  cwd: distDir,
  stdio: "inherit"
});

if (zip.status !== 0) {
  throw new Error("Could not create ZIP archive.");
}

const checksum = spawnSync("shasum", ["-a", "256", archivePath], {
  encoding: "utf8"
});

if (checksum.status !== 0) {
  throw new Error("Could not generate SHA-256 checksum.");
}

await writeFile(checksumPath, `${checksum.stdout.trim()}\n`, "utf8");

await writeFile(
  path.join(releaseDir, "browser-release.json"),
  `${JSON.stringify({
    name: manifest.name,
    version: manifest.version,
    manifestVersion: manifest.manifest_version,
    archive: archiveName,
    checksum: path.basename(checksumPath),
    builtAt: new Date().toISOString()
  }, null, 2)}\n`,
  "utf8"
);

console.log(`Browser release created: ${archivePath}`);
console.log(`Checksum created: ${checksumPath}`);
