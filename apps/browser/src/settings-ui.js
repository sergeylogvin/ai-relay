import {
  DEFAULT_LIBRARY_PREFERENCES,
  mergeLibraryPreferences
} from "../../../packages/library/src/preferences.js";

function createSelect(name, label, options, value) {
  const wrapper = document.createElement("label");
  wrapper.className = "library-settings__field";

  const title = document.createElement("span");
  title.textContent = label;

  const select = document.createElement("select");
  select.name = name;

  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.append(option);
  }

  wrapper.append(title, select);
  return wrapper;
}

function createCheckbox(name, label, checked) {
  const wrapper = document.createElement("label");
  wrapper.className =
    "library-settings__field library-settings__field--checkbox";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = name;
  input.checked = checked;

  const title = document.createElement("span");
  title.textContent = label;

  wrapper.append(input, title);
  return wrapper;
}

function createNumber(name, label, value) {
  const wrapper = document.createElement("label");
  wrapper.className = "library-settings__field";

  const title = document.createElement("span");
  title.textContent = label;

  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.min = "10";
  input.max = "500";
  input.step = "10";
  input.value = String(value);

  wrapper.append(title, input);
  return wrapper;
}

export function renderLibrarySettings({
  root,
  preferences = DEFAULT_LIBRARY_PREFERENCES,
  status = ""
}) {
  if (!root) {
    throw new Error("Library settings root is required.");
  }

  root.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = "Library settings";

  const form = document.createElement("form");
  form.className = "library-settings__form";

  form.append(
    createSelect(
      "defaultSort",
      "Default sort",
      [
        ["updated-desc", "Recently updated"],
        ["updated-asc", "Oldest updated"],
        ["created-desc", "Recently created"],
        ["created-asc", "Oldest created"],
        ["title-asc", "Title A–Z"],
        ["title-desc", "Title Z–A"]
      ],
      preferences.defaultSort
    ),
    createSelect(
      "defaultView",
      "List density",
      [
        ["compact", "Compact"],
        ["comfortable", "Comfortable"],
        ["spacious", "Spacious"]
      ],
      preferences.defaultView
    ),
    createSelect(
      "theme",
      "Theme",
      [
        ["system", "System"],
        ["light", "Light"],
        ["dark", "Dark"]
      ],
      preferences.theme
    ),
    createNumber(
      "pageSize",
      "Records per page",
      preferences.pageSize
    ),
    createCheckbox(
      "rememberFilters",
      "Remember filters",
      preferences.rememberFilters
    ),
    createCheckbox(
      "openLinksInNewTab",
      "Open conversation links in a new tab",
      preferences.openLinksInNewTab
    ),
    createCheckbox(
      "confirmBeforeDelete",
      "Confirm before deleting conversations",
      preferences.confirmBeforeDelete
    ),
    createCheckbox(
      "confirmBeforeImport",
      "Confirm before importing backups",
      preferences.confirmBeforeImport
    ),
    createCheckbox(
      "autoPinImported",
      "Pin newly imported conversations",
      preferences.autoPinImported
    )
  );

  const actions = document.createElement("div");
  actions.className = "library-settings__actions";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "Save settings";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.dataset.action = "reset-settings";
  resetButton.textContent = "Reset defaults";

  actions.append(saveButton, resetButton);
  form.append(actions);

  const message = document.createElement("p");
  message.className = "library-settings__status";
  message.textContent = status;

  root.append(heading, form, message);
}

function readForm(form) {
  const data = new FormData(form);

  return {
    defaultSort: data.get("defaultSort"),
    defaultView: data.get("defaultView"),
    theme: data.get("theme"),
    pageSize: Number(data.get("pageSize")),
    rememberFilters: data.has("rememberFilters"),
    openLinksInNewTab: data.has("openLinksInNewTab"),
    confirmBeforeDelete: data.has("confirmBeforeDelete"),
    confirmBeforeImport: data.has("confirmBeforeImport"),
    autoPinImported: data.has("autoPinImported")
  };
}

export function initializeLibrarySettingsUI({
  root,
  loadPreferences,
  savePreferences,
  resetPreferences,
  onChange
}) {
  if (!root) {
    return null;
  }

  let preferences = loadPreferences();
  let status = "";

  function refresh() {
    renderLibrarySettings({
      root,
      preferences,
      status
    });
  }

  root.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form) return;

    event.preventDefault();

    preferences = mergeLibraryPreferences(
      preferences,
      readForm(form)
    );

    preferences = savePreferences(preferences);
    status = "Settings saved.";

    document.dispatchEvent(
      new CustomEvent("ai-relay:library-preferences-changed", {
        detail: preferences
      })
    );

    onChange?.(preferences);
    refresh();
  });

  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action !== "reset-settings") {
      return;
    }

    preferences = resetPreferences();
    status = "Defaults restored.";

    document.dispatchEvent(
      new CustomEvent("ai-relay:library-preferences-changed", {
        detail: preferences
      })
    );

    onChange?.(preferences);
    refresh();
  });

  refresh();

  return {
    getPreferences: () => preferences,
    refresh
  };
}
