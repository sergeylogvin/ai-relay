const SUPPORTED_HOSTS = new Set([
  "claude.ai",
  "chatgpt.com",
  "gemini.google.com"
]);

export function isSupportedCaptureUrl(url = "") {
  try {
    return SUPPORTED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export async function ensureContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "AI_RELAY_PING"
    });

    if (response?.ok) {
      return;
    }
  } catch {
    // Content script is missing on tabs opened before the extension reload.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-script.js"]
  });
}

export async function sendTabMessage(tabId, message) {
  await ensureContentScript(tabId);
  return chrome.tabs.sendMessage(tabId, message);
}
