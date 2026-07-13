import { LibraryValidationError } from "./errors.js";

function normalizeTag(tag) {
  return String(tag ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function normalizeTags(tags) {
  if (tags == null) return [];

  if (!Array.isArray(tags)) {
    throw new LibraryValidationError("tags must be an array.");
  }

  return [...new Set(tags.map(normalizeTag).filter(Boolean))].sort();
}

export function updateRecordOrganization(
  record,
  {
    tags = record?.tags ?? [],
    pinned = record?.pinned ?? false
  } = {}
) {
  if (!record || typeof record !== "object") {
    throw new LibraryValidationError("A conversation record is required.");
  }

  return {
    ...record,
    tags: normalizeTags(tags),
    pinned: Boolean(pinned),
    updatedAt: new Date().toISOString()
  };
}

export function listLibraryTags(records) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("records must be an array.");
  }

  return normalizeTags(records.flatMap((record) => record.tags ?? []));
}

export function filterLibraryRecords(
  records,
  {
    query = "",
    provider = "",
    tag = "",
    pinnedOnly = false
  } = {}
) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("records must be an array.");
  }

  const normalizedQuery = String(query).trim().toLowerCase();
  const normalizedProvider = String(provider).trim().toLowerCase();
  const normalizedTag = normalizeTag(tag);

  return records.filter((record) => {
    const searchable = [
      record.title,
      record.sourceUrl,
      record.provider,
      record.handoffMarkdown,
      ...(record.tags ?? [])
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join("\n");

    if (normalizedQuery && !searchable.includes(normalizedQuery)) {
      return false;
    }

    if (
      normalizedProvider &&
      String(record.provider ?? "").toLowerCase() !== normalizedProvider
    ) {
      return false;
    }

    if (
      normalizedTag &&
      !(record.tags ?? []).map(normalizeTag).includes(normalizedTag)
    ) {
      return false;
    }

    return !pinnedOnly || Boolean(record.pinned);
  });
}

export function sortLibraryRecords(records) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("records must be an array.");
  }

  return [...records].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) {
      return left.pinned ? -1 : 1;
    }

    const leftTime = Date.parse(left.updatedAt ?? "") || 0;
    const rightTime = Date.parse(right.updatedAt ?? "") || 0;
    return rightTime - leftTime;
  });
}
