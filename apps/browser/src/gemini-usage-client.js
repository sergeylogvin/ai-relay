import { fetchGeminiUsageFromSession } from "./core/gemini-usage.js";
import { fetchProviderUsageFromTab } from "./usage-tab-bridge.js";

const GEMINI_URLS = [
  "https://gemini.google.com/",
  "https://www.google.com/",
  "https://google.com/",
  "https://accounts.google.com/"
];

const GEMINI_COOKIE_NAMES = new Set([
  "__Secure-1PSID",
  "__Secure-1PSIDTS",
  "__Secure-3PSID",
  "__Secure-3PSIDTS",
  "SID",
  "HSID",
  "SSID",
  "APISID",
  "SAPISID"
]);

function hasGeminiSessionCookie(seen) {
  return seen.has("__Secure-1PSID") || seen.has("__Secure-3PSID");
}

export async function getGeminiCookieHeader() {
  const seen = new Map();
  const domainCookies = await chrome.cookies.getAll({ domain: ".google.com" });

  for (const cookie of domainCookies) {
    if (GEMINI_COOKIE_NAMES.has(cookie.name)) {
      seen.set(cookie.name, cookie.value);
    }
  }

  for (const url of GEMINI_URLS) {
    const cookies = await chrome.cookies.getAll({ url });

    for (const cookie of cookies) {
      if (GEMINI_COOKIE_NAMES.has(cookie.name)) {
        seen.set(cookie.name, cookie.value);
      }
    }
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tab?.url?.includes("gemini.google.com")) {
    const tabCookies = await chrome.cookies.getAll({ url: tab.url });

    for (const cookie of tabCookies) {
      seen.set(cookie.name, cookie.value);
    }
  }

  if (!hasGeminiSessionCookie(seen)) {
    return null;
  }

  return [...seen.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function refreshGeminiUsage() {
  const fromTab = await fetchProviderUsageFromTab("gemini");

  if (fromTab) {
    return fromTab;
  }

  const cookieHeader = await getGeminiCookieHeader();

  return fetchGeminiUsageFromSession({ cookieHeader });
}
