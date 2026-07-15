import { fetchChatGPTUsageFromSession } from "./core/chatgpt-usage.js";
import { fetchProviderUsageFromTab } from "./usage-tab-bridge.js";

const CHATGPT_URLS = ["https://chatgpt.com/", "https://www.chatgpt.com/"];

export async function getChatGPTCookieHeader() {
  const seen = new Map();

  for (const url of CHATGPT_URLS) {
    const cookies = await chrome.cookies.getAll({ url });

    for (const cookie of cookies) {
      seen.set(cookie.name, cookie.value);
    }
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tab?.url?.includes("chatgpt.com")) {
    const tabCookies = await chrome.cookies.getAll({ url: tab.url });

    for (const cookie of tabCookies) {
      seen.set(cookie.name, cookie.value);
    }
  }

  if (seen.size === 0) {
    return null;
  }

  return [...seen.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function refreshChatGPTUsage() {
  const fromTab = await fetchProviderUsageFromTab("chatgpt");

  if (fromTab) {
    return fromTab;
  }

  const cookieHeader = await getChatGPTCookieHeader();

  return fetchChatGPTUsageFromSession({ cookieHeader });
}
