import test from "node:test";
import assert from "node:assert/strict";

import {
  findDuplicateGroups,
  getDuplicateKey,
  getDuplicateRecordIds
} from "../packages/library/src/duplicates.js";

const records = [
  {
    id: "newer",
    provider: "chatgpt",
    sourceUrl: "https://chatgpt.com/c/example?utm_source=test",
    title: "Example",
    updatedAt: "2026-07-14T08:00:00.000Z"
  },
  {
    id: "older",
    provider: "chatgpt",
    sourceUrl: "https://chatgpt.com/c/example#section",
    title: "Example copy",
    updatedAt: "2026-07-13T08:00:00.000Z"
  },
  {
    id: "unique",
    provider: "claude",
    sourceUrl: "https://claude.ai/chat/unique",
    title: "Unique",
    updatedAt: "2026-07-12T08:00:00.000Z"
  }
];

test("normalizes provider conversation URLs", () => {
  assert.equal(getDuplicateKey(records[0]), getDuplicateKey(records[1]));
});

test("returns duplicate groups newest first", () => {
  const groups = findDuplicateGroups(records);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map(({ id }) => id), ["newer", "older"]);
});

test("returns duplicate record IDs", () => {
  assert.deepEqual(
    [...getDuplicateRecordIds(records)].sort(),
    ["newer", "older"]
  );
});

test("uses checksum when source URL is unavailable", () => {
  const left = {
    id: "a",
    provider: "gemini",
    checksum: "ABC123",
    title: "One"
  };
  const right = {
    id: "b",
    provider: "gemini",
    checksum: "abc123",
    title: "Two"
  };

  assert.equal(getDuplicateKey(left), getDuplicateKey(right));
});
