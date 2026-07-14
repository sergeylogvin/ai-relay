const DEFAULT_COLLECTION_COLOR = "#6b7280";

function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeCollection(collection = {}) {
  const id = normalizeText(collection.id);
  const name = normalizeText(collection.name);

  if (!id) {
    throw new Error("Collection id is required.");
  }

  if (!name) {
    throw new Error("Collection name is required.");
  }

  return {
    id,
    name,
    color: normalizeText(collection.color) || DEFAULT_COLLECTION_COLOR,
    icon: normalizeText(collection.icon) || "folder",
    createdAt: collection.createdAt ?? null,
    updatedAt: collection.updatedAt ?? null
  };
}

export function sortCollections(collections = []) {
  return [...collections]
    .map(normalizeCollection)
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base"
        }) || left.id.localeCompare(right.id)
    );
}

export function countCollectionRecords(records = []) {
  const counts = new Map();

  for (const record of records) {
    const ids = Array.isArray(record?.collectionIds)
      ? record.collectionIds
      : [];

    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return counts;
}

export function buildCollectionViewModel({
  collections = [],
  records = [],
  selectedId = null
} = {}) {
  const counts = countCollectionRecords(records);

  return sortCollections(collections).map((collection) => ({
    ...collection,
    count: counts.get(collection.id) ?? 0,
    selected: collection.id === selectedId
  }));
}

export function createCollectionId(name, existingIds = []) {
  const base =
    normalizeText(name)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "collection";

  const used = new Set(existingIds.map(String));

  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function createButton(label, className, action, collectionId = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;

  if (collectionId) {
    button.dataset.collectionId = collectionId;
  }

  button.textContent = label;
  return button;
}

function dispatchCollectionEvent(name, detail) {
  document.dispatchEvent(
    new CustomEvent(`ai-relay:${name}`, {
      bubbles: true,
      detail
    })
  );
}

export function renderCollectionsPanel({
  root,
  collections = [],
  records = [],
  selectedId = null
}) {
  if (!root) {
    throw new Error("Collections root element is required.");
  }

  const viewModel = buildCollectionViewModel({
    collections,
    records,
    selectedId
  });

  root.replaceChildren();

  const header = document.createElement("div");
  header.className = "collections-panel__header";

  const title = document.createElement("h2");
  title.textContent = "Collections";

  header.append(
    title,
    createButton(
      "New",
      "collections-panel__new",
      "create-collection"
    )
  );

  const list = document.createElement("div");
  list.className = "collections-panel__list";
  list.setAttribute("role", "list");

  const allButton = createButton(
    `All conversations (${records.length})`,
    `collections-panel__item${
      selectedId === null ? " is-selected" : ""
    }`,
    "select-collection"
  );
  allButton.dataset.collectionId = "";
  allButton.setAttribute("role", "listitem");
  list.append(allButton);

  for (const collection of viewModel) {
    const row = document.createElement("div");
    row.className = `collections-panel__row${
      collection.selected ? " is-selected" : ""
    }`;
    row.dataset.collectionId = collection.id;
    row.setAttribute("role", "listitem");
    row.draggable = false;

    const select = createButton(
      `${collection.name} (${collection.count})`,
      "collections-panel__item",
      "select-collection",
      collection.id
    );

    const swatch = document.createElement("span");
    swatch.className = "collections-panel__swatch";
    swatch.style.backgroundColor = collection.color;
    swatch.setAttribute("aria-hidden", "true");
    select.prepend(swatch);

    const actions = document.createElement("div");
    actions.className = "collections-panel__actions";
    actions.append(
      createButton(
        "Edit",
        "collections-panel__action",
        "edit-collection",
        collection.id
      ),
      createButton(
        "Delete",
        "collections-panel__action collections-panel__action--danger",
        "delete-collection",
        collection.id
      )
    );

    row.append(select, actions);
    list.append(row);
  }

  root.append(header, list);
}

export function initializeCollectionsUI({
  root,
  getCollections,
  getRecords,
  createCollection,
  updateCollection,
  deleteCollection,
  assignRecords,
  onSelect
}) {
  if (!root) {
    return null;
  }

  let selectedId = null;

  async function refresh() {
    const [collections, records] = await Promise.all([
      getCollections(),
      getRecords()
    ]);

    renderCollectionsPanel({
      root,
      collections,
      records,
      selectedId
    });
  }

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const collectionId = button.dataset.collectionId || null;

    if (action === "select-collection") {
      selectedId = collectionId;
      onSelect?.(collectionId);
      dispatchCollectionEvent("collection-selected", {
        collectionId
      });
      await refresh();
      return;
    }

    if (action === "create-collection") {
      const name = window.prompt("Collection name:");
      if (!normalizeText(name)) return;

      await createCollection({ name: normalizeText(name) });
      dispatchCollectionEvent("collections-changed", {
        action: "create"
      });
      await refresh();
      return;
    }

    if (action === "edit-collection") {
      const collections = await getCollections();
      const collection = collections.find(
        (item) => item.id === collectionId
      );
      if (!collection) return;

      const name = window.prompt(
        "Rename collection:",
        collection.name
      );
      if (!normalizeText(name)) return;

      await updateCollection(collectionId, {
        name: normalizeText(name)
      });
      dispatchCollectionEvent("collections-changed", {
        action: "update",
        collectionId
      });
      await refresh();
      return;
    }

    if (action === "delete-collection") {
      const confirmed = window.confirm(
        "Delete this collection? Conversations will not be deleted."
      );
      if (!confirmed) return;

      await deleteCollection(collectionId);

      if (selectedId === collectionId) {
        selectedId = null;
        onSelect?.(null);
      }

      dispatchCollectionEvent("collections-changed", {
        action: "delete",
        collectionId
      });
      await refresh();
    }
  });

  root.addEventListener("dragover", (event) => {
    const target = event.target.closest("[data-collection-id]");
    if (!target) return;

    event.preventDefault();
    target.classList.add("is-drag-over");
  });

  root.addEventListener("dragleave", (event) => {
    event.target
      .closest("[data-collection-id]")
      ?.classList.remove("is-drag-over");
  });

  root.addEventListener("drop", async (event) => {
    const target = event.target.closest("[data-collection-id]");
    if (!target) return;

    event.preventDefault();
    target.classList.remove("is-drag-over");

    const collectionId = target.dataset.collectionId || null;
    if (!collectionId) return;

    const raw = event.dataTransfer?.getData(
      "application/x-ai-relay-record-ids"
    );

    let recordIds = [];

    try {
      recordIds = JSON.parse(raw || "[]");
    } catch {
      recordIds = [];
    }

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return;
    }

    await assignRecords(recordIds, collectionId);
    dispatchCollectionEvent("collections-changed", {
      action: "assign",
      collectionId,
      recordIds
    });
    await refresh();
  });

  document.addEventListener("ai-relay:library-records-changed", refresh);
  document.addEventListener("ai-relay:collections-changed", refresh);

  refresh();

  return {
    refresh,
    getSelectedId: () => selectedId,
    select: async (collectionId) => {
      selectedId = collectionId || null;
      onSelect?.(selectedId);
      await refresh();
    }
  };
}
