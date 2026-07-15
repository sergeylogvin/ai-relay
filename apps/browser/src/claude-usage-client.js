import { fetchClaudeUsageFromSession } from "./providers/claude/usage.js";

export async function getClaudeCookieHeader() {
  const domains = ["claude.ai", ".claude.ai"];
  const seen = new Map();

  for (const domain of domains) {
    const cookies = await chrome.cookies.getAll({ domain });

    for (const cookie of cookies) {
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
