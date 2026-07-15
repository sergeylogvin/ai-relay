import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const PASTE_REQUEST_FILENAME = "pending-paste-request.json";

export function resolvePasteRequestPath(
  homeDirectory = homedir(),
  filename = PASTE_REQUEST_FILENAME
) {
  return join(
    homeDirectory,
    "Library/Application Support/AI Relay",
    filename
  );
}

export function normalizePasteRequest({
  storedAt,
  targetApp = "front",
  requestedAt = new Date().toISOString()
}) {
  if (!storedAt) {
    throw new TypeError("Paste request storedAt is required.");
  }

  return Object.freeze({
    requestedAt,
    storedAt,
    targetApp: String(targetApp)
  });
}

export async function writePasteRequest(request, requestPath) {
  const normalized = normalizePasteRequest(request);

  await mkdir(dirname(requestPath), { recursive: true });
  await writeFile(requestPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}

export async function readPasteRequest(requestPath) {
  try {
    const raw = await readFile(requestPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (!parsed.storedAt) {
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

export async function clearPasteRequest(requestPath) {
  try {
    await rm(requestPath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
