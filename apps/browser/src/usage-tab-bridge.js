import { sendTabMessage } from "./content-script-bridge.js";

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

export async function fetchProviderUsageFromTab(provider) {
  const tab = await findProviderTab(provider);

  if (!tab?.id) {
    return null;
  }

  try {
    const response = await sendTabMessage(tab.id, {
      type: PROVIDER_FETCH_MESSAGES[provider]
    });

    if (response?.ok && response?.usage) {
      return response.usage;
    }
  } catch {
    return null;
  }

  return null;
}
