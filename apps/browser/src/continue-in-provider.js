import { getProviderUrl } from "./core/continuation.js";

const PROVIDER_LABELS = Object.freeze({
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini"
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitForTabComplete(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out while waiting for the provider tab to load."));
    }, timeoutMs);

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId || info.status !== "complete") return;

      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function insertContextWithRetry(tabId, context, attempts = 6) {
  let lastError = new Error("Context insertion failed.");

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "AI_RELAY_INSERT_CONTEXT",
        context
      });

      if (response?.ok) {
        return response;
      }

      lastError = new Error(response?.error ?? "Context insertion failed.");
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Context insertion failed.");
    }

    await sleep(400 * (attempt + 1));
  }

  throw lastError;
}

export function formatProviderLabel(provider) {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function formatMigrationRoute(sourceProvider, targetProvider) {
  const source = formatProviderLabel(sourceProvider);
  const target = formatProviderLabel(targetProvider);

  return `${source} → ${target}`;
}

export async function continueInProvider({
  targetProvider,
  handoffMarkdown
}) {
  const context = String(handoffMarkdown ?? "").trim();

  if (!context) {
    throw new Error("No handoff Markdown is available to insert.");
  }

  const url = getProviderUrl(targetProvider);

  if (!url) {
    throw new Error(`Unsupported provider: ${targetProvider}`);
  }

  const tab = await chrome.tabs.create({ url, active: true });
  await waitForTabComplete(tab.id);
  await sleep(800);

  const insertion = await insertContextWithRetry(tab.id, context);

  return {
    tabId: tab.id,
    url,
    insertion
  };
}
