import { normalizeProviderUsage, normalizeUsageBucket } from "./usage-snapshot.js";

const CHATGPT_ORIGIN = "https://chatgpt.com";

function computeResetAt(window, now = new Date()) {
  if (!window) {
    return null;
  }

  if (window.reset_at != null) {
    const numeric = Number(window.reset_at);

    if (Number.isFinite(numeric)) {
      const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
      return new Date(millis).toISOString();
    }
  }

  if (window.reset_after_seconds != null) {
    const seconds = Number(window.reset_after_seconds);

    if (Number.isFinite(seconds)) {
      return new Date(now.getTime() + seconds * 1000).toISOString();
    }
  }

  return null;
}

export function parseChatGPTUsageResponse(json, now = new Date()) {
  const buckets = [];
  const rateLimit = json?.rate_limit;

  if (rateLimit?.primary_window) {
    buckets.push(
      normalizeUsageBucket({
        id: "session",
        label: "Session (5 hour)",
        utilization: rateLimit.primary_window.used_percent ?? 0,
        resetsAt: computeResetAt(rateLimit.primary_window, now)
      })
    );
  }

  if (rateLimit?.secondary_window) {
    buckets.push(
      normalizeUsageBucket({
        id: "weekly",
        label: "Weekly (7 day)",
        utilization: rateLimit.secondary_window.used_percent ?? 0,
        resetsAt: computeResetAt(rateLimit.secondary_window, now)
      })
    );
  }

  return normalizeProviderUsage({
    provider: "chatgpt",
    status: "ok",
    buckets
  });
}

export async function fetchChatGPTAccessToken(cookieHeader, fetchImpl = fetch) {
  const response = await fetchImpl(`${CHATGPT_ORIGIN}/api/auth/session`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
      Accept: "application/json",
      Referer: `${CHATGPT_ORIGIN}/`
    }
  });

  if (!response.ok) {
    throw new Error(`ChatGPT session request failed (${response.status}).`);
  }

  const json = await response.json();

  if (!json?.accessToken) {
    throw new Error("Could not resolve ChatGPT access token.");
  }

  return json.accessToken;
}

export async function fetchChatGPTUsageFromSession({
  cookieHeader,
  fetchImpl = fetch,
  now = new Date()
} = {}) {
  if (!cookieHeader) {
    return normalizeProviderUsage({
      provider: "chatgpt",
      status: "error",
      error: "Sign in to chatgpt.com in this browser profile.",
      buckets: []
    });
  }

  try {
    const accessToken = await fetchChatGPTAccessToken(cookieHeader, fetchImpl);
    const response = await fetchImpl(`${CHATGPT_ORIGIN}/backend-api/wham/usage`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        Referer: `${CHATGPT_ORIGIN}/`
      }
    });

    if (!response.ok) {
      return normalizeProviderUsage({
        provider: "chatgpt",
        status: "error",
        error: `ChatGPT usage request failed (${response.status}).`,
        buckets: []
      });
    }

    return parseChatGPTUsageResponse(await response.json(), now);
  } catch (error) {
    return normalizeProviderUsage({
      provider: "chatgpt",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      buckets: []
    });
  }
}
