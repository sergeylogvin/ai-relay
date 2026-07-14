import { LibraryValidationError } from "./errors.js";

const DEFAULT_LIMIT = 100;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map(normalizeString)
      .filter(Boolean)
  )];
}

function normalizeDate(value, fallback) {
  const date = value ? new Date(value) : new Date(fallback);

  if (Number.isNaN(date.getTime())) {
    return new Date(fallback).toISOString();
  }

  return date.toISOString();
}

function normalizeFilters(filters = {}) {
  if (
    filters === null ||
    typeof filters !== "object" ||
    Array.isArray(filters)
  ) {
    throw new LibraryValidationError(
      "Saved view filters must be an object."
    );
  }

  return {
    providers: normalizeStringArray(filters.providers),
    domains: normalizeStringArray(filters.domains),
    tags: normalizeStringArray(filters.tags),
    collectionIds: normalizeStringArray(filters.collectionIds),
    pinned:
      typeof filters.pinned === "boolean"
        ? filters.pinned
        : null,
    hasNotes:
      typeof filters.hasNotes === "boolean"
        ? filters.hasNotes
        : null,
    hasDuplicates:
      typeof filters.hasDuplicates === "boolean"
        ? filters.hasDuplicates
        : null,
    updatedFrom: normalizeString(filters.updatedFrom) || null,
    updatedTo: normalizeString(filters.updatedTo) || null
  };
}

function normalizeQuery(query = {}) {
  if (
    query === null ||
    typeof query !== "object" ||
    Array.isArray(query)
  ) {
    throw new LibraryValidationError(
      "Saved view query must be an object."
    );
  }

  return {
    search: normalizeString(query.search),
    sort: normalizeString(query.sort) || "updated-desc",
    collectionId: normalizeString(query.collectionId) || null,
    filters: normalizeFilters(query.filters)
  };
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `view-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export function normalizeSavedView(
  value,
  {
    now = new Date(),
    createMissingId = false
  } = {}
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new LibraryValidationError(
      "Saved view must be an object."
    );
  }

  const fallbackDate = new Date(now).toISOString();
  const id =
    normalizeString(value.id) ||
    (createMissingId ? createId() : "");

  if (!id) {
    throw new LibraryValidationError(
      "Saved view id is required."
    );
  }

  const name = normalizeString(value.name);

  if (!name) {
    throw new LibraryValidationError(
      "Saved view name is required."
    );
  }

  return {
    id,
    name,
    description: normalizeString(value.description),
    isDefault: value.isDefault === true,
    query: normalizeQuery(value.query),
    createdAt: normalizeDate(value.createdAt, fallbackDate),
    updatedAt: normalizeDate(value.updatedAt, fallbackDate)
  };
}

export function normalizeSavedViews(
  views,
  {
    limit = DEFAULT_LIMIT,
    now = new Date()
  } = {}
) {
  if (!Array.isArray(views)) {
    throw new LibraryValidationError(
      "Saved views must be an array."
    );
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new LibraryValidationError(
      "Saved views limit must be a positive integer."
    );
  }

  const normalized = views
    .slice(0, limit)
    .map((view) =>
      normalizeSavedView(view, {
        now,
        createMissingId: true
      })
    );

  const seenIds = new Set();
  const seenNames = new Set();
  let defaultAssigned = false;

  return normalized.map((view) => {
    let id = view.id;

    while (seenIds.has(id)) {
      id = createId();
    }

    seenIds.add(id);

    let name = view.name;
    let suffix = 2;

    while (seenNames.has(name.toLowerCase())) {
      name = `${view.name} (${suffix})`;
      suffix += 1;
    }

    seenNames.add(name.toLowerCase());

    const isDefault = view.isDefault && !defaultAssigned;

    if (isDefault) {
      defaultAssigned = true;
    }

    return {
      ...view,
      id,
      name,
      isDefault
    };
  });
}

export function createSavedView(
  input,
  {
    now = new Date()
  } = {}
) {
  const timestamp = new Date(now).toISOString();

  return normalizeSavedView(
    {
      ...input,
      id: input?.id || createId(),
      createdAt: input?.createdAt || timestamp,
      updatedAt: timestamp
    },
    {
      now,
      createMissingId: true
    }
  );
}

export function updateSavedView(
  view,
  changes,
  {
    now = new Date()
  } = {}
) {
  if (
    changes === null ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    throw new LibraryValidationError(
      "Saved view changes must be an object."
    );
  }

  const current = normalizeSavedView(view, { now });

  return normalizeSavedView(
    {
      ...current,
      ...changes,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date(now).toISOString(),
      query: changes.query
        ? {
            ...current.query,
            ...changes.query,
            filters: {
              ...current.query.filters,
              ...(changes.query.filters ?? {})
            }
          }
        : current.query
    },
    { now }
  );
}

export function setDefaultSavedView(views, viewId) {
  const normalized = normalizeSavedViews(views);
  const target = normalizeString(viewId);

  if (!normalized.some((view) => view.id === target)) {
    throw new LibraryValidationError(
      "Default saved view was not found."
    );
  }

  return normalized.map((view) => ({
    ...view,
    isDefault: view.id === target
  }));
}

export function duplicateSavedView(
  view,
  {
    now = new Date(),
    name
  } = {}
) {
  const source = normalizeSavedView(view, { now });

  return createSavedView(
    {
      ...source,
      id: undefined,
      name: normalizeString(name) || `${source.name} copy`,
      isDefault: false
    },
    { now }
  );
}

export function deleteSavedView(views, viewId) {
  const normalized = normalizeSavedViews(views);
  const target = normalizeString(viewId);
  const remaining = normalized.filter(
    (view) => view.id !== target
  );

  if (remaining.length === normalized.length) {
    throw new LibraryValidationError(
      "Saved view was not found."
    );
  }

  return remaining;
}

export function exportSavedViews(views) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      views: normalizeSavedViews(views)
    },
    null,
    2
  );
}

export function importSavedViews(
  content,
  {
    existingViews = [],
    now = new Date()
  } = {}
) {
  let parsed;

  try {
    parsed =
      typeof content === "string"
        ? JSON.parse(content)
        : content;
  } catch {
    throw new LibraryValidationError(
      "Saved views import is not valid JSON."
    );
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new LibraryValidationError(
      "Saved views import must be an object."
    );
  }

  if (parsed.schemaVersion !== 1) {
    throw new LibraryValidationError(
      "Unsupported saved views schema version."
    );
  }

  const imported = normalizeSavedViews(parsed.views ?? [], {
    now
  });

  return normalizeSavedViews(
    [...existingViews, ...imported],
    { now }
  );
}
