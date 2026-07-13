import { LibraryValidationError } from "./errors.js";
import { createLibraryRecord } from "./record.js";

export const LIBRARY_BACKUP_VERSION = 1;

function parseBackup(input) {
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      throw new LibraryValidationError("Backup file is not valid JSON.");
    }
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new LibraryValidationError("Backup payload must be an object.");
  }

  return input;
}

export function createLibraryBackup(records, {
  exportedAt = new Date().toISOString()
} = {}) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("records must be an array.");
  }

  return {
    format: "ai-relay-library",
    version: LIBRARY_BACKUP_VERSION,
    exportedAt: String(exportedAt),
    count: records.length,
    records: records.map((record) => ({ ...record }))
  };
}

export function serializeLibraryBackup(records, options = {}) {
  return JSON.stringify(createLibraryBackup(records, options), null, 2);
}

export function validateLibraryBackup(input) {
  const backup = parseBackup(input);

  if (backup.format !== "ai-relay-library") {
    throw new LibraryValidationError("Unsupported backup format.");
  }

  if (backup.version !== LIBRARY_BACKUP_VERSION) {
    throw new LibraryValidationError(
      `Unsupported backup version: ${backup.version}.`
    );
  }

  if (!Array.isArray(backup.records)) {
    throw new LibraryValidationError("Backup records must be an array.");
  }

  const records = backup.records.map((record) =>
    createLibraryRecord(record)
  );

  return {
    format: backup.format,
    version: backup.version,
    exportedAt: String(backup.exportedAt ?? ""),
    count: records.length,
    records
  };
}

export async function importLibraryBackup(
  library,
  input,
  { replace = false } = {}
) {
  if (!library || typeof library.save !== "function") {
    throw new LibraryValidationError("A conversation library is required.");
  }

  const backup = validateLibraryBackup(input);

  if (replace) {
    if (typeof library.clear !== "function") {
      throw new LibraryValidationError(
        "The conversation library cannot be cleared."
      );
    }

    await library.clear();
  }

  for (const record of backup.records) {
    await library.save(record);
  }

  return {
    imported: backup.records.length,
    mode: replace ? "replace" : "merge"
  };
}
