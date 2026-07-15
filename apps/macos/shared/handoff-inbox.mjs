import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const HANDOFF_INBOX_SCHEMA_VERSION = 1;
export const HANDOFF_INBOX_FILENAME = "pending-handoff.json";

export function resolveHandoffInboxPath(
  homeDirectory = homedir(),
  filename = HANDOFF_INBOX_FILENAME
) {
  return join(
    homeDirectory,
    "Library/Application Support/AI Relay",
    filename
  );
}

export function normalizeHandoffInboxRecord({
  markdown,
  metadata = {},
  storedAt = new Date().toISOString()
}) {
  const normalizedMarkdown = String(markdown ?? "").trim();

  if (!normalizedMarkdown) {
    throw new TypeError("Handoff markdown is required.");
  }

  return Object.freeze({
    schemaVersion: HANDOFF_INBOX_SCHEMA_VERSION,
    storedAt,
    provider: String(metadata.provider ?? "unknown"),
    title: String(metadata.title ?? "Untitled conversation"),
    url: metadata.url ? String(metadata.url) : null,
    handoffMode: metadata.handoffMode ? String(metadata.handoffMode) : null,
    characters: normalizedMarkdown.length,
    markdown: normalizedMarkdown
  });
}

export async function writeHandoffInbox(record, inboxPath) {
  const normalized = normalizeHandoffInboxRecord(record);

  await mkdir(dirname(inboxPath), { recursive: true });
  await writeFile(inboxPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}

export async function readHandoffInbox(inboxPath) {
  try {
    const raw = await readFile(inboxPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (String(parsed.markdown ?? "").trim() === "") {
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
