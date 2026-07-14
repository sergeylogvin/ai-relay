import {
  buildEmptyState,
  createFocusHistory,
  normalizeAnnouncement,
  trapFocus
} from "../../../packages/library/src/accessibility.js";

export function createLiveRegion({
  root = document.body
} = {}) {
  const polite = document.createElement("div");
  polite.className = "sr-only";
  polite.setAttribute("aria-live", "polite");
  polite.setAttribute("aria-atomic", "true");

  const assertive = document.createElement("div");
  assertive.className = "sr-only";
  assertive.setAttribute("aria-live", "assertive");
  assertive.setAttribute("aria-atomic", "true");

  root.append(polite, assertive);

  let clearTimer = null;

  function announce(value) {
    const announcement = normalizeAnnouncement(value);
    const target =
      announcement.politeness === "assertive"
        ? assertive
        : polite;

    target.textContent = "";

    requestAnimationFrame(() => {
      target.textContent = announcement.message;
    });

    if (clearTimer) {
      clearTimeout(clearTimer);
    }

    clearTimer = setTimeout(() => {
      target.textContent = "";
    }, announcement.clearAfterMs);
  }

  return {
    announce,
    destroy() {
      if (clearTimer) {
        clearTimeout(clearTimer);
      }

      polite.remove();
      assertive.remove();
    }
  };
}

export function renderEmptyState({
  root,
  title,
  message,
  actionLabel,
  actionId
}) {
  if (!root) {
    return null;
  }

  const state = buildEmptyState({
    title,
    message,
    actionLabel,
    actionId
  });

  root.replaceChildren();

  const container = document.createElement("div");
  container.className = "library-empty-state";
  container.setAttribute("role", "status");

  const heading = document.createElement("h2");
  heading.textContent = state.title;

  const text = document.createElement("p");
  text.textContent = state.message;

  container.append(heading, text);

  if (state.action) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = state.action.id;
    button.textContent = state.action.label;
    container.append(button);
  }

  root.append(container);
  return container;
}

export function renderLoadingState({
  root,
  rows = 5,
  label = "Loading library"
}) {
  if (!root) {
    return;
  }

  root.replaceChildren();

  const container = document.createElement("div");
  container.className = "library-loading";
  container.setAttribute("role", "status");
  container.setAttribute("aria-label", label);
  container.setAttribute("aria-busy", "true");

  for (let index = 0; index < rows; index += 1) {
    const row = document.createElement("div");
    row.className = "library-loading__row";
    row.setAttribute("aria-hidden", "true");
    container.append(row);
  }

  root.append(container);
}

export function initializeAccessibleDialog({
  dialog,
  closeButton,
  onClose = () => {}
}) {
  if (!dialog) {
    return null;
  }

  const focusHistory = createFocusHistory();

  function open() {
    focusHistory.push(document.activeElement);
    dialog.hidden = false;
    dialog.setAttribute("aria-hidden", "false");

    const target =
      dialog.querySelector("[autofocus]") ??
      dialog.querySelector(
        "button, input, select, textarea, [tabindex]"
      );

    requestAnimationFrame(() => target?.focus());
  }

  function close() {
    dialog.hidden = true;
    dialog.setAttribute("aria-hidden", "true");
    focusHistory.restore();
    onClose();
  }

  function keydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    trapFocus(dialog, event);
  }

  dialog.addEventListener("keydown", keydown);
  closeButton?.addEventListener("click", close);

  return {
    open,
    close,
    destroy() {
      dialog.removeEventListener("keydown", keydown);
      closeButton?.removeEventListener("click", close);
      focusHistory.clear();
    }
  };
}

export function applyLibraryAccessibility(root = document) {
  const interactive = root.querySelectorAll(
    "button, a, input, select, textarea"
  );

  interactive.forEach((element) => {
    if (
      !element.getAttribute("aria-label") &&
      !element.getAttribute("aria-labelledby") &&
      !element.textContent?.trim() &&
      !element.getAttribute("title")
    ) {
      element.setAttribute("aria-label", "Library control");
    }
  });

  const statusElements = root.querySelectorAll(
    ".library-analytics__status, " +
      ".library-saved-views__status, " +
      ".command-palette__status"
  );

  statusElements.forEach((element) => {
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-atomic", "true");
  });

  const lists = root.querySelectorAll(
    ".library-saved-views__list, " +
      ".command-palette__list"
  );

  lists.forEach((element) => {
    if (!element.getAttribute("aria-label")) {
      element.setAttribute("aria-label", "Library items");
    }
  });
}
