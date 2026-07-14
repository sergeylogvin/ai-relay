export const PENDING_HANDOFF_KEY = "aiRelayPendingHandoff";

function resolveStorageArea(storageArea) {
  const resolved = storageArea ?? globalThis.chrome?.storage?.session;

  if (!resolved) {
    throw new Error("Session storage is unavailable.");
  }

  return resolved;
}

export async function savePendingHandoff(capture, storageArea) {
  if (!capture || typeof capture !== "object") {
    throw new TypeError("A capture is required.");
  }

  const storage = resolveStorageArea(storageArea);
  await storage.set({ [PENDING_HANDOFF_KEY]: capture });
}

export async function loadPendingHandoff(storageArea) {
  const storage = resolveStorageArea(storageArea);
  const result = await storage.get(PENDING_HANDOFF_KEY);

  return result?.[PENDING_HANDOFF_KEY] ?? null;
}

export async function clearPendingHandoff(storageArea) {
  const storage = resolveStorageArea(storageArea);
  await storage.remove(PENDING_HANDOFF_KEY);
}
