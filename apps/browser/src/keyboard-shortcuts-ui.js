import {
  createShortcutRegistry,
  formatShortcutLabel,
  isEditableTarget
} from "../../../packages/library/src/keyboard-shortcuts.js";

export const DEFAULT_LIBRARY_SHORTCUTS = [
  {
    id: "focus-search",
    key: "/",
    description: "Focus library search",
    category: "Navigation",
    allowInEditable: false
  },
  {
    id: "open-command-palette-meta",
    key: "k",
    modifiers: ["meta"],
    description: "Open command palette",
    category: "Navigation",
    allowInEditable: true
  },
  {
    id: "open-command-palette-ctrl",
    key: "k",
    modifiers: ["ctrl"],
    description: "Open command palette",
    category: "Navigation",
    allowInEditable: true
  },
  {
    id: "new-collection-meta",
    key: "n",
    modifiers: ["meta"],
    description: "Create a new collection",
    category: "Collections"
  },
  {
    id: "new-collection-ctrl",
    key: "n",
    modifiers: ["ctrl"],
    description: "Create a new collection",
    category: "Collections"
  },
  {
    id: "clear-or-close",
    key: "escape",
    description: "Close overlays or clear selection",
    category: "Navigation",
    allowInEditable: true
  },
  {
    id: "open-selected",
    key: "enter",
    description: "Open selected conversation",
    category: "Selection"
  },
  {
    id: "toggle-selected",
    key: "space",
    description: "Toggle selected conversation",
    category: "Selection"
  },
  {
    id: "select-previous",
    key: "arrowup",
    description: "Move selection up",
    category: "Selection"
  },
  {
    id: "select-next",
    key: "arrowdown",
    description: "Move selection down",
    category: "Selection"
  },
  {
    id: "delete-selected",
    key: "delete",
    description: "Delete selected conversations",
    category: "Selection"
  }
];

function emitCommand(commandId) {
  document.dispatchEvent(
    new CustomEvent("ai-relay:library-command", {
      detail: { commandId }
    })
  );
}

export function initializeLibraryKeyboardShortcuts({
  shortcuts = DEFAULT_LIBRARY_SHORTCUTS,
  handlers = {}
} = {}) {
  const registry = createShortcutRegistry(shortcuts);

  function keydown(event) {
    const shortcut = registry.findByEvent(event);

    if (!shortcut) {
      return;
    }

    if (
      isEditableTarget(event.target) &&
      !shortcut.allowInEditable
    ) {
      return;
    }

    if (shortcut.preventDefault) {
      event.preventDefault();
    }

    const handler = handlers[shortcut.id];

    if (typeof handler === "function") {
      handler(event, shortcut);
      return;
    }

    emitCommand(shortcut.id);
  }

  document.addEventListener("keydown", keydown);

  return {
    destroy() {
      document.removeEventListener("keydown", keydown);
    },

    list() {
      return registry.list();
    },

    format(shortcut, platform = navigator.platform) {
      return formatShortcutLabel(shortcut, { platform });
    }
  };
}

export function renderShortcutReference({
  root,
  shortcuts = DEFAULT_LIBRARY_SHORTCUTS
}) {
  if (!root) {
    return;
  }

  const registry = createShortcutRegistry(shortcuts);
  const groups = new Map();

  for (const shortcut of registry.list()) {
    if (!groups.has(shortcut.category)) {
      groups.set(shortcut.category, []);
    }

    groups.get(shortcut.category).push(shortcut);
  }

  root.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = "Keyboard shortcuts";
  root.append(heading);

  for (const [category, entries] of groups) {
    const section = document.createElement("section");
    const title = document.createElement("h3");
    title.textContent = category;

    const list = document.createElement("dl");

    for (const shortcut of entries) {
      const term = document.createElement("dt");
      const key = document.createElement("kbd");
      key.textContent = formatShortcutLabel(shortcut, {
        platform: navigator.platform
      });
      term.append(key);

      const description = document.createElement("dd");
      description.textContent = shortcut.description;

      list.append(term, description);
    }

    section.append(title, list);
    root.append(section);
  }
}
