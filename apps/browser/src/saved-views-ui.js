import {
  createSavedView,
  deleteSavedView,
  duplicateSavedView,
  exportSavedViews,
  importSavedViews,
  setDefaultSavedView,
  updateSavedView
} from "../../../packages/library/src/saved-views.js";

function createButton(label, action, viewId) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;

  if (viewId) {
    button.dataset.viewId = viewId;
  }

  return button;
}

function createViewItem(view, activeViewId) {
  const item = document.createElement("li");
  item.className = "library-saved-views__item";

  if (view.id === activeViewId) {
    item.dataset.active = "true";
  }

  const main = document.createElement("button");
  main.type = "button";
  main.className = "library-saved-views__select";
  main.dataset.action = "apply-view";
  main.dataset.viewId = view.id;

  const title = document.createElement("strong");
  title.textContent = view.name;

  const description = document.createElement("span");
  description.textContent =
    view.description ||
    (view.isDefault ? "Default view" : "Saved view");

  main.append(title, description);

  const actions = document.createElement("div");
  actions.className = "library-saved-views__item-actions";
  actions.append(
    createButton("Default", "set-default", view.id),
    createButton("Rename", "rename-view", view.id),
    createButton("Duplicate", "duplicate-view", view.id),
    createButton("Delete", "delete-view", view.id)
  );

  item.append(main, actions);
  return item;
}

export function renderLibrarySavedViews({
  root,
  views,
  activeViewId = null,
  status = ""
}) {
  if (!root) {
    throw new Error("Saved views root is required.");
  }

  root.replaceChildren();

  const header = document.createElement("div");
  header.className = "library-saved-views__header";

  const heading = document.createElement("h2");
  heading.textContent = "Saved views";

  const headerActions = document.createElement("div");
  headerActions.className = "library-saved-views__header-actions";
  headerActions.append(
    createButton("Save current", "save-current"),
    createButton("Export", "export-views"),
    createButton("Import", "import-views")
  );

  header.append(heading, headerActions);

  const list = document.createElement("ul");
  list.className = "library-saved-views__list";

  for (const view of views) {
    list.append(createViewItem(view, activeViewId));
  }

  if (views.length === 0) {
    const empty = document.createElement("p");
    empty.className = "library-saved-views__empty";
    empty.textContent =
      "Save your current search, filters, and sort as a reusable view.";
    list.append(empty);
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;
  fileInput.dataset.role = "saved-views-import";

  const statusElement = document.createElement("p");
  statusElement.className = "library-saved-views__status";
  statusElement.textContent = status;

  root.append(header, list, fileInput, statusElement);
}

function downloadText(filename, content) {
  const blob = new Blob([content], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function initializeLibrarySavedViewsUI({
  root,
  loadViews,
  saveViews,
  getCurrentQuery,
  applyQuery
}) {
  if (!root) {
    return null;
  }

  let views = loadViews();
  let activeViewId = null;
  let status = "";

  function persist(nextViews) {
    views = saveViews(nextViews);
    return views;
  }

  function refresh() {
    renderLibrarySavedViews({
      root,
      views,
      activeViewId,
      status
    });
  }

  function findView(viewId) {
    return views.find((view) => view.id === viewId);
  }

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const viewId = button.dataset.viewId;

    if (action === "save-current") {
      const name = globalThis.prompt?.("Saved view name");

      if (!name) {
        return;
      }

      const description =
        globalThis.prompt?.("Description (optional)") ?? "";

      const view = createSavedView({
        name,
        description,
        query: getCurrentQuery()
      });

      persist([...views, view]);
      activeViewId = view.id;
      status = "Saved current view.";
      refresh();
      return;
    }

    if (action === "apply-view") {
      const view = findView(viewId);

      if (!view) {
        return;
      }

      await applyQuery(view.query);
      activeViewId = view.id;
      status = `Applied “${view.name}”.`;
      refresh();
      return;
    }

    if (action === "set-default") {
      persist(setDefaultSavedView(views, viewId));
      status = "Default saved view updated.";
      refresh();
      return;
    }

    if (action === "rename-view") {
      const view = findView(viewId);

      if (!view) {
        return;
      }

      const name = globalThis.prompt?.(
        "Rename saved view",
        view.name
      );

      if (!name) {
        return;
      }

      persist(
        views.map((item) =>
          item.id === viewId
            ? updateSavedView(item, { name })
            : item
        )
      );
      status = "Saved view renamed.";
      refresh();
      return;
    }

    if (action === "duplicate-view") {
      const view = findView(viewId);

      if (!view) {
        return;
      }

      persist([...views, duplicateSavedView(view)]);
      status = "Saved view duplicated.";
      refresh();
      return;
    }

    if (action === "delete-view") {
      const confirmed =
        globalThis.confirm?.("Delete this saved view?") ?? true;

      if (!confirmed) {
        return;
      }

      persist(deleteSavedView(views, viewId));

      if (activeViewId === viewId) {
        activeViewId = null;
      }

      status = "Saved view deleted.";
      refresh();
      return;
    }

    if (action === "export-views") {
      downloadText(
        `ai-relay-saved-views-${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
        exportSavedViews(views)
      );
      status = `Exported ${views.length} saved view(s).`;
      refresh();
      return;
    }

    if (action === "import-views") {
      root
        .querySelector('[data-role="saved-views-import"]')
        ?.click();
    }
  });

  root.addEventListener("change", async (event) => {
    const input = event.target.closest(
      '[data-role="saved-views-import"]'
    );

    if (!input?.files?.[0]) {
      return;
    }

    try {
      const content = await input.files[0].text();
      persist(
        importSavedViews(content, {
          existingViews: views
        })
      );
      status = "Saved views imported.";
    } catch (error) {
      status =
        error instanceof Error
          ? error.message
          : "Unable to import saved views.";
    } finally {
      input.value = "";
      refresh();
    }
  });

  const defaultView = views.find((view) => view.isDefault);

  if (defaultView) {
    Promise.resolve(applyQuery(defaultView.query)).then(() => {
      activeViewId = defaultView.id;
      status = `Applied default view “${defaultView.name}”.`;
      refresh();
    });
  } else {
    refresh();
  }

  return {
    getViews: () => views,
    getActiveViewId: () => activeViewId,
    refresh
  };
}
