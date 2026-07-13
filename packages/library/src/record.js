import { LibraryValidationError } from "./errors.js";

function normalizeText(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeTags(tags) {
  if (tags == null) return [];

  if (!Array.isArray(tags)) {
    throw new LibraryValidationError("tags must be an array.");
  }

  return [...new Set(
    tags
      .map((tag) => normalizeText(tag))
      .filter(Boolean)
      .map((tag) => tag.toLowerCase())
  )].sort();
}

export function createLibraryRecord({
  id,
  provider,
  title,
  sourceUrl = null,
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
  messageCount = 0,
  checksum = null,
  handoffMarkdown,
  captureJson,
  tags = []
}) {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    throw new LibraryValidationError("id is required.");
  }

  if (typeof handoffMarkdown !== "string" || handoffMarkdown.trim() === "") {
    throw new LibraryValidationError(
      "handoffMarkdown must be a non-empty string."
    );
  }

  if (typeof captureJson !== "string" || captureJson.trim() === "") {
    throw new LibraryValidationError(
      "captureJson must be a non-empty string."
    );
  }

  if (!Number.isInteger(messageCount) || messageCount < 0) {
    throw new LibraryValidationError(
      "messageCount must be a non-negative integer."
    );
  }

  return Object.freeze({
    id: normalizedId,
    provider: normalizeText(provider, "unknown"),
    title: normalizeText(title, "Untitled conversation"),
    sourceUrl: sourceUrl ? String(sourceUrl) : null,
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
    messageCount,
    checksum: checksum ? String(checksum) : null,
    handoffMarkdown,
    captureJson,
    tags: Object.freeze(normalizeTags(tags))
  });
}
