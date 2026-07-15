import { sendTabMessage } from "./content-script-bridge.js";
import { parseGeminiUsageCounts } from "./core/gemini-usage.js";
import { normalizeProviderUsage } from "./core/usage-snapshot.js";
import { runGeminiUsageFetchInMainWorld } from "./gemini-main-world-usage.js";

const PROVIDER_TAB_PATTERNS = Object.freeze({
  chatgpt: ["https://chatgpt.com/*", "https://www.chatgpt.com/*"],
  gemini: ["https://gemini.google.com/*"]
});

const PROVIDER_FETCH_MESSAGES = Object.freeze({
  chatgpt: "AI_RELAY_FETCH_CHATGPT_USAGE",
  gemini: "AI_RELAY_FETCH_GEMINI_USAGE"
});

export async function findProviderTab(provider) {
  const patterns = PROVIDER_TAB_PATTERNS[provider] ?? [];

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (activeTab?.id && patterns.some((pattern) => tabMatchesPattern(activeTab.url, pattern))) {
    return activeTab;
  }

  for (const pattern of patterns) {
    const [tab] = await chrome.tabs.query({ url: pattern });

    if (tab?.id) {
      return tab;
    }
  }

  return null;
}

function tabMatchesPattern(url, pattern) {
  if (!url) {
    return false;
  }

  const prefix = pattern.replace("*", "");

  return url.startsWith(prefix);
}

async function fetchGeminiUsageFromMainWorld(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: runGeminiUsageFetchInMainWorld
    });

    if (!result || typeof result !== "object") {
      throw new Error("Gemini usage returned no data.");
    }

    return parseGeminiUsageCounts(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return normalizeProviderUsage({
      provider: "gemini",
      status: "error",
      error:
        message === "Failed to fetch"
          ? "Gemini usage request blocked. Keep gemini.google.com open and try Refresh again."
          : message,
      buckets: []
    });
  }
}

export async function fetchProviderUsageFromTab(provider) {
  const tab = await findProviderTab(provider);

  if (!tab?.id) {
    return null;
  }

  if (provider === "gemini") {
    try {
      return await fetchGeminiUsageFromMainWorld(tab.id);
    } catch {
      // Fall back to the content-script path below.
    }
  }

  try {
    const response = await sendTabMessage(tab.id, {
      type: PROVIDER_FETCH_MESSAGES[provider]
    });

    if (response?.ok && response?.usage) {
      if (
        provider === "gemini" &&
        response.usage.status === "error" &&
        /Failed to fetch|blocked/i.test(response.usage.error ?? "")
      ) {
        return fetchGeminiUsageFromMainWorld(tab.id);
      }

      return response.usage;
    }
  } catch {
    if (provider === "gemini") {
      try {
        return await fetchGeminiUsageFromMainWorld(tab.id);
      } catch {
        return null;
      }
    }

    return null;
  }

  return null;
}
