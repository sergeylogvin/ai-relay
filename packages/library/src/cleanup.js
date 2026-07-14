import { LibraryValidationError } from "./errors.js";

function uniqueStrings(values) {
  return [...new Set(
    values
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  )];
}

export function planLibraryCleanup({
  records = [],
  collections = [],
  tags = []
} = {}) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("Records must be an array.");
  }

  if (!Array.isArray(collections)) {
    throw new LibraryValidationError("Collections must be an array.");
  }

  if (!Array.isArray(tags)) {
    throw new LibraryValidationError("Tags must be an array.");
  }

  const referencedCollectionIds = new Set(
    records.flatMap((record) => record?.collectionIds ?? [])
  );

  const referencedTags = new Set(
    records.flatMap((record) => record?.tags ?? [])
  );

  const emptyCollectionIds = collections
    .filter((collection) => {
      const id = String(collection?.id ?? "").trim();
      return id && !referencedCollectionIds.has(id);
    })
    .map((collection) => collection.id);

  const orphanTags = uniqueStrings(tags).filter(
    (tag) => !referencedTags.has(tag)
  );

  const normalizedRecords = records.map((record) => ({
    ...record,
    tags: uniqueStrings(record?.tags ?? []),
    collectionIds: uniqueStrings(record?.collectionIds ?? [])
  }));

  const changedRecordIds = normalizedRecords
    .filter((record, index) => {
      const original = records[index] ?? {};
      return (
        JSON.stringify(record.tags) !== JSON.stringify(original.tags ?? []) ||
        JSON.stringify(record.collectionIds) !==
          JSON.stringify(original.collectionIds ?? [])
      );
    })
    .map((record) => record.id);

  return {
    emptyCollectionIds,
    orphanTags,
    normalizedRecords,
    changedRecordIds,
    hasChanges:
      emptyCollectionIds.length > 0 ||
      orphanTags.length > 0 ||
      changedRecordIds.length > 0
  };
}
