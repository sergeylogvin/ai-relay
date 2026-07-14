import { LibraryValidationError } from "./errors.js";

const MODIFIER_ORDER = ["meta", "ctrl", "alt", "shift"];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  const key = normalizeString(value).toLowerCase();

  const aliases = {
    " ": "space",
    esc: "escape",
    del: "delete",
    return: "enter",
    cmd: "meta",
    command: "meta",
    option: "alt"
  };

  return aliases[key] ?? key;
}

function normalizeModifiers(value) {
  const modifiers = Array.isArray(value)
    ? value
    : normalizeString(value)
        .split("+")
        .map((item) => item.trim());

  return MODIFIER_ORDER.filter((modifier) =>
    modifiers
      .map(normalizeKey)
      .includes(modifier)
  );
}

export function normalizeShortcut(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new LibraryValidationError(
      "Keyboard shortcut must be an object."
    );
  }

  const id = normalizeString(value.id);
  const key = normalizeKey(value.key);

  if (!id) {
    throw new LibraryValidationError(
      "Keyboard shortcut id is required."
    );
  }

  if (!key) {
    throw new LibraryValidationError(
      "Keyboard shortcut key is required."
    );
  }

  return {
    id,
    key,
    modifiers: normalizeModifiers(value.modifiers),
    description: normalizeString(value.description),
    category: normalizeString(value.category) || "General",
    enabled: value.enabled !== false,
    allowInEditable: value.allowInEditable === true,
    preventDefault: value.preventDefault !== false
  };
}

export function normalizeShortcutList(shortcuts) {
  if (!Array.isArray(shortcuts)) {
    throw new LibraryValidationError(
      "Keyboard shortcuts must be an array."
    );
  }

  const seen = new Set();

  return shortcuts.map((shortcut) => {
    const normalized = normalizeShortcut(shortcut);
    const signature = shortcutSignature(normalized);

    if (seen.has(signature)) {
      throw new LibraryValidationError(
        `Duplicate keyboard shortcut: ${signature}.`
      );
    }

    seen.add(signature);
    return normalized;
  });
}

export function shortcutSignature(shortcut) {
  const normalized = normalizeShortcut(shortcut);

  return [...normalized.modifiers, normalized.key].join("+");
}

export function shortcutMatchesEvent(shortcut, event) {
  const normalized = normalizeShortcut(shortcut);

  if (!normalized.enabled || !event) {
    return false;
  }

  const eventKey = normalizeKey(event.key);
  const required = new Set(normalized.modifiers);

  return (
    eventKey === normalized.key &&
    Boolean(event.metaKey) === required.has("meta") &&
    Boolean(event.ctrlKey) === required.has("ctrl") &&
    Boolean(event.altKey) === required.has("alt") &&
    Boolean(event.shiftKey) === required.has("shift")
  );
}

export function isEditableTarget(target) {
  if (!target || typeof target !== "object") {
    return false;
  }

  const tagName = normalizeString(target.tagName).toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable === true
  );
}

export function formatShortcutLabel(
  shortcut,
  {
    platform = ""
  } = {}
) {
  const normalized = normalizeShortcut(shortcut);
  const isMac = normalizeString(platform)
    .toLowerCase()
    .includes("mac");

  const labels = {
    meta: isMac ? "⌘" : "Meta",
    ctrl: isMac ? "⌃" : "Ctrl",
    alt: isMac ? "⌥" : "Alt",
    shift: isMac ? "⇧" : "Shift",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    escape: "Esc",
    enter: "Enter",
    space: "Space",
    delete: "Delete"
  };

  const parts = normalized.modifiers.map(
    (modifier) => labels[modifier] ?? modifier
  );

  parts.push(
    labels[normalized.key] ??
      normalized.key.length === 1
        ? normalized.key.toUpperCase()
        : normalized.key
  );

  return isMac ? parts.join("") : parts.join("+");
}

export function createShortcutRegistry(shortcuts = []) {
  let entries = normalizeShortcutList(shortcuts);

  return {
    list() {
      return [...entries];
    },

    replace(nextShortcuts) {
      entries = normalizeShortcutList(nextShortcuts);
      return [...entries];
    },

    findByEvent(event) {
      return (
        entries.find((shortcut) =>
          shortcutMatchesEvent(shortcut, event)
        ) ?? null
      );
    },

    get(id) {
      return (
        entries.find(
          (shortcut) => shortcut.id === id
        ) ?? null
      );
    }
  };
}
