import { LibraryValidationError } from "./errors.js";

export const LIBRARY_SNAPSHOT_VERSION = 1;

function requireArray(value, name) {
  if (!Array.isArray(value)) {
    throw new LibraryValidationError(`${name} must be an array.`);
  }

  return value;
}

function sortById(items) {
  return [...items].sort((left, right) =>
    String(left?.id ?? "").localeCompare(String(right?.id ?? ""))
  );
}

export function createLibrarySnapshot({
  records = [],
  collections = [],
  tags = [],
  exportedAt = new Date().toISOString()
} = {}) {
  requireArray(records, "Records");
  requireArray(collections, "Collections");
  requireArray(tags, "Tags");

  if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) {
    throw new LibraryValidationError(
      "exportedAt must be a valid ISO date string."
    );
  }

  return {
    schema: "ai-relay-library-snapshot",
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt,
    counts: {
      records: records.length,
      collections: collections.length,
      tags: tags.length
    },
    records: sortById(records),
    collections: sortById(collections),
    tags: [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
  };
}

export function serializeLibrarySnapshot(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function getLibrarySnapshotFilename(exportedAt = new Date().toISOString()) {
  if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) {
    throw new LibraryValidationError(
      "exportedAt must be a valid ISO date string."
    );
  }

  return `ai-relay-library-${exportedAt.slice(0, 10)}.json`;
}
