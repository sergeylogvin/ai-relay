import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGeminiListChatsPayloads,
  buildGeminiReadChatPayload,
  classifyGeminiTurn,
  classifyGeminiTurnFromRaw,
  extractGeminiSessionTokens,
  normalizeGeminiInitUrl,
  normalizeGeminiSourcePath,
  parseGeminiChatListResponse,
  parseGeminiTurnCountsFromChatResponse,
  parseGeminiUsageCounts
} from "../packages/core/src/gemini-usage.js";

test("classifyGeminiTurn maps pro and thinking buckets", () => {
  assert.equal(classifyGeminiTurn("e6fa609c3fa255c0", false), "pro");
  assert.equal(classifyGeminiTurn("fbb127bbb056c959", true), "thinking");
  assert.equal(classifyGeminiTurn("fbb127bbb056c959", false), "flash");
});

test("buildGeminiListChatsPayloads matches Gemini web API", () => {
  assert.deepEqual(buildGeminiListChatsPayloads(13), [
    "[13,null,[1,null,1]]",
    "[13,null,[0,null,1]]"
  ]);
});

test("buildGeminiReadChatPayload uses current read RPC shape", () => {
  assert.equal(
    buildGeminiReadChatPayload("c_123", 10),
    '["c_123",10,null,1,[1],[4],null,1]'
  );
});

test("normalizeGeminiInitUrl keeps account-specific app paths", () => {
  assert.equal(
    normalizeGeminiInitUrl("https://gemini.google.com/u/1/app?pageId=none"),
    "https://gemini.google.com/u/1/app?pageId=none"
  );
  assert.equal(normalizeGeminiSourcePath("https://gemini.google.com/u/1/app"), "/u/1/app");
});

test("extractGeminiSessionTokens reads embedded init tokens", () => {
  const html = `"SNlM0e":"token-abc","cfb2h":"build-1","FdrFJe":"sid-9"`;

  assert.deepEqual(extractGeminiSessionTokens(html), {
    accessToken: "token-abc",
    buildLabel: "build-1",
    sessionId: "sid-9",
    language: ""
  });
});

test("parseGeminiChatListResponse extracts chat metadata", () => {
  const innerBody = [
    null,
    null,
    [["c_123", "Test chat", null, null, null, [1_752_000_000, 0]]]
  ];
  const bodyStr = JSON.stringify(innerBody);
  const frame = JSON.stringify(["MaZiqc", null, bodyStr]);
  const response = `)]}'\n${frame.length}\n${frame}`;

  const chats = parseGeminiChatListResponse(response);

  assert.equal(chats.length, 1);
  assert.equal(chats[0].cid, "c_123");
  assert.equal(chats[0].title, "Test chat");
  assert.equal(chats[0].timestamp, 1_752_000_000);
});

test("parseGeminiTurnCountsFromChatResponse counts pro and thinking turns", () => {
  const turns = [
    [
      ["c_123", "r1"],
      ["c_123", "r1", "rc1"],
      ["Prompt", 3, null, 0, "e6fa609c3fa255c0"],
      [[["rc1", ["Answer"]]]],
      [1_752_000_100, 0]
    ],
    [
      ["c_123", "r2"],
      ["c_123", "r2", "rc2"],
      ["Prompt 2", 3, null, 0, "fbb127bbb056c959"],
      [[["rc2", ["Answer 2"]]]],
      [1_752_000_200, 0]
    ]
  ];
  const innerBody = [turns];
  const bodyStr = JSON.stringify(innerBody);
  const frame = JSON.stringify(["hNvQHb", null, bodyStr]);
  const response = `)]}'\n${frame.length}\n${frame}`;

  const counts = parseGeminiTurnCountsFromChatResponse(response, 0);

  assert.equal(counts.pro, 1);
  assert.equal(counts.thinking, 0);
  assert.equal(counts.flash, 1);
});

test("classifyGeminiTurnFromRaw detects thoughts in nested response", () => {
  const candidate = new Array(38).fill(null);
  candidate[0] = "rc3";
  candidate[1] = ["Answer"];
  candidate[37] = [["Deep thought"]];

  const turn = [
    ["c_123", "r3"],
    ["c_123", "r3", "rc3"],
    ["Prompt", 3, null, 0, "fbb127bbb056c959"],
    [[candidate]],
    [1_752_000_300, 0]
  ];

  assert.equal(classifyGeminiTurnFromRaw(turn), "thinking");
});

test("parseGeminiUsageCounts converts counts into utilization buckets", () => {
  const now = new Date("2026-07-15T20:00:00.000Z");
  const record = parseGeminiUsageCounts(
    { pro: 25, thinking: 60, flash: 10 },
    { now }
  );

  assert.equal(record.provider, "gemini");
  assert.equal(record.status, "ok");
  assert.equal(record.buckets[0].id, "pro");
  assert.equal(record.buckets[0].utilization, 25);
  assert.equal(record.buckets[1].id, "thinking");
  assert.equal(record.buckets[1].utilization, 20);
});
