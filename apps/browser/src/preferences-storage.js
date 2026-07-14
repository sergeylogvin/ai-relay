import {
  DEFAULT_LIBRARY_PREFERENCES,
  normalizeLibraryPreferences
} from "../../../packages/library/src/preferences.js";

export const LIBRARY_PREFERENCES_KEY =
  "aiRelay.library.preferences.v1";

function resolveStorage(storage) {
  return storage ?? globalThis.localStorage;
}

export function loadLibraryPreferences(storage) {
  const target = resolveStorage(storage);

  if (!target) {
    return { ...DEFAULT_LIBRARY_PREFERENCES };
  }

  const raw = target.getItem(LIBRARY_PREFERENCES_KEY);

  if (!raw) {
    return { ...DEFAULT_LIBRARY_PREFERENCES };
  }

  try {
    return normalizeLibraryPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LIBRARY_PREFERENCES };
  }
}

export function saveLibraryPreferences(preferences, storage) {
  const target = resolveStorage(storage);
  const normalized = normalizeLibraryPreferences(preferences);

  if (target) {
    target.setItem(
      LIBRARY_PREFERENCES_KEY,
      JSON.stringify(normalized)
    );
  }

  return normalized;
}

export function clearLibraryPreferences(storage) {
  const target = resolveStorage(storage);

  if (target) {
    target.removeItem(LIBRARY_PREFERENCES_KEY);
  }

  return { ...DEFAULT_LIBRARY_PREFERENCES };
}
