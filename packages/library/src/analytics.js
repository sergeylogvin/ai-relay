import { LibraryValidationError } from "./errors.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeReferenceDate(value) {
  const date = normalizeDate(value ?? new Date());

  if (!date) {
    throw new LibraryValidationError(
      "Analytics reference date must be a valid date."
    );
  }

  return date;
}

function recordTimestamp(record) {
  return (
    normalizeDate(record.updatedAt) ??
    normalizeDate(record.createdAt) ??
    null
  );
}

function countBy(records, selector) {
  const counts = new Map();

  for (const record of records) {
    const value = normalizeString(selector(record));

    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    });
}

function estimateRecordBytes(record) {
  try {
    return new TextEncoder().encode(JSON.stringify(record)).length;
  } catch {
    return 0;
  }
}

function activityCount(records, referenceDate, days) {
  const earliest = referenceDate.getTime() - days * DAY_MS;

  return records.filter((record) => {
    const timestamp = recordTimestamp(record);
    return (
      timestamp &&
      timestamp.getTime() >= earliest &&
      timestamp.getTime() <= referenceDate.getTime()
    );
  }).length;
}

function collectionIds(record) {
  if (Array.isArray(record.collectionIds)) {
    return record.collectionIds.filter(Boolean);
  }

  if (record.collectionId) {
    return [record.collectionId];
  }

  return [];
}

export function buildLibraryAnalytics(
  records,
  {
    referenceDate,
    duplicateGroups = []
  } = {}
) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError(
      "Library analytics records must be an array."
    );
  }

  const now = normalizeReferenceDate(referenceDate);
  const total = records.length;
  const pinned = records.filter(
    (record) => record.pinned === true || record.isPinned === true
  ).length;
  const tagged = records.filter(
    (record) => asArray(record.tags).length > 0
  ).length;
  const inCollections = records.filter(
    (record) => collectionIds(record).length > 0
  ).length;
  const untagged = total - tagged;
  const withoutCollection = total - inCollections;
  const totalBytes = records.reduce(
    (sum, record) => sum + estimateRecordBytes(record),
    0
  );

  return {
    generatedAt: now.toISOString(),
    totals: {
      conversations: total,
      pinned,
      tagged,
      inCollections,
      untagged,
      withoutCollection,
      duplicateGroups: asArray(duplicateGroups).length
    },
    activity: {
      last7Days: activityCount(records, now, 7),
      last30Days: activityCount(records, now, 30),
      last90Days: activityCount(records, now, 90)
    },
    storage: {
      estimatedBytes: totalBytes,
      averageRecordBytes:
        total === 0 ? 0 : Math.round(totalBytes / total)
    },
    providers: countBy(
      records,
      (record) => record.provider ?? record.providerId
    ),
    domains: countBy(
      records,
      (record) => record.domain ?? record.hostname
    )
  };
}

export function formatAnalyticsBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function getLibraryHealthInsights(analytics) {
  if (!analytics || typeof analytics !== "object") {
    throw new LibraryValidationError(
      "Library analytics summary is required."
    );
  }

  const total = Number(analytics.totals?.conversations ?? 0);
  const insights = [];

  if (total === 0) {
    return [
      {
        id: "empty-library",
        level: "info",
        message: "Capture conversations to begin building library insights."
      }
    ];
  }

  const untagged = Number(analytics.totals?.untagged ?? 0);
  const withoutCollection = Number(
    analytics.totals?.withoutCollection ?? 0
  );
  const duplicateGroups = Number(
    analytics.totals?.duplicateGroups ?? 0
  );

  if (untagged / total >= 0.5) {
    insights.push({
      id: "many-untagged",
      level: "warning",
      message: `${untagged} conversations have no tags.`
    });
  }

  if (withoutCollection / total >= 0.5) {
    insights.push({
      id: "many-uncollected",
      level: "warning",
      message: `${withoutCollection} conversations are not in a collection.`
    });
  }

  if (duplicateGroups > 0) {
    insights.push({
      id: "duplicate-groups",
      level: "warning",
      message: `${duplicateGroups} duplicate group(s) are ready for review.`
    });
  }

  if (Number(analytics.activity?.last30Days ?? 0) === 0) {
    insights.push({
      id: "inactive-library",
      level: "info",
      message: "No conversations were added or updated in the last 30 days."
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy-library",
      level: "success",
      message: "Your library is organized and active."
    });
  }

  return insights;
}
