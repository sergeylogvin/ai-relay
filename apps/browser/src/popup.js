import { detectProvider } from "./provider-detection.js";
import { createZipArchive } from "./export/zip.js";
import { ConversationLibrary } from "./library/library.js";
import { BrowserStorageLibraryAdapter } from "./library/browser-storage-adapter.js";
import {
  clearPendingHandoff,
  loadPendingHandoff,
  savePendingHandoff
} from "./handoff-session-storage.js";
import { renderHandoffByMode } from "./export/handoff-modes.js";
import {
  formatMigrationRoute,
  formatProviderLabel
} from "./continue-in-provider.js";

const captureButton = document.querySelector("#captureButton");
const copyMarkdownButton = document.querySelector("#copyMarkdownButton");
const insertContextButton = document.querySelector("#insertContextButton");
const copyJsonButton = document.querySelector("#copyJsonButton");
const downloadMarkdownButton = document.querySelector(
  "#downloadMarkdownButton"
);
const downloadJsonButton = document.querySelector("#downloadJsonButton");
const downloadZipButton = document.querySelector("#downloadZipButton");
const saveLibraryButton = document.querySelector("#saveLibraryButton");
const openLibraryButton = document.querySelector("#openLibraryButton");
const clearButton = document.querySelector("#clearButton");
const handoffModeSelect = document.querySelector("#handoffMode");
const continueButtons = document.querySelectorAll("[data-provider]");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const providerBadge = document.querySelector("#providerBadge");
const metadata = document.querySelector("#metadata");
const titleValue = document.querySelector("#titleValue");
const messageCountValue = document.querySelector("#messageCountValue");
const tokenEstimateValue = document.querySelector("#tokenEstimateValue");
const handoffSizeValue = document.querySelector("#handoffSizeValue");
const checksumValue = document.querySelector("#checksumValue");

let lastCapture = null;
let currentHandoffMode = "full";
let currentTabProvider = "unknown";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}

function setStatus(message) {
  status.textContent = message;
}

function setButtonsEnabled(enabled) {
  insertContextButton.disabled = !enabled;
  copyMarkdownButton.disabled = !enabled;
  copyJsonButton.disabled = !enabled;
  downloadMarkdownButton.disabled = !enabled;
  downloadJsonButton.disabled = !enabled;
  downloadZipButton.disabled = !enabled;
  saveLibraryButton.disabled = !enabled;
  clearButton.disabled = !enabled;
  handoffModeSelect.disabled = !enabled;

  for (const button of continueButtons) {
    button.disabled = !enabled;
  }
}

function reset() {
  lastCapture = null;
  currentHandoffMode = "full";
  handoffModeSelect.value = "full";
  preview.value = "";
  metadata.hidden = true;
  titleValue.textContent = "—";
  messageCountValue.textContent = "0";
  tokenEstimateValue.textContent = "—";
  handoffSizeValue.textContent = "—";
  checksumValue.textContent = "—";
  providerBadge.textContent = formatProviderLabel(currentTabProvider);
  setButtonsEnabled(false);
  setStatus("Ready.");
}

function createLibraryId(capture) {
  const source = [
    capture.provider ?? "unknown",
    capture.url ?? "",
    capture.title ?? "untitled",
    capture.checksum ?? capture.capturedAt ?? Date.now()
  ].join(":");

  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `capture-${(hash >>> 0).toString(16).padStart(8, "0")}`;
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

function parseCaptureEnvelope(capture) {
  const json = capture?.files?.["capture.json"];

  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildConversationFromCapture(capture) {
  const envelope = parseCaptureEnvelope(capture);

  return {
    provider: capture?.provider ?? envelope?.source?.provider ?? "unknown",
    title: capture?.title ?? envelope?.source?.title ?? "Untitled conversation",
    url: capture?.url ?? envelope?.source?.url ?? null,
    messages: envelope?.conversation?.messages ?? []
  };
}

function renderHandoffMarkdownForMode(capture, mode = currentHandoffMode) {
  const conversation = buildConversationFromCapture(capture);
  const handoff = capture?.handoff ?? parseCaptureEnvelope(capture)?.handoff ?? null;

  return renderHandoffByMode({
    conversation,
    handoff,
    mode,
    recentMessageLimit: 12
  });
}

function applyHandoffMode(capture, mode = currentHandoffMode) {
  const markdown = renderHandoffMarkdownForMode(capture, mode);
  const nextCapture = {
    ...capture,
    markdown,
    handoffMode: mode,
    files: {
      ...(capture.files ?? {}),
      "handoff.md": `${markdown}\n`
    }
  };

  return nextCapture;
}

function updateProviderBadge(capture, targetProvider = null) {
  const sourceProvider = capture?.provider ?? currentTabProvider;

  if (targetProvider) {
    providerBadge.textContent = formatMigrationRoute(
      sourceProvider,
      targetProvider
    );
    return;
  }

  providerBadge.textContent = formatProviderLabel(sourceProvider);
}

function getActiveHandoffMarkdown() {
  return lastCapture?.files?.["handoff.md"] ?? lastCapture?.markdown ?? "";
}

function renderCapture(capture) {
  currentHandoffMode = capture?.handoffMode ?? "full";
  handoffModeSelect.value = currentHandoffMode;

  lastCapture = applyHandoffMode(capture, currentHandoffMode);
  preview.value = getActiveHandoffMarkdown();

  updateProviderBadge(lastCapture);
  titleValue.textContent = lastCapture.title ?? "Untitled conversation";
  messageCountValue.textContent = String(lastCapture.messageCount ?? 0);
  tokenEstimateValue.textContent = String(
    lastCapture.metadata?.estimatedTokens ?? "—"
  );
  handoffSizeValue.textContent = `${getActiveHandoffMarkdown().length} chars`;
  checksumValue.textContent = lastCapture.checksum ?? "—";
  metadata.hidden = false;

  setButtonsEnabled(true);
  setStatus(
    `Captured ${lastCapture.messageCount ?? 0} message(s). Review before exporting or continuing.`
  );
}

async function persistCapture(capture) {
  await savePendingHandoff(capture);
  renderCapture(capture);
}

async function initialize() {
  const tab = await getActiveTab();
  currentTabProvider = detectProvider(tab?.url ?? "");
  providerBadge.textContent = formatProviderLabel(currentTabProvider);

  const pendingCapture = await loadPendingHandoff();

  if (pendingCapture) {
    renderCapture(pendingCapture);
    setStatus("Restored the pending handoff. Ready to insert or continue.");
  }
}

captureButton.addEventListener("click", async () => {
  captureButton.disabled = true;
  setStatus("Capturing and preparing handoff…");

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      throw new Error("No active tab was found.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AI_RELAY_CAPTURE"
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Capture failed.");
    }

    await persistCapture({
      ...response.capture,
      handoffMode: currentHandoffMode
    });
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to capture this page."
    );
  } finally {
    captureButton.disabled = false;
  }
});

handoffModeSelect.addEventListener("change", async () => {
  if (!lastCapture) return;

  currentHandoffMode = handoffModeSelect.value;
  const updatedCapture = applyHandoffMode(lastCapture, currentHandoffMode);

  lastCapture = updatedCapture;
  preview.value = getActiveHandoffMarkdown();
  handoffSizeValue.textContent = `${getActiveHandoffMarkdown().length} chars`;

  try {
    await savePendingHandoff(updatedCapture);
    setStatus(`Updated handoff mode to ${handoffModeSelect.selectedOptions[0].textContent}.`);
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to update the pending handoff."
    );
  }
});

insertContextButton.addEventListener("click", async () => {
  const context = getActiveHandoffMarkdown();
  if (!context) return;

  insertContextButton.disabled = true;
  setStatus("Inserting handoff into the current chat…");

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      throw new Error("No active tab was found.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AI_RELAY_INSERT_CONTEXT",
      context
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Context insertion failed.");
    }

    setStatus(
      `Inserted ${response.insertion?.insertedCharacters ?? context.length} character(s). Review before sending.`
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to insert this handoff."
    );
  } finally {
    insertContextButton.disabled = false;
  }
});

for (const button of continueButtons) {
  button.addEventListener("click", async () => {
    const targetProvider = button.dataset.provider;
    const context = getActiveHandoffMarkdown();

    if (!context || !targetProvider || !lastCapture) return;

    for (const continueButton of continueButtons) {
      continueButton.disabled = true;
    }

    updateProviderBadge(lastCapture, targetProvider);
    setStatus(
      `Opening ${formatProviderLabel(targetProvider)} and inserting handoff…`
    );

    try {
      await savePendingHandoff(lastCapture);

      const response = await chrome.runtime.sendMessage({
        type: "AI_RELAY_CONTINUE_IN_PROVIDER",
        targetProvider,
        handoffMarkdown: context
      });

      if (!response?.ok) {
        throw new Error(response?.error ?? "Unable to continue in provider.");
      }

      setStatus(
        `Inserted ${response.insertion?.insertedCharacters ?? context.length} character(s) in ${formatProviderLabel(targetProvider)}. Review before sending.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to continue in the selected provider."
      );
      updateProviderBadge(lastCapture);
    } finally {
      for (const continueButton of continueButtons) {
        continueButton.disabled = false;
      }
    }
  });
}

copyMarkdownButton.addEventListener("click", async () => {
  const markdown = getActiveHandoffMarkdown();
  if (!markdown) return;

  await navigator.clipboard.writeText(markdown);
  setStatus("Markdown handoff copied.");
});

copyJsonButton.addEventListener("click", async () => {
  const json = lastCapture?.files?.["capture.json"];
  if (!json) return;

  await navigator.clipboard.writeText(json);
  setStatus("JSON capture copied.");
});

downloadMarkdownButton.addEventListener("click", () => {
  const markdown = getActiveHandoffMarkdown();
  if (!markdown) return;

  const base = safeFilename(lastCapture?.title, "ai-relay-handoff");
  downloadText(`${base}.md`, markdown, "text/markdown;charset=utf-8");
  setStatus("Markdown download started.");
});

downloadJsonButton.addEventListener("click", () => {
  const json = lastCapture?.files?.["capture.json"];
  if (!json) return;

  const base = safeFilename(lastCapture?.title, "ai-relay-capture");
  downloadText(`${base}.json`, json, "application/json;charset=utf-8");
  setStatus("JSON download started.");
});

downloadZipButton.addEventListener("click", () => {
  const files = lastCapture?.files;
  if (!files) return;

  const metadataJson = JSON.stringify(
    {
      schemaVersion: lastCapture.schemaVersion,
      provider: lastCapture.provider,
      title: lastCapture.title,
      url: lastCapture.url,
      capturedAt: lastCapture.capturedAt,
      messageCount: lastCapture.messageCount,
      handoffMode: currentHandoffMode,
      checksum: lastCapture.checksum
    },
    null,
    2
  );

  const archive = createZipArchive({
    ...files,
    "metadata.json": `${metadataJson}
`
  });

  const blob = new Blob([archive], {
    type: "application/zip"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const base = safeFilename(lastCapture?.title, "ai-relay-export");

  anchor.href = url;
  anchor.download = `${base}.zip`;
  anchor.click();

  URL.revokeObjectURL(url);
  setStatus("ZIP package download started.");
});

saveLibraryButton.addEventListener("click", async () => {
  if (!lastCapture) return;

  saveLibraryButton.disabled = true;
  setStatus("Saving to local library…");

  try {
    const library = new ConversationLibrary(
      new BrowserStorageLibraryAdapter()
    );

    await library.save({
      id: createLibraryId(lastCapture),
      provider: lastCapture.provider,
      title: lastCapture.title,
      sourceUrl: lastCapture.url,
      createdAt: lastCapture.capturedAt,
      updatedAt: new Date().toISOString(),
      messageCount: lastCapture.messageCount,
      checksum: lastCapture.checksum,
      handoffMarkdown: getActiveHandoffMarkdown(),
      captureJson: lastCapture.files?.["capture.json"],
      tags: []
    });

    setStatus("Saved to local library.");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to save this capture."
    );
  } finally {
    saveLibraryButton.disabled = false;
  }
});

openLibraryButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

clearButton.addEventListener("click", async () => {
  try {
    await clearPendingHandoff();
    reset();
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to clear the pending handoff."
    );
  }
});

initialize().catch((error) => {
  setStatus(
    error instanceof Error ? error.message : "Initialization failed."
  );
});
