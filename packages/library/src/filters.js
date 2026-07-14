import { LibraryValidationError } from "./errors.js";

const SUPPORTED_DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "capturedAt"
]);

function normalizeList(value, name) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new LibraryValidationError(`${name} must be an array.`);
  }

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  ];
}

function normalizeBoolean(value, name) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "boolean") {
    throw new LibraryValidationError(`${name} must be a boolean.`);
  }

  return value;
}

function normalizeDate(value, name) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new LibraryValidationError(`${name} must be a valid date.`);
  }

  return timestamp;
}

function normalizeMatchMode(value, name) {
  const normalized = value ?? "any";

  if (!["any", "all"].includes(normalized)) {
    throw new LibraryValidationError(
      `${name} must be either "any" or "all".`
    );
  }

  return normalized;
}

function recordDate(record, field) {
  const raw = record?.[field];

  if (!raw) {
    return null;
  }

  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function hasContent(record) {
  return Boolean(
    String(
      record?.content ??
      record?.markdown ??
      record?.prompt ??
      record?.response ??
      ""
    ).trim()
  );
}

function hasNotes(record) {
  return Boolean(
    String(record?.notes ?? record?.summary ?? "").trim()
  );
}

function hasUrl(record) {
  return Boolean(String(record?.url ?? "").trim());
}

function matchesList(recordValues, filterValues, mode) {
  if (filterValues.length === 0) {
    return true;
  }

  const recordSet = new Set(
    recordValues
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  );

  if (mode === "all") {
    return filterValues.every((value) => recordSet.has(value));
  }

  return filterValues.some((value) => recordSet.has(value));
}

function matchesPresence(actual, expected) {
  return expected === null || actual === expected;
}

export function normalizeLibraryFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new LibraryValidationError("Filters must be an object.");
  }

  const dateField = filters.dateField ?? "updatedAt";

  if (!SUPPORTED_DATE_FIELDS.has(dateField)) {
    throw new LibraryValidationError(
      "dateField must be createdAt, updatedAt, or capturedAt."
    );
  }

  const from = normalizeDate(filters.from, "from");
  const to = normalizeDate(filters.to, "to");

  if (from !== null && to !== null && from > to) {
    throw new LibraryValidationError(
      "from must be earlier than or equal to to."
    );
  }

  return {
    providers: normalizeList(filters.providers, "providers"),
    tags: normalizeList(filters.tags, "tags"),
    collections: normalizeList(filters.collections, "collections"),
    providerMode: normalizeMatchMode(filters.providerMode, "providerMode"),
    tagMode: normalizeMatchMode(filters.tagMode, "tagMode"),
    collectionMode: normalizeMatchMode(
      filters.collectionMode,
      "collectionMode"
    ),
    pinned: normalizeBoolean(filters.pinned, "pinned"),
    hasUrl: normalizeBoolean(filters.hasUrl, "hasUrl"),
    hasNotes: normalizeBoolean(filters.hasNotes, "hasNotes"),
    hasContent: normalizeBoolean(filters.hasContent, "hasContent"),
    dateField,
    from,
    to
  };
}

function recordMatchesNormalizedFilters(record, normalized) {
  if (
    !matchesList(
      [record?.provider],
      normalized.providers,
      normalized.providerMode
    )
  ) {
    return false;
  }

  if (
    !matchesList(
      Array.isArray(record?.tags) ? record.tags : [],
      normalized.tags,
      normalized.tagMode
    )
  ) {
    return false;
  }

  if (
    !matchesList(
      Array.isArray(record?.collectionIds) ? record.collectionIds : [],
      normalized.collections,
      normalized.collectionMode
    )
  ) {
    return false;
  }

  if (
    !matchesPresence(Boolean(record?.pinned), normalized.pinned) ||
    !matchesPresence(hasUrl(record), normalized.hasUrl) ||
    !matchesPresence(hasNotes(record), normalized.hasNotes) ||
    !matchesPresence(hasContent(record), normalized.hasContent)
  ) {
    return false;
  }

  if (normalized.from !== null || normalized.to !== null) {
    const timestamp = recordDate(record, normalized.dateField);

    if (timestamp === null) {
      return false;
    }

    if (normalized.from !== null && timestamp < normalized.from) {
      return false;
    }

    if (normalized.to !== null && timestamp > normalized.to) {
      return false;
    }
  }

  return true;
}

export function recordMatchesLibraryFilters(record, filters = {}) {
  return recordMatchesNormalizedFilters(
    record,
    normalizeLibraryFilters(filters)
  );
}

export function filterLibraryRecords({
  records = [],
  filters = {}
} = {}) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("Records must be an array.");
  }

  const normalized = normalizeLibraryFilters(filters);

  return records.filter((record) =>
    recordMatchesNormalizedFilters(record, normalized)
  );
}

export function summarizeLibraryFilters(filters = {}) {
  const normalized = normalizeLibraryFilters(filters);
  const active = [];

  if (normalized.providers.length) {
    active.push({
      type: "providers",
      mode: normalized.providerMode,
      values: normalized.providers
    });
  }

  if (normalized.tags.length) {
    active.push({
      type: "tags",
      mode: normalized.tagMode,
      values: normalized.tags
    });
  }

  if (normalized.collections.length) {
    active.push({
      type: "collections",
      mode: normalized.collectionMode,
      values: normalized.collections
    });
  }

  for (const key of ["pinned", "hasUrl", "hasNotes", "hasContent"]) {
    if (normalized[key] !== null) {
      active.push({
        type: key,
        value: normalized[key]
      });
    }
  }

  if (normalized.from !== null || normalized.to !== null) {
    active.push({
      type: "dateRange",
      field: normalized.dateField,
      from: normalized.from,
      to: normalized.to
    });
  }

  return {
    active,
    count: active.length,
    isEmpty: active.length === 0
  };
}
