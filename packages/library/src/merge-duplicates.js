import { LibraryValidationError } from "./errors.js";
import { getDuplicateKey } from "./duplicates.js";

function uniqueStrings(values) {
  return [...new Set(
    values
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  )];
}

function newestTimestamp(records, field) {
  return records
    .map((record) => record?.[field])
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left) || 0;
      const rightTime = Date.parse(right) || 0;
      return rightTime - leftTime;
    })[0];
}

function oldestTimestamp(records, field) {
  return records
    .map((record) => record?.[field])
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left) || 0;
      const rightTime = Date.parse(right) || 0;
      return leftTime - rightTime;
    })[0];
}

function longestText(records, field) {
  return records
    .map((record) => String(record?.[field] ?? "").trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)[0];
}

export function mergeDuplicateGroup(records, canonicalId) {
  if (!Array.isArray(records) || records.length < 2) {
    throw new LibraryValidationError(
      "At least two duplicate records are required."
    );
  }

  const canonical = records.find((record) => record?.id === canonicalId);
  if (!canonical) {
    throw new LibraryValidationError(
      "The canonical record must belong to the duplicate group."
    );
  }

  const duplicateKey = getDuplicateKey(canonical);
  const invalidRecord = records.find(
    (record) => getDuplicateKey(record) !== duplicateKey
  );

  if (invalidRecord) {
    throw new LibraryValidationError(
      "All records must belong to the same duplicate group."
    );
  }

  const merged = {
    ...canonical,
    title: canonical.title || longestText(records, "title") || "",
    provider: canonical.provider || records.find((record) => record.provider)?.provider || "",
    sourceUrl: canonical.sourceUrl || records.find((record) => record.sourceUrl)?.sourceUrl || "",
    checksum: canonical.checksum || records.find((record) => record.checksum)?.checksum || "",
    tags: uniqueStrings(records.map((record) => record.tags ?? [])),
    collectionIds: uniqueStrings(
      records.map((record) => record.collectionIds ?? [])
    ),
    pinned: records.some((record) => Boolean(record.pinned)),
    createdAt:
      oldestTimestamp(records, "createdAt") ||
      canonical.createdAt,
    updatedAt:
      newestTimestamp(records, "updatedAt") ||
      canonical.updatedAt,
    mergedFromIds: uniqueStrings([
      ...(canonical.mergedFromIds ?? []),
      ...records
        .filter((record) => record.id !== canonicalId)
        .flatMap((record) => [
          record.id,
          ...(record.mergedFromIds ?? [])
        ])
    ])
  };

  return {
    canonical: merged,
    obsoleteIds: records
      .filter((record) => record.id !== canonicalId)
      .map((record) => record.id)
  };
}
