import { normalizeProviderUsage, normalizeUsageBucket } from "../../../core/src/usage-snapshot.js";

const CLAUDE_ORIGIN = "https://claude.ai";

export function extractOrganizationIdFromCookie(cookieHeader = "") {
  const parts = String(cookieHeader).split(";");

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.startsWith("lastActiveOrg=")) {
      return trimmed.slice("lastActiveOrg=".length);
    }
  }

  return null;
}

export function parseClaudeUsageResponse(json) {
  const buckets = [];

  if (json?.five_hour) {
    buckets.push(
      normalizeUsageBucket({
        id: "session",
        label: "Session (5 hour)",
        utilization: json.five_hour.utilization ?? 0,
        resetsAt: json.five_hour.resets_at ?? null
      })
    );
  }

  if (json?.seven_day) {
    buckets.push(
      normalizeUsageBucket({
        id: "weekly",
        label: "Weekly (7 day)",
        utilization: json.seven_day.utilization ?? 0,
        resetsAt: json.seven_day.resets_at ?? null
      })
    );
  }

  if (json?.seven_day_sonnet) {
    buckets.push(
      normalizeUsageBucket({
        id: "weekly-sonnet",
        label: "Weekly Sonnet",
        utilization: json.seven_day_sonnet.utilization ?? 0,
        resetsAt: json.seven_day_sonnet.resets_at ?? null
      })
    );
  }

  return normalizeProviderUsage({
    provider: "claude",
    status: "ok",
    buckets
  });
}

export async function fetchClaudeOrganizationId(cookieHeader, fetchImpl = fetch) {
  const fromCookie = extractOrganizationIdFromCookie(cookieHeader);

  if (fromCookie) {
    return fromCookie;
  }

  const response = await fetchImpl(`${CLAUDE_ORIGIN}/api/bootstrap`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Claude bootstrap failed (${response.status}).`);
  }

  const json = await response.json();
  const orgId = json?.account?.lastActiveOrgId;

  if (!orgId) {
    throw new Error("Could not resolve Claude organization id.");
  }

  return orgId;
}

export async function fetchClaudeUsageFromSession({
  cookieHeader,
  fetchImpl = fetch
} = {}) {
  if (!cookieHeader) {
    return normalizeProviderUsage({
      provider: "claude",
      status: "error",
      error: "Sign in to claude.ai in this browser profile.",
      buckets: []
    });
  }

  try {
    const orgId = await fetchClaudeOrganizationId(cookieHeader, fetchImpl);
    const response = await fetchImpl(
      `${CLAUDE_ORIGIN}/api/organizations/${orgId}/usage`,
      {
        method: "GET",
        headers: {
          Cookie: cookieHeader,
          Accept: "application/json",
          Origin: CLAUDE_ORIGIN,
          Referer: `${CLAUDE_ORIGIN}/`
        }
      }
    );

    if (!response.ok) {
      return normalizeProviderUsage({
        provider: "claude",
        status: "error",
        error: `Claude usage request failed (${response.status}).`,
        buckets: []
      });
    }

    return parseClaudeUsageResponse(await response.json());
  } catch (error) {
    return normalizeProviderUsage({
      provider: "claude",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      buckets: []
    });
  }
}
