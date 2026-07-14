import { ConversationLibrary } from "./library/library.js";
import { BrowserStorageLibraryAdapter } from "./library/browser-storage-adapter.js";
import {
  importLibraryBackup,
  serializeLibraryBackup
} from "./library/backup.js";
import {
  buildContinuationPrompt,
  getProviderUrl
} from "./core/continuation.js";
import {
  filterLibraryRecords,
  listLibraryCollections,
  listLibraryTags,
  sortLibraryRecords,
  updateRecordOrganization
} from "./library/organization.js";

const library = new ConversationLibrary(
  new BrowserStorageLibraryAdapter()
);

const searchInput = document.querySelector("#searchInput");
const providerFilter = document.querySelector("#providerFilter");

const tagFilter = document.createElement("select");
tagFilter.id = "tagFilter";
tagFilter.setAttribute("aria-label", "Tag");
tagFilter.append(new Option("All tags", ""));

const collectionFilter = document.createElement("select");
collectionFilter.id = "collectionFilter";
collectionFilter.setAttribute("aria-label", "Collection");
collectionFilter.append(new Option("All collections", ""));

const pinnedOnlyLabel = document.createElement("label");
pinnedOnlyLabel.className = "checkbox-filter";
const pinnedOnlyFilter = document.createElement("input");
pinnedOnlyFilter.id = "pinnedOnlyFilter";
pinnedOnlyFilter.type = "checkbox";
pinnedOnlyLabel.append(
  pinnedOnlyFilter,
  document.createTextNode("Pinned only")
);

providerFilter.insertAdjacentElement("afterend", pinnedOnlyLabel);
providerFilter.insertAdjacentElement("afterend", collectionFilter);
providerFilter.insertAdjacentElement("afterend", tagFilter);

const organizationPanel = document.createElement("section");
organizationPanel.className = "organization-panel";
organizationPanel.innerHTML = `
  <h3>Organize</h3>
  <label>
    Tags
    <input
      id="recordTagsInput"
      type="text"
      placeholder="project, research, personal"
    />
  </label>
  <label>
    Collection
    <input
      id="recordCollectionInput"
      type="text"
      placeholder="Work, Research, Personal"
      list="collectionSuggestions"
    />
    <datalist id="collectionSuggestions"></datalist>
  </label>
  <label class="checkbox-filter">
    <input id="recordPinnedInput" type="checkbox" />
    Pin this conversation
  </label>
  <button id="saveOrganizationButton" type="button">
    Save organization
  </button>
`;

const detailActions = document.querySelector(".detail-actions");
if (!detailActions) {
  throw new Error("Library detail actions were not found.");
}
detailActions.insertAdjacentElement("beforebegin", organizationPanel);

const recordTagsInput = organizationPanel.querySelector("#recordTagsInput");
const recordPinnedInput = organizationPanel.querySelector(
  "#recordPinnedInput"
);
const recordCollectionInput = organizationPanel.querySelector(
  "#recordCollectionInput"
);
const collectionSuggestions = organizationPanel.querySelector(
  "#collectionSuggestions"
);
const saveOrganizationButton = organizationPanel.querySelector(
  "#saveOrganizationButton"
);
saveOrganizationButton.disabled = true;
const exportLibraryButton = document.querySelector(
  "#exportLibraryButton"
);
const importLibraryButton = document.querySelector(
  "#importLibraryButton"
);
const importLibraryInput = document.querySelector(
  "#importLibraryInput"
);
const refreshButton = document.querySelector("#refreshButton");
const resultCount = document.querySelector("#resultCount");
const status = document.querySelector("#status");
const emptyState = document.querySelector("#emptyState");
const recordList = document.querySelector("#recordList");
const recordTemplate = document.querySelector("#recordTemplate");

const detailPanel = document.querySelector("#detailPanel");
const detailProvider = document.querySelector("#detailProvider");
const detailTitle = document.querySelector("#detailTitle");
const detailUpdated = document.querySelector("#detailUpdated");
const detailMessageCount = document.querySelector("#detailMessageCount");
const detailChecksum = document.querySelector("#detailChecksum");
const detailSource = document.querySelector("#detailSource");
const handoffPreview = document.querySelector("#handoffPreview");
const closeDetailButton = document.querySelector("#closeDetailButton");
const copyHandoffButton = document.querySelector("#copyHandoffButton");
const downloadHandoffButton = document.querySelector(
  "#downloadHandoffButton"
);
const deleteRecordButton = document.querySelector("#deleteRecordButton");
const copyContinuationButton = document.querySelector(
  "#copyContinuationButton"
);
const continuationProviderButtons = document.querySelectorAll(
  "[data-provider]"
);

let selectedRecord = null;
let allRecords = [];

function setStatus(message) {
  status.textContent = message;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function safeFilename(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

async function copyContinuationPrompt(targetProvider = null) {
  if (!selectedRecord) return;

  const prompt = buildContinuationPrompt(selectedRecord, {
    targetProvider
  });

  await navigator.clipboard.writeText(prompt);
  setStatus(
    targetProvider
      ? `Continuation prompt for ${targetProvider} copied.`
      : "Continuation prompt copied."
  );
}

async function openContinuationProvider(provider) {
  if (!selectedRecord) return;

  await copyContinuationPrompt(provider);
  const url = getProviderUrl(provider);

  if (!url) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  chrome.tabs.create({ url });
}

function updateCollectionOptions(records) {
  const current = collectionFilter.value;
  const collections = listLibraryCollections(records);

  collectionFilter.replaceChildren(
    new Option("All collections", ""),
    ...collections.map((collection) => new Option(collection, collection))
  );

  collectionSuggestions.replaceChildren(
    ...collections.map((collection) => {
      const option = document.createElement("option");
      option.value = collection;
      return option;
    })
  );

  collectionFilter.value = collections.includes(current) ? current : "";
}

function updateTagOptions(records) {
  const current = tagFilter.value;
  const tags = listLibraryTags(records);

  tagFilter.replaceChildren(
    new Option("All tags", ""),
    ...tags.map((tag) => new Option(tag, tag))
  );

  tagFilter.value = tags.includes(current) ? current : "";
}

function updateProviderOptions(allRecords) {
  const current = providerFilter.value;
  const providers = [...new Set(
    allRecords.map(({ provider }) => provider).filter(Boolean)
  )].sort();

  providerFilter.replaceChildren(
    new Option("All providers", ""),
    ...providers.map((provider) => new Option(provider, provider))
  );

  providerFilter.value = providers.includes(current) ? current : "";
}

function renderDetails(record) {
  selectedRecord = record;

  detailProvider.textContent = record.provider;
  detailTitle.textContent = record.title;
  detailUpdated.textContent = formatDate(record.updatedAt);
  detailMessageCount.textContent = String(record.messageCount);
  detailChecksum.textContent = record.checksum ?? "—";
  handoffPreview.value = record.handoffMarkdown;
  recordTagsInput.value = (record.tags ?? []).join(", ");
  recordCollectionInput.value = record.collection ?? "";
  recordPinnedInput.checked = Boolean(record.pinned);
  saveOrganizationButton.disabled = false;

  if (record.sourceUrl) {
    detailSource.href = record.sourceUrl;
    detailSource.textContent = record.sourceUrl;
    detailSource.removeAttribute("aria-disabled");
  } else {
    detailSource.href = "#";
    detailSource.textContent = "Not available";
    detailSource.setAttribute("aria-disabled", "true");
  }

  detailPanel.hidden = false;
}

function closeDetails() {
  selectedRecord = null;
  recordTagsInput.value = "";
  recordCollectionInput.value = "";
  recordPinnedInput.checked = false;
  saveOrganizationButton.disabled = true;
  detailPanel.hidden = true;
}

function renderRecords(filteredRecords) {
  recordList.replaceChildren();
  resultCount.textContent = String(filteredRecords.length);
  emptyState.hidden = filteredRecords.length !== 0;

  for (const record of filteredRecords) {
    const fragment = recordTemplate.content.cloneNode(true);
    const openButton = fragment.querySelector(".record-open");

    fragment.querySelector(".record-provider").textContent = record.provider;
    fragment.querySelector(".record-date").textContent = formatDate(
      record.updatedAt
    );
    fragment.querySelector(".record-title").textContent = record.title;
    fragment.querySelector(".record-meta").textContent =
      `${record.messageCount} message(s)`;

    const tags = fragment.querySelector(".record-tags");
    tags.textContent = record.tags.length > 0
      ? record.tags.map((tag) => `#${tag}`).join(" ")
      : "No tags";

    openButton.addEventListener("click", () => renderDetails(record));
    recordList.append(fragment);
  }
}

async function applyFilters() {
  const filtered = sortLibraryRecords(
    filterLibraryRecords(allRecords, {
      query: searchInput.value,
      provider: providerFilter.value,
      tag: tagFilter.value,
      collection: collectionFilter.value,
      pinnedOnly: pinnedOnlyFilter.checked
    })
  );

  renderRecords(filtered);
  setStatus(
    filtered.length === 0
      ? "No conversations match the current filters."
      : `Showing ${filtered.length} conversation(s).`
  );
}



async function loadLibrary() {
  refreshButton.disabled = true;
  setStatus("Loading library…");

  try {
    allRecords = await library.list();
    updateProviderOptions(allRecords);
    updateTagOptions(allRecords);
    updateCollectionOptions(allRecords);
    await applyFilters();
  } catch (error) {
    recordList.replaceChildren();
    emptyState.hidden = true;
    resultCount.textContent = "0";
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to load the conversation library."
    );
  } finally {
    refreshButton.disabled = false;
  }
}

searchInput.addEventListener("input", () => {
  applyFilters().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Search failed.");
  });
});

providerFilter.addEventListener("change", () => {
  applyFilters().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Filter failed.");
  });
});

collectionFilter.addEventListener("change", () => {
  applyFilters().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Filter failed.");
  });
});

tagFilter.addEventListener("change", () => {
  applyFilters().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Filter failed.");
  });
});

pinnedOnlyFilter.addEventListener("change", () => {
  applyFilters().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Filter failed.");
  });
});

saveOrganizationButton.addEventListener("click", async () => {
  if (!selectedRecord) return;

  saveOrganizationButton.disabled = true;

  try {
    const updated = updateRecordOrganization(selectedRecord, {
      tags: recordTagsInput.value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      pinned: recordPinnedInput.checked,
      collection: recordCollectionInput.value
    });

    await library.save(updated);
    selectedRecord = updated;
    await loadLibrary();
    renderDetails(updated);
    setStatus("Conversation organization updated.");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to update conversation organization."
    );
  } finally {
    saveOrganizationButton.disabled = false;
  }
});

exportLibraryButton.addEventListener("click", async () => {
  exportLibraryButton.disabled = true;

  try {
    const records = await library.list();
    const content = serializeLibraryBackup(records);
    const date = new Date().toISOString().slice(0, 10);

    downloadText(
      `ai-relay-library-${date}.json`,
      content,
      "application/json;charset=utf-8"
    );

    setStatus(`Exported ${records.length} conversation(s).`);
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to export the library."
    );
  } finally {
    exportLibraryButton.disabled = false;
  }
});

importLibraryButton.addEventListener("click", () => {
  importLibraryInput.value = "";
  importLibraryInput.click();
});

importLibraryInput.addEventListener("change", async () => {
  const [file] = importLibraryInput.files ?? [];

  if (!file) return;

  importLibraryButton.disabled = true;

  try {
    const content = await file.text();
    const replace = globalThis.confirm(
      "Choose OK to replace the current library. " +
      "Choose Cancel to merge the backup with existing records."
    );

    const result = await importLibraryBackup(library, content, {
      replace
    });

    closeDetails();
    await loadLibrary();
    setStatus(
      `Imported ${result.imported} conversation(s) in ${result.mode} mode.`
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to import the library backup."
    );
  } finally {
    importLibraryButton.disabled = false;
    importLibraryInput.value = "";
  }
});

refreshButton.addEventListener("click", loadLibrary);
closeDetailButton.addEventListener("click", closeDetails);

detailSource.addEventListener("click", (event) => {
  if (detailSource.getAttribute("aria-disabled") === "true") {
    event.preventDefault();
  }
});

copyHandoffButton.addEventListener("click", async () => {
  if (!selectedRecord) return;

  await navigator.clipboard.writeText(selectedRecord.handoffMarkdown);
  setStatus("Handoff copied.");
});

copyContinuationButton.addEventListener("click", () => {
  copyContinuationPrompt().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Unable to copy prompt.");
  });
});

for (const button of continuationProviderButtons) {
  button.addEventListener("click", () => {
    openContinuationProvider(button.dataset.provider).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unable to open provider.");
    });
  });
}

downloadHandoffButton.addEventListener("click", () => {
  if (!selectedRecord) return;

  downloadText(
    `${safeFilename(selectedRecord.title, "ai-relay-handoff")}.md`,
    selectedRecord.handoffMarkdown,
    "text/markdown;charset=utf-8"
  );

  setStatus("Markdown download started.");
});

deleteRecordButton.addEventListener("click", async () => {
  if (!selectedRecord) return;

  const confirmed = globalThis.confirm(
    `Delete "${selectedRecord.title}" from the local library?`
  );

  if (!confirmed) return;

  try {
    await library.delete(selectedRecord.id);
    closeDetails();
    await loadLibrary();
    setStatus("Conversation deleted.");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to delete this conversation."
    );
  }
});

loadLibrary();
