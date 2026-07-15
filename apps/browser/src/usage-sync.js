import { normalizeUsageSnapshot } from "./core/usage-snapshot.js";

export const USAGE_SYNC_URL = "http://127.0.0.1:17831/usage";
export const USAGE_STORAGE_KEY = "ai_relay_usage_snapshot";

export async function loadStoredUsageSnapshot() {
  const result = await chrome.storage.local.get(USAGE_STORAGE_KEY);
  return result?.[USAGE_STORAGE_KEY] ?? null;
}

export async function saveUsageSnapshot(snapshot) {
  const normalized = normalizeUsageSnapshot(snapshot);
  await chrome.storage.local.set({ [USAGE_STORAGE_KEY]: normalized });
  return normalized;
}

export async function mergeProviderUsage(providerRecord) {
  const existing = (await loadStoredUsageSnapshot()) ?? { providers: {} };

  return saveUsageSnapshot({
    updatedAt: new Date().toISOString(),
    providers: {
      ...existing.providers,
      [providerRecord.provider]: providerRecord
    }
  });
}

export async function syncUsageSnapshotToDesktop(snapshot) {
  try {
    const response = await fetch(USAGE_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(snapshot)
    });

    const body = await response.json();

    if (!response.ok || !body?.ok) {
      return {
        ok: false,
        error: body?.error ?? `Usage sync failed (${response.status}).`
      };
    }

    return { ok: true, ...body };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
