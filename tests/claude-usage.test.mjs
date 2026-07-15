import assert from "node:assert/strict";
import test from "node:test";

import {
  extractOrganizationIdFromCookie,
  parseClaudeUsageResponse
} from "../packages/core/src/claude-usage.js";
import {
  formatUsagePercent,
  normalizeUsageSnapshot
} from "../packages/core/src/usage-snapshot.js";

test("extractOrganizationIdFromCookie reads lastActiveOrg", () => {
  assert.equal(
    extractOrganizationIdFromCookie(
      "anthropic-device-id=abc; lastActiveOrg=org-123; sessionKey=xyz"
    ),
    "org-123"
  );
});

test("parseClaudeUsageResponse normalizes session and weekly buckets", () => {
  const record = parseClaudeUsageResponse({
    five_hour: {
      utilization: 32,
      resets_at: "2026-07-15T14:09:00.000Z"
    },
    seven_day: {
      utilization: 67,
      resets_at: "2026-07-16T23:59:00.000Z"
    }
  });

  assert.equal(record.provider, "claude");
  assert.equal(record.status, "ok");
  assert.equal(record.buckets.length, 2);
  assert.equal(record.buckets[0].id, "session");
  assert.equal(record.buckets[0].utilization, 32);
  assert.equal(record.buckets[1].id, "weekly");
  assert.equal(record.buckets[1].utilization, 67);
});

test("normalizeUsageSnapshot stores provider records", () => {
  const snapshot = normalizeUsageSnapshot({
    providers: {
      claude: parseClaudeUsageResponse({
        five_hour: { utilization: 10, resets_at: "2026-07-15T14:09:00.000Z" },
        seven_day: { utilization: 20, resets_at: "2026-07-16T23:59:00.000Z" }
      })
    }
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.providers.claude.buckets.length, 2);
  assert.equal(formatUsagePercent(32), "32%");
});
