import { detectProvider } from "./provider-detection.js";

const captureButton = document.querySelector("#captureButton");
const copyMarkdownButton = document.querySelector("#copyMarkdownButton");
const copyJsonButton = document.querySelector("#copyJsonButton");
const downloadMarkdownButton = document.querySelector(
  "#downloadMarkdownButton"
);
const downloadJsonButton = document.querySelector("#downloadJsonButton");
const clearButton = document.querySelector("#clearButton");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const providerBadge = document.querySelector("#providerBadge");
const metadata = document.querySelector("#metadata");
const titleValue = document.querySelector("#titleValue");
const messageCountValue = document.querySelector("#messageCountValue");
const checksumValue = document.querySelector("#checksumValue");

let lastCapture = null;

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
  copyMarkdownButton.disabled = !enabled;
  copyJsonButton.disabled = !enabled;
  downloadMarkdownButton.disabled = !enabled;
  downloadJsonButton.disabled = !enabled;
  clearButton.disabled = !enabled;
}

function reset() {
  lastCapture = null;
  preview.value = "";
  metadata.hidden = true;
  titleValue.textContent = "—";
  messageCountValue.textContent = "0";
  checksumValue.textContent = "—";
  setButtonsEnabled(false);
  setStatus("Ready.");
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

function renderCapture(capture) {
  lastCapture = capture;
  preview.value = capture.markdown ?? capture.files?.["handoff.md"] ?? "";

  providerBadge.textContent = capture.provider ?? "unknown";
  titleValue.textContent = capture.title ?? "Untitled conversation";
  messageCountValue.textContent = String(capture.messageCount ?? 0);
  checksumValue.textContent = capture.checksum ?? "—";
  metadata.hidden = false;

  setButtonsEnabled(true);
  setStatus(
    `Captured ${capture.messageCount ?? 0} message(s). Review before exporting.`
  );
}

async function initialize() {
  const tab = await getActiveTab();
  providerBadge.textContent = detectProvider(tab?.url ?? "");
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

    renderCapture(response.capture);
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

copyMarkdownButton.addEventListener("click", async () => {
  const markdown = lastCapture?.files?.["handoff.md"] ?? lastCapture?.markdown;
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
  const markdown = lastCapture?.files?.["handoff.md"];
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

clearButton.addEventListener("click", reset);

initialize().catch((error) => {
  setStatus(
    error instanceof Error ? error.message : "Initialization failed."
  );
});
