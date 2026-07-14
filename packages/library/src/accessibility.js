import { LibraryValidationError } from "./errors.js";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeAnnouncement(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new LibraryValidationError(
      "Accessibility announcement must be an object."
    );
  }

  const message = normalizeString(value.message);

  if (!message) {
    throw new LibraryValidationError(
      "Accessibility announcement message is required."
    );
  }

  const politeness =
    value.politeness === "assertive"
      ? "assertive"
      : "polite";

  return {
    message,
    politeness,
    clearAfterMs:
      Number.isFinite(value.clearAfterMs) &&
      value.clearAfterMs >= 0
        ? value.clearAfterMs
        : 2000
  };
}

export function createFocusHistory() {
  const stack = [];

  return {
    push(element) {
      if (
        element &&
        typeof element.focus === "function"
      ) {
        stack.push(element);
      }

      return stack.length;
    },

    restore() {
      const element = stack.pop();

      if (
        element &&
        typeof element.focus === "function"
      ) {
        element.focus();
        return true;
      }

      return false;
    },

    clear() {
      stack.length = 0;
    },

    size() {
      return stack.length;
    }
  };
}

export function getFocusableElements(root) {
  if (!root?.querySelectorAll) {
    return [];
  }

  return [...root.querySelectorAll(
    [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",")
  )].filter((element) => {
    if (element.hidden) {
      return false;
    }

    if (element.getAttribute?.("aria-hidden") === "true") {
      return false;
    }

    return true;
  });
}

export function trapFocus(root, event) {
  if (!root || event?.key !== "Tab") {
    return false;
  }

  const focusable = getFocusableElements(root);

  if (focusable.length === 0) {
    event.preventDefault?.();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = root.ownerDocument?.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault?.();
    last.focus();
    return true;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault?.();
    first.focus();
    return true;
  }

  return false;
}

export function buildEmptyState({
  title,
  message,
  actionLabel = "",
  actionId = ""
}) {
  const normalizedTitle = normalizeString(title);
  const normalizedMessage = normalizeString(message);

  if (!normalizedTitle || !normalizedMessage) {
    throw new LibraryValidationError(
      "Empty state title and message are required."
    );
  }

  return {
    title: normalizedTitle,
    message: normalizedMessage,
    action:
      normalizeString(actionLabel) &&
      normalizeString(actionId)
        ? {
            label: normalizeString(actionLabel),
            id: normalizeString(actionId)
          }
        : null
  };
}
