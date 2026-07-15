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
import { renderCursorContextPack } from "./export/cursor-context-pack.js";
import {
  formatMigrationRoute,
  formatProviderLabel
} from "./continue-in-provider.js";
import { copyHandoffForDesktop, storeHandoffForDesktop } from "./desktop-handoff.js";
import { isSupportedCaptureUrl, sendTabMessage } from "./content-script-bridge.js";
import {
  assessContextFit,
  formatContextFitBadge,
  formatContextFitSummary,
  formatTokenCount
} from "./core/limit-awareness.js";
import { formatLimitSignalLabel } from "./providers/limits.js";
import { refreshClaudeUsage } from "./claude-usage-client.js";
import { refreshChatGPTUsage } from "./chatgpt-usage-client.js";
import { refreshGeminiUsage } from "./gemini-usage-client.js";
import {
  formatUsagePercent,
  formatUsageResetLabel
} from "./core/usage-snapshot.js";
import {
  loadStoredUsageSnapshot,
  mergeProviderUsage,
  syncUsageSnapshotToDesktop
} from "./usage-sync.js";

const captureButton = document.querySelector("#captureButton");
const copyMarkdownButton = document.querySelector("#copyMarkdownButton");
const copyForCursorButton = document.querySelector("#copyForCursorButton");
const copyForDesktopButton = document.querySelector("#copyForDesktopButton");
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
const contextFitPanel = document.querySelector("#contextFitPanel");
const contextFitBadge = document.querySelector("#contextFitBadge");
const contextFitDetail = document.querySelector("#contextFitDetail");
const contextFitRecommendation = document.querySelector(
  "#contextFitRecommendation"
);
const providerLimitNotice = document.querySelector("#providerLimitNotice");
const refreshUsageButton = document.querySelector("#refreshUsageButton");
const usageUpdatedAt = document.querySelector("#usageUpdatedAt");
const usageProviders = document.querySelector("#usageProviders");

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

function usageBarClass(utilization) {
  if (utilization >= 90) {
    return "danger";
  }

  if (utilization >= 75) {
    return "warning";
  }

  return "";
}

function renderUsageProvider(providerRecord) {
  const wrapper = document.createElement("section");
  wrapper.className = "usage-provider";

  const title = document.createElement("h3");
  title.className = "usage-provider-title";
  title.textContent = formatProviderLabel(providerRecord.provider);
  wrapper.appendChild(title);

  if (providerRecord.status !== "ok") {
    const error = document.createElement("p");
    error.className = "usage-error";
    error.textContent = providerRecord.error ?? "Usage unavailable.";
    wrapper.appendChild(error);
    return wrapper;
  }

  for (const bucket of providerRecord.buckets ?? []) {
    const bucketEl = document.createElement("div");
    bucketEl.className = "usage-bucket";

    const labelRow = document.createElement("div");
    labelRow.className = "usage-bucket-label";
    labelRow.innerHTML = `<span>${bucket.label}</span><span>${formatUsagePercent(bucket.utilization)} used</span>`;

    const bar = document.createElement("div");
    bar.className = "usage-bar";
    const fill = document.createElement("div");
    fill.className = `usage-bar-fill ${usageBarClass(bucket.utilization)}`;
    fill.style.width = `${Math.max(0, Math.min(100, bucket.utilization))}%`;
    bar.appendChild(fill);

    bucketEl.appendChild(labelRow);
    bucketEl.appendChild(bar);

    const resetLabel = formatUsageResetLabel(bucket.resetsAt);
    if (resetLabel) {
      const reset = document.createElement("p");
      reset.className = "usage-reset";
      reset.textContent = resetLabel;
      bucketEl.appendChild(reset);
    }

    wrapper.appendChild(bucketEl);
  }

  return wrapper;
}

function renderUsageSnapshot(snapshot) {
  usageProviders.replaceChildren();

  if (!snapshot?.providers || Object.keys(snapshot.providers).length === 0) {
    const empty = document.createElement("p");
    empty.className = "usage-reset";
    empty.textContent =
      "Refresh to load Claude, ChatGPT, and Gemini usage from this browser profile.";
    usageProviders.appendChild(empty);
    usageUpdatedAt.textContent = "Not refreshed yet.";
    return;
  }

  for (const providerRecord of Object.values(snapshot.providers)) {
    usageProviders.appendChild(renderUsageProvider(providerRecord));
  }

  usageUpdatedAt.textContent = snapshot.updatedAt
    ? `Last updated: ${new Date(snapshot.updatedAt).toLocaleString()}`
    : "Updated recently.";
}

async function refreshUsagePanel() {
  refreshUsageButton.disabled = true;
  usageUpdatedAt.textContent = "Refreshing usage…";

  try {
    const [claudeUsage, chatgptUsage, geminiUsage] = await Promise.all([
      refreshClaudeUsage(),
      refreshChatGPTUsage(),
      refreshGeminiUsage()
    ]);

    let snapshot = (await loadStoredUsageSnapshot()) ?? { providers: {} };

    for (const providerRecord of [claudeUsage, chatgptUsage, geminiUsage]) {
      snapshot = await mergeProviderUsage(providerRecord);
    }

    renderUsageSnapshot(snapshot);

    const syncResult = await syncUsageSnapshotToDesktop(snapshot);

    if (!syncResult.ok) {
      usageUpdatedAt.textContent = `${usageUpdatedAt.textContent} Desktop sync skipped.`;
    }
  } catch (error) {
    usageUpdatedAt.textContent =
      error instanceof Error ? error.message : "Unable to refresh usage.";
  } finally {
    refreshUsageButton.disabled = false;
  }
}

async function initializeUsagePanel() {
  const snapshot = await loadStoredUsageSnapshot();
  renderUsageSnapshot(snapshot);
}

refreshUsageButton.addEventListener("click", () => {
  refreshUsagePanel().catch((error) => {
    usageUpdatedAt.textContent =
      error instanceof Error ? error.message : "Unable to refresh usage.";
  });
});

function setStatus(message) {
  status.textContent = message;
}

function setButtonsEnabled(enabled) {
  insertContextButton.disabled = !enabled;
  copyMarkdownButton.disabled = !enabled;
  copyForCursorButton.disabled = !enabled;
  copyForDesktopButton.disabled = !enabled;
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
  contextFitPanel.hidden = true;
  contextFitRecommendation.hidden = true;
  contextFitRecommendation.textContent = "";
  providerLimitNotice.hidden = true;
  providerLimitNotice.textContent = "";
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

function renderCursorContextPackForCapture(capture) {
  const conversation = buildConversationFromCapture(capture);
  const handoff = capture?.handoff ?? parseCaptureEnvelope(capture)?.handoff ?? null;

  return renderCursorContextPack({
    conversation,
    handoff
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

function buildDesktopHandoffMetadata(capture = lastCapture) {
  return {
    provider: capture?.provider ?? "unknown",
    title: capture?.title ?? "Untitled conversation",
    url: capture?.url ?? null,
    handoffMode: capture?.handoffMode ?? currentHandoffMode
  };
}

function formatDesktopSyncStatus(result) {
  if (result?.ok) {
    return `Synced "${result.title ?? "handoff"}" to the desktop app just now.`;
  }

  if (result?.fallback === "desktop-bridge-unavailable") {
    return `Desktop sync failed. Run "npm run launch:macos-menu-bar", reload the extension, then click Capture again. (${result.error ?? "bridge unavailable"})`;
  }

  if (result?.skipped) {
    return "Desktop sync skipped because the handoff is empty.";
  }

  return `Desktop sync failed after capture. (${result?.error ?? "unknown error"})`;
}

async function persistCapture(capture) {
  await savePendingHandoff(capture);
  renderCapture(capture);
  setStatus("Syncing to desktop app…");

  const syncResult = await syncDesktopHandoff(capture);
  setStatus(formatDesktopSyncStatus(syncResult));
}

async function syncDesktopHandoff(capture = lastCapture) {
  const activeCapture = capture ?? lastCapture;
  const markdown =
    activeCapture?.files?.["handoff.md"] ??
    activeCapture?.markdown ??
    "";

  if (!markdown) {
    return { ok: false, skipped: true };
  }

  const result = await storeHandoffForDesktop(
    markdown,
    buildDesktopHandoffMetadata(activeCapture)
  );

  return result;
}

function renderContextFit(capture = lastCapture) {
  const markdown = getActiveHandoffMarkdown();

  if (!markdown) {
    contextFitPanel.hidden = true;
    return;
  }

  const assessment = assessContextFit({
    handoffMarkdown: markdown,
    provider: capture?.provider ?? currentTabProvider,
    model: capture?.metadata?.model ?? null,
    handoffMode: currentHandoffMode
  });

  contextFitPanel.hidden = false;
  contextFitBadge.textContent = formatContextFitBadge(assessment);
  contextFitBadge.className = `context-fit-badge ${assessment.level}`;
  contextFitDetail.textContent = `${formatContextFitSummary(assessment)} · ${assessment.modelLabel}`;
  tokenEstimateValue.textContent = formatTokenCount(assessment.estimatedTokens);

  if (assessment.recommendation) {
    contextFitRecommendation.hidden = false;
    contextFitRecommendation.textContent = assessment.recommendation;
  } else {
    contextFitRecommendation.hidden = true;
    contextFitRecommendation.textContent = "";
  }

  renderProviderLimitNotice(capture);
}

function renderProviderLimitNotice(capture = lastCapture) {
  const limits = capture?.metadata?.providerLimits ?? [];
  const primaryLimit = limits[0];

  if (!primaryLimit) {
    providerLimitNotice.hidden = true;
    providerLimitNotice.textContent = "";
    return;
  }

  providerLimitNotice.hidden = false;
  providerLimitNotice.textContent = `${formatLimitSignalLabel(primaryLimit)}: ${primaryLimit.message}`;
}

function renderCapture(capture) {
  currentHandoffMode = capture?.handoffMode ?? "full";
  handoffModeSelect.value = currentHandoffMode;

  lastCapture = applyHandoffMode(capture, currentHandoffMode);
  preview.value = getActiveHandoffMarkdown();

  updateProviderBadge(lastCapture);
  titleValue.textContent = lastCapture.title ?? "Untitled conversation";
  messageCountValue.textContent = String(lastCapture.messageCount ?? 0);
  handoffSizeValue.textContent = `${getActiveHandoffMarkdown().length} chars`;
  checksumValue.textContent = lastCapture.checksum ?? "—";
  renderContextFit(lastCapture);
  metadata.hidden = false;

  setButtonsEnabled(true);
}

async function initialize() {
  const tab = await getActiveTab();
  currentTabProvider = detectProvider(tab?.url ?? "");
  providerBadge.textContent = formatProviderLabel(currentTabProvider);

  const pendingCapture = await loadPendingHandoff();

  if (pendingCapture) {
    renderCapture(pendingCapture);
    setStatus(
      "Restored the pending handoff. Click Capture to sync it to the desktop app."
    );
  }

  await initializeUsagePanel();

  if (currentTabProvider === "claude") {
    refreshUsagePanel().catch(() => {});
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

    if (!isSupportedCaptureUrl(tab.url)) {
      throw new Error("Open Claude, ChatGPT, or Gemini before capturing.");
    }

    const response = await sendTabMessage(tab.id, {
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
  renderContextFit(updatedCapture);

  try {
    await savePendingHandoff(updatedCapture);
    setStatus("Syncing to desktop app…");
    const syncResult = await syncDesktopHandoff(updatedCapture);
    setStatus(formatDesktopSyncStatus(syncResult));
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

    const response = await sendTabMessage(tab.id, {
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

copyForCursorButton.addEventListener("click", async () => {
  if (!lastCapture) return;

  copyForCursorButton.disabled = true;

  try {
    const contextPack = renderCursorContextPackForCapture(lastCapture);
    const metadata = {
      ...buildDesktopHandoffMetadata(lastCapture),
      handoffMode: "context-pack",
      targetApp: "cursor",
      pasteRequested: true
    };

    await navigator.clipboard.writeText(contextPack);

    const result = await storeHandoffForDesktop(contextPack, metadata);

    if (result?.ok) {
      setStatus(
        "Cursor context pack ready. Switch to Cursor chat and it will paste automatically."
      );
      return;
    }

    setStatus(
      "Copied to clipboard. Paste manually in Cursor with Cmd+V."
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to copy the Cursor context pack."
    );
  } finally {
    copyForCursorButton.disabled = false;
  }
});

copyForDesktopButton.addEventListener("click", async () => {
  const markdown = getActiveHandoffMarkdown();
  if (!markdown) return;

  copyForDesktopButton.disabled = true;

  try {
    const metadata = {
      ...buildDesktopHandoffMetadata(),
      targetApp: "chatgpt",
      pasteRequested: true
    };

    await navigator.clipboard.writeText(markdown);

    const result = await storeHandoffForDesktop(markdown, metadata);

    if (result?.ok) {
      setStatus(
        "Handoff ready. Switch to ChatGPT or Cowork and it will paste automatically."
      );
      return;
    }

    if (result?.fallback === "desktop-bridge-unavailable") {
      setStatus(
        "Copied to clipboard. Paste manually with Cmd+V, or run npm run launch:macos-menu-bar."
      );
      return;
    }

    setStatus(
      "Copied to clipboard. Paste manually in ChatGPT desktop with Cmd+V."
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Unable to copy this handoff for desktop."
    );
  } finally {
    copyForDesktopButton.disabled = false;
  }
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
