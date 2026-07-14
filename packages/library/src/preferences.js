import { LibraryValidationError } from "./errors.js";

export const DEFAULT_LIBRARY_PREFERENCES = Object.freeze({
  defaultSort: "updated-desc",
  defaultView: "comfortable",
  rememberFilters: true,
  openLinksInNewTab: true,
  confirmBeforeDelete: true,
  confirmBeforeImport: true,
  autoPinImported: false,
  pageSize: 50,
  theme: "system"
});

const SORT_VALUES = new Set([
  "updated-desc",
  "updated-asc",
  "created-desc",
  "created-asc",
  "title-asc",
  "title-desc"
]);

const VIEW_VALUES = new Set([
  "compact",
  "comfortable",
  "spacious"
]);

const THEME_VALUES = new Set([
  "system",
  "light",
  "dark"
]);

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEnum(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function normalizePageSize(value) {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric < 10 || numeric > 500) {
    return DEFAULT_LIBRARY_PREFERENCES.pageSize;
  }

  return numeric;
}

export function normalizeLibraryPreferences(value = {}) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new LibraryValidationError(
      "Library preferences must be an object."
    );
  }

  return {
    defaultSort: normalizeEnum(
      value.defaultSort,
      SORT_VALUES,
      DEFAULT_LIBRARY_PREFERENCES.defaultSort
    ),
    defaultView: normalizeEnum(
      value.defaultView,
      VIEW_VALUES,
      DEFAULT_LIBRARY_PREFERENCES.defaultView
    ),
    rememberFilters: normalizeBoolean(
      value.rememberFilters,
      DEFAULT_LIBRARY_PREFERENCES.rememberFilters
    ),
    openLinksInNewTab: normalizeBoolean(
      value.openLinksInNewTab,
      DEFAULT_LIBRARY_PREFERENCES.openLinksInNewTab
    ),
    confirmBeforeDelete: normalizeBoolean(
      value.confirmBeforeDelete,
      DEFAULT_LIBRARY_PREFERENCES.confirmBeforeDelete
    ),
    confirmBeforeImport: normalizeBoolean(
      value.confirmBeforeImport,
      DEFAULT_LIBRARY_PREFERENCES.confirmBeforeImport
    ),
    autoPinImported: normalizeBoolean(
      value.autoPinImported,
      DEFAULT_LIBRARY_PREFERENCES.autoPinImported
    ),
    pageSize: normalizePageSize(value.pageSize),
    theme: normalizeEnum(
      value.theme,
      THEME_VALUES,
      DEFAULT_LIBRARY_PREFERENCES.theme
    )
  };
}

export function mergeLibraryPreferences(current = {}, changes = {}) {
  const normalizedCurrent = normalizeLibraryPreferences(current);

  if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
    throw new LibraryValidationError(
      "Preference changes must be an object."
    );
  }

  return normalizeLibraryPreferences({
    ...normalizedCurrent,
    ...changes
  });
}

export function diffLibraryPreferences(left = {}, right = {}) {
  const normalizedLeft = normalizeLibraryPreferences(left);
  const normalizedRight = normalizeLibraryPreferences(right);
  const changes = {};

  for (const key of Object.keys(DEFAULT_LIBRARY_PREFERENCES)) {
    if (normalizedLeft[key] !== normalizedRight[key]) {
      changes[key] = {
        from: normalizedLeft[key],
        to: normalizedRight[key]
      };
    }
  }

  return changes;
}

export function resetLibraryPreferences() {
  return {
    ...DEFAULT_LIBRARY_PREFERENCES
  };
}

export function shouldConfirmLibraryAction(preferences, action) {
  const normalized = normalizeLibraryPreferences(preferences);

  if (action === "delete") {
    return normalized.confirmBeforeDelete;
  }

  if (action === "import") {
    return normalized.confirmBeforeImport;
  }

  return false;
}
