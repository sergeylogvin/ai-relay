function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCommand(command) {
  if (
    command === null ||
    typeof command !== "object" ||
    Array.isArray(command)
  ) {
    throw new Error("Command must be an object.");
  }

  const id = normalizeString(command.id);
  const title = normalizeString(command.title);

  if (!id || !title) {
    throw new Error("Command id and title are required.");
  }

  return {
    id,
    title,
    description: normalizeString(command.description),
    category: normalizeString(command.category) || "General",
    keywords: Array.isArray(command.keywords)
      ? command.keywords
          .map(normalizeString)
          .filter(Boolean)
      : [],
    enabled: command.enabled !== false,
    run:
      typeof command.run === "function"
        ? command.run
        : async () => {}
  };
}

function commandScore(command, query) {
  const normalizedQuery = normalizeString(query).toLowerCase();

  if (!normalizedQuery) {
    return 1;
  }

  const title = command.title.toLowerCase();
  const description = command.description.toLowerCase();
  const keywords = command.keywords.join(" ").toLowerCase();

  if (title === normalizedQuery) {
    return 100;
  }

  if (title.startsWith(normalizedQuery)) {
    return 75;
  }

  if (title.includes(normalizedQuery)) {
    return 50;
  }

  if (keywords.includes(normalizedQuery)) {
    return 25;
  }

  if (description.includes(normalizedQuery)) {
    return 10;
  }

  return 0;
}

export function filterCommands(commands, query) {
  return commands
    .map(normalizeCommand)
    .filter((command) => command.enabled)
    .map((command) => ({
      command,
      score: commandScore(command, query)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.command.title.localeCompare(
        right.command.title
      );
    })
    .map((entry) => entry.command);
}

export function initializeCommandPalette({
  root,
  commands = []
}) {
  if (!root) {
    return null;
  }

  const normalizedCommands = commands.map(normalizeCommand);

  let isOpen = false;
  let selectedIndex = 0;
  let filtered = filterCommands(normalizedCommands, "");

  const backdrop = document.createElement("div");
  backdrop.className = "command-palette";
  backdrop.hidden = true;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute(
    "aria-label",
    "Library command palette"
  );

  const panel = document.createElement("div");
  panel.className = "command-palette__panel";

  const input = document.createElement("input");
  input.type = "search";
  input.className = "command-palette__input";
  input.placeholder = "Type a command…";
  input.setAttribute("aria-label", "Search commands");
  input.setAttribute("autocomplete", "off");

  const list = document.createElement("ul");
  list.className = "command-palette__list";
  list.setAttribute("role", "listbox");

  const status = document.createElement("p");
  status.className = "command-palette__status";
  status.setAttribute("aria-live", "polite");

  panel.append(input, list, status);
  backdrop.append(panel);
  root.append(backdrop);

  function render() {
    list.replaceChildren();

    filtered.forEach((command, index) => {
      const item = document.createElement("li");
      item.className = "command-palette__item";
      item.dataset.commandId = command.id;
      item.dataset.selected =
        index === selectedIndex ? "true" : "false";
      item.setAttribute("role", "option");
      item.setAttribute(
        "aria-selected",
        index === selectedIndex ? "true" : "false"
      );

      const title = document.createElement("strong");
      title.textContent = command.title;

      const description = document.createElement("span");
      description.textContent =
        command.description || command.category;

      item.append(title, description);
      list.append(item);
    });

    status.textContent =
      filtered.length === 0
        ? "No matching commands."
        : `${filtered.length} command(s).`;
  }

  function setQuery(value) {
    filtered = filterCommands(
      normalizedCommands,
      value
    );
    selectedIndex = 0;
    render();
  }

  async function runSelected() {
    const command = filtered[selectedIndex];

    if (!command) {
      return;
    }

    close();
    await command.run();
  }

  function open() {
    if (isOpen) {
      return;
    }

    isOpen = true;
    backdrop.hidden = false;
    input.value = "";
    setQuery("");
    requestAnimationFrame(() => input.focus());
  }

  function close() {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    backdrop.hidden = true;
  }

  input.addEventListener("input", () => {
    setQuery(input.value);
  });

  input.addEventListener("keydown", async (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(
        filtered.length - 1,
        selectedIndex + 1
      );
      render();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      render();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await runSelected();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  list.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-command-id]");

    if (!item) {
      return;
    }

    const index = filtered.findIndex(
      (command) => command.id === item.dataset.commandId
    );

    if (index < 0) {
      return;
    }

    selectedIndex = index;
    await runSelected();
  });

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  render();

  return {
    open,
    close,
    isOpen: () => isOpen,
    setQuery,
    getFilteredCommands: () => [...filtered]
  };
}
