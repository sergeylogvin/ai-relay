import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLibraryAnalytics,
  formatAnalyticsBytes,
  getLibraryHealthInsights
} from "../packages/library/src/analytics.js";

const referenceDate = "2026-07-14T12:00:00.000Z";

test("builds library analytics summary", () => {
  const analytics = buildLibraryAnalytics(
    [
      {
        id: "1",
        provider: "chatgpt",
        domain: "chatgpt.com",
        tags: ["seo"],
        collectionIds: ["work"],
        pinned: true,
        updatedAt: "2026-07-13T12:00:00.000Z"
      },
      {
        id: "2",
        provider: "chatgpt",
        domain: "chatgpt.com",
        tags: [],
        collectionIds: [],
        updatedAt: "2026-06-20T12:00:00.000Z"
      },
      {
        id: "3",
        provider: "claude",
        domain: "claude.ai",
        tags: ["research"],
        collectionId: "research",
        createdAt: "2026-03-01T12:00:00.000Z"
      }
    ],
    {
      referenceDate,
      duplicateGroups: [["1", "2"]]
    }
  );

  assert.equal(analytics.totals.conversations, 3);
  assert.equal(analytics.totals.pinned, 1);
  assert.equal(analytics.totals.tagged, 2);
  assert.equal(analytics.totals.inCollections, 2);
  assert.equal(analytics.totals.untagged, 1);
  assert.equal(analytics.totals.withoutCollection, 1);
  assert.equal(analytics.totals.duplicateGroups, 1);
  assert.equal(analytics.activity.last7Days, 1);
  assert.equal(analytics.activity.last30Days, 2);
  assert.equal(analytics.activity.last90Days, 2);
  assert.deepEqual(analytics.providers, [
    { name: "chatgpt", count: 2 },
    { name: "claude", count: 1 }
  ]);
});

test("returns zero-safe analytics for an empty library", () => {
  const analytics = buildLibraryAnalytics([], {
    referenceDate
  });

  assert.equal(analytics.totals.conversations, 0);
  assert.equal(analytics.storage.averageRecordBytes, 0);
  assert.deepEqual(analytics.providers, []);
  assert.deepEqual(analytics.domains, []);
});

test("sorts equal breakdown counts alphabetically", () => {
  const analytics = buildLibraryAnalytics(
    [
      { provider: "zeta" },
      { provider: "alpha" }
    ],
    { referenceDate }
  );

  assert.deepEqual(analytics.providers, [
    { name: "alpha", count: 1 },
    { name: "zeta", count: 1 }
  ]);
});

test("formats analytics byte values", () => {
  assert.equal(formatAnalyticsBytes(500), "500 B");
  assert.equal(formatAnalyticsBytes(2048), "2.0 KB");
  assert.equal(
    formatAnalyticsBytes(2 * 1024 * 1024),
    "2.0 MB"
  );
});

test("generates organization and duplicate insights", () => {
  const analytics = buildLibraryAnalytics(
    [
      { id: "1", tags: [], collectionIds: [] },
      { id: "2", tags: [], collectionIds: [] },
      {
        id: "3",
        tags: ["done"],
        collectionIds: ["work"]
      }
    ],
    {
      referenceDate,
      duplicateGroups: [["1", "2"]]
    }
  );

  const ids = getLibraryHealthInsights(analytics).map(
    (insight) => insight.id
  );

  assert.ok(ids.includes("many-untagged"));
  assert.ok(ids.includes("many-uncollected"));
  assert.ok(ids.includes("duplicate-groups"));
  assert.ok(ids.includes("inactive-library"));
});

test("returns an empty-library insight", () => {
  const analytics = buildLibraryAnalytics([], {
    referenceDate
  });

  assert.deepEqual(getLibraryHealthInsights(analytics), [
    {
      id: "empty-library",
      level: "info",
      message:
        "Capture conversations to begin building library insights."
    }
  ]);
});

test("rejects invalid records and reference dates", () => {
  assert.throws(
    () => buildLibraryAnalytics({}),
    /must be an array/
  );

  assert.throws(
    () =>
      buildLibraryAnalytics([], {
        referenceDate: "invalid"
      }),
    /valid date/
  );
});
