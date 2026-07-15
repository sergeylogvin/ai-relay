import { fetchGeminiUsageFromSession } from "./core/gemini-usage.js";

const GEMINI_URLS = [
  "https://gemini.google.com/",
  "https://www.google.com/",
  "https://google.com/"
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

export async function getGeminiCookieHeader() {
  const seen = new Map();

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

  if (!seen.has("__Secure-1PSID")) {
    return null;
  }

  return [...seen.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function refreshGeminiUsage() {
  const cookieHeader = await getGeminiCookieHeader();

  return fetchGeminiUsageFromSession({ cookieHeader });
}
