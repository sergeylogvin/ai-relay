import { fetchClaudeUsageFromSession } from "./core/claude-usage.js";

const CLAUDE_URLS = ["https://claude.ai/", "https://www.claude.ai/"];

export async function getClaudeCookieHeader() {
  const seen = new Map();

  for (const url of CLAUDE_URLS) {
    const cookies = await chrome.cookies.getAll({ url });

    for (const cookie of cookies) {
      seen.set(cookie.name, cookie.value);
    }
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tab?.url?.includes("claude.ai")) {
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

export async function refreshClaudeUsage() {
  const cookieHeader = await getClaudeCookieHeader();

  return fetchClaudeUsageFromSession({ cookieHeader });
}
