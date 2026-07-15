import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const USAGE_SNAPSHOT_FILENAME = "usage-snapshot.json";

export function resolveUsageSnapshotPath(
  homeDirectory = homedir(),
  filename = USAGE_SNAPSHOT_FILENAME
) {
  return join(
    homeDirectory,
    "Library/Application Support/AI Relay",
    filename
  );
}

export async function writeUsageSnapshot(snapshot, snapshotPath = resolveUsageSnapshotPath()) {
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

export async function readUsageSnapshot(snapshotPath = resolveUsageSnapshotPath()) {
  try {
    const raw = await readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
