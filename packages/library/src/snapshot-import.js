import { LibraryValidationError } from "./errors.js";
import { LIBRARY_SNAPSHOT_VERSION } from "./snapshot.js";

function requireObject(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LibraryValidationError(message);
  }
}

function requireArray(value, message) {
  if (!Array.isArray(value)) {
    throw new LibraryValidationError(message);
  }
}

function uniqueById(items) {
  const seen = new Set();

  return items.filter((item) => {
    const id = String(item?.id ?? "").trim();

    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

export function parseLibrarySnapshot(input) {
  let snapshot;

  if (typeof input === "string") {
    try {
      snapshot = JSON.parse(input);
    } catch {
      throw new LibraryValidationError("Snapshot must contain valid JSON.");
    }
  } else {
    snapshot = input;
  }

  requireObject(snapshot, "Snapshot must be an object.");

  if (snapshot.schema !== "ai-relay-library-snapshot") {
    throw new LibraryValidationError("Unsupported snapshot schema.");
  }

  if (snapshot.version !== LIBRARY_SNAPSHOT_VERSION) {
    throw new LibraryValidationError(
      `Unsupported snapshot version: ${snapshot.version}.`
    );
  }

  requireArray(snapshot.records, "Snapshot records must be an array.");
  requireArray(snapshot.collections, "Snapshot collections must be an array.");
  requireArray(snapshot.tags, "Snapshot tags must be an array.");

  return {
    schema: snapshot.schema,
    version: snapshot.version,
    exportedAt: snapshot.exportedAt,
    records: uniqueById(snapshot.records),
    collections: uniqueById(snapshot.collections),
    tags: [...new Set(
      snapshot.tags
        .map((tag) => String(tag ?? "").trim())
        .filter(Boolean)
    )]
  };
}

export function planLibrarySnapshotImport({
  snapshot,
  existingRecords = [],
  existingCollections = [],
  existingTags = [],
  mode = "merge"
} = {}) {
  requireArray(existingRecords, "Existing records must be an array.");
  requireArray(existingCollections, "Existing collections must be an array.");
  requireArray(existingTags, "Existing tags must be an array.");

  if (!["merge", "replace"].includes(mode)) {
    throw new LibraryValidationError(
      'Import mode must be either "merge" or "replace".'
    );
  }

  const parsed = parseLibrarySnapshot(snapshot);

  if (mode === "replace") {
    return {
      mode,
      records: parsed.records,
      collections: parsed.collections,
      tags: parsed.tags,
      summary: {
        addedRecords: parsed.records.length,
        updatedRecords: 0,
        addedCollections: parsed.collections.length,
        updatedCollections: 0,
        addedTags: parsed.tags.length
      }
    };
  }

  const currentRecords = new Map(
    existingRecords.map((record) => [record.id, record])
  );
  const currentCollections = new Map(
    existingCollections.map((collection) => [collection.id, collection])
  );

  let addedRecords = 0;
  let updatedRecords = 0;
  let addedCollections = 0;
  let updatedCollections = 0;

  for (const record of parsed.records) {
    if (currentRecords.has(record.id)) {
      updatedRecords += 1;
    } else {
      addedRecords += 1;
    }

    currentRecords.set(record.id, {
      ...(currentRecords.get(record.id) ?? {}),
      ...record
    });
  }

  for (const collection of parsed.collections) {
    if (currentCollections.has(collection.id)) {
      updatedCollections += 1;
    } else {
      addedCollections += 1;
    }

    currentCollections.set(collection.id, {
      ...(currentCollections.get(collection.id) ?? {}),
      ...collection
    });
  }

  const mergedTags = [
    ...new Set([
      ...existingTags.map((tag) => String(tag).trim()).filter(Boolean),
      ...parsed.tags
    ])
  ];

  return {
    mode,
    records: [...currentRecords.values()],
    collections: [...currentCollections.values()],
    tags: mergedTags,
    summary: {
      addedRecords,
      updatedRecords,
      addedCollections,
      updatedCollections,
      addedTags: mergedTags.length - new Set(existingTags).size
    }
  };
}
