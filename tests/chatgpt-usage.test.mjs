import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchChatGPTUsageFromSession,
  parseChatGPTUsageResponse
} from "../packages/core/src/chatgpt-usage.js";

test("parseChatGPTUsageResponse normalizes session and weekly buckets", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const record = parseChatGPTUsageResponse(
    {
      rate_limit: {
        primary_window: {
          used_percent: 33,
          reset_after_seconds: 7200
        },
        secondary_window: {
          used_percent: 12,
          reset_after_seconds: 432000
        }
      }
    },
    now
  );

  assert.equal(record.provider, "chatgpt");
  assert.equal(record.status, "ok");
  assert.equal(record.buckets.length, 2);
  assert.equal(record.buckets[0].id, "session");
  assert.equal(record.buckets[0].utilization, 33);
  assert.equal(record.buckets[1].id, "weekly");
  assert.equal(record.buckets[1].utilization, 12);
  assert.equal(record.buckets[0].resetsAt, "2026-07-15T14:00:00.000Z");
});

test("fetchChatGPTUsageFromSession exchanges cookies for bearer usage", async () => {
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (url.endsWith("/api/auth/session")) {
      return {
        ok: true,
        json: async () => ({ accessToken: "token-123" })
      };
    }

    if (url.endsWith("/backend-api/wham/usage")) {
      return {
        ok: true,
        json: async () => ({
          rate_limit: {
            primary_window: { used_percent: 10, reset_after_seconds: 3600 },
            secondary_window: { used_percent: 5, reset_after_seconds: 86400 }
          }
        })
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const record = await fetchChatGPTUsageFromSession({
    cookieHeader: "__Secure-next-auth.session-token.0=abc",
    fetchImpl,
    now: new Date("2026-07-15T12:00:00.000Z")
  });

  assert.equal(record.provider, "chatgpt");
  assert.equal(record.status, "ok");
  assert.equal(calls.length, 2);
  assert.match(calls[1].options.headers.Authorization, /Bearer token-123/);
});

test("fetchChatGPTUsageFromSession returns sign-in error without cookies", async () => {
  const record = await fetchChatGPTUsageFromSession({ cookieHeader: null });

  assert.equal(record.status, "error");
  assert.match(record.error, /Sign in to chatgpt.com/i);
});
