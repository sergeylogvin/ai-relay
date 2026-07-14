import {
  normalizeSavedViews
} from "../../../packages/library/src/saved-views.js";

export const LIBRARY_SAVED_VIEWS_KEY =
  "aiRelay.library.savedViews.v1";

function resolveStorage(storage) {
  return storage ?? globalThis.localStorage;
}

export function loadSavedViews(storage) {
  const target = resolveStorage(storage);

  if (!target) {
    return [];
  }

  const raw = target.getItem(LIBRARY_SAVED_VIEWS_KEY);

  if (!raw) {
    return [];
  }

  try {
    return normalizeSavedViews(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSavedViews(views, storage) {
  const target = resolveStorage(storage);
  const normalized = normalizeSavedViews(views);

  if (target) {
    target.setItem(
      LIBRARY_SAVED_VIEWS_KEY,
      JSON.stringify(normalized)
    );
  }

  return normalized;
}

export function clearSavedViews(storage) {
  const target = resolveStorage(storage);

  if (target) {
    target.removeItem(LIBRARY_SAVED_VIEWS_KEY);
  }

  return [];
}
