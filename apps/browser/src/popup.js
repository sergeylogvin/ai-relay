import { detectProvider } from "./provider-detection.js";

const captureButton = document.querySelector("#captureButton");
const copyButton = document.querySelector("#copyButton");
const clearButton = document.querySelector("#clearButton");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const providerBadge = document.querySelector("#providerBadge");

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

function reset() {
  lastCapture = null;
  preview.value = "";
  copyButton.disabled = true;
  clearButton.disabled = true;
  setStatus("Ready.");
}

async function initialize() {
  const tab = await getActiveTab();
  const provider = detectProvider(tab?.url ?? "");
  providerBadge.textContent = provider;
}

captureButton.addEventListener("click", async () => {
  captureButton.disabled = true;
  setStatus("Capturing visible messages…");

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

    lastCapture = response.capture;
    preview.value = lastCapture.markdown;
    providerBadge.textContent = lastCapture.provider;
    copyButton.disabled = preview.value.length === 0;
    clearButton.disabled = false;

    setStatus(
      `Captured ${lastCapture.messages.length} visible message(s). Review before copying.`
    );
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

copyButton.addEventListener("click", async () => {
  if (!preview.value) return;

  await navigator.clipboard.writeText(preview.value);
  setStatus("Handoff copied to clipboard.");
});

clearButton.addEventListener("click", reset);

initialize().catch((error) => {
  setStatus(error instanceof Error ? error.message : "Initialization failed.");
});
