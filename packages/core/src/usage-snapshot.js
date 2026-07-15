export const USAGE_SNAPSHOT_SCHEMA_VERSION = 1;

export function normalizeUsageBucket({
  id,
  label,
  utilization = 0,
  resetsAt = null
}) {
  const numeric = Number(utilization);

  return Object.freeze({
    id: String(id),
    label: String(label),
    utilization: Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0,
    resetsAt: resetsAt ? String(resetsAt) : null
  });
}

export function normalizeProviderUsage({
  provider,
  status = "ok",
  error = null,
  buckets = [],
  fetchedAt = new Date().toISOString()
}) {
  if (!provider) {
    throw new TypeError("Usage provider is required.");
  }

  return Object.freeze({
    provider: String(provider),
    status: String(status),
    error: error ? String(error) : null,
    fetchedAt: String(fetchedAt),
    buckets: Object.freeze(
      buckets.map((bucket) =>
        normalizeUsageBucket(
          bucket?.id && bucket?.label
            ? bucket
            : {
                id: bucket?.id ?? "usage",
                label: bucket?.label ?? "Usage",
                utilization: bucket?.utilization ?? 0,
                resetsAt: bucket?.resetsAt ?? null
              }
        )
      )
    )
  });
}

export function normalizeUsageSnapshot({
  providers = {},
  updatedAt = new Date().toISOString()
} = {}) {
  const normalizedProviders = {};

  for (const [providerId, record] of Object.entries(providers)) {
    normalizedProviders[providerId] = normalizeProviderUsage({
      provider: providerId,
      ...record
    });
  }

  return Object.freeze({
    schemaVersion: USAGE_SNAPSHOT_SCHEMA_VERSION,
    updatedAt: String(updatedAt),
    providers: Object.freeze(normalizedProviders)
  });
}

export function formatUsagePercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return `${Math.round(numeric)}%`;
}

export function formatUsageResetLabel(isoDate, now = new Date()) {
  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Resetting soon";
  }

  if (diffMs < 24 * 60 * 60 * 1000) {
    return `Resets at ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    })}`;
  }

  return `Resets ${date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
}
