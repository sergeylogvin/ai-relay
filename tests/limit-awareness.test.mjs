import assert from "node:assert/strict";
import test from "node:test";

import {
  FIT_LEVELS,
  assessContextFit,
  estimateTokensFromText,
  formatContextFitBadge,
  formatContextFitSummary,
  formatTokenCount,
  resolveContextWindow
} from "../packages/core/src/limit-awareness.js";

test("estimateTokensFromText uses the chars/4 heuristic", () => {
  assert.equal(estimateTokensFromText("12345678"), 2);
  assert.equal(estimateTokensFromText(""), 0);
});

test("resolveContextWindow prefers model-specific windows", () => {
  assert.equal(
    resolveContextWindow({ provider: "claude", model: "Opus 4.8 High" }),
    200_000
  );
  assert.equal(
    resolveContextWindow({ provider: "chatgpt", model: "GPT-4o" }),
    128_000
  );
  assert.equal(resolveContextWindow({ provider: "gemini" }), 1_000_000);
});

test("assessContextFit marks large handoffs as caution or warning", () => {
  const markdown = "x".repeat(800_000);

  const assessment = assessContextFit({
    handoffMarkdown: markdown,
    provider: "claude",
    model: "Opus 4.8 High",
    handoffMode: "full"
  });

  assert.equal(assessment.level, FIT_LEVELS.OVER);
  assert.match(assessment.recommendation, /Context pack/i);
});

test("assessContextFit recommends context pack for caution on full transcript", () => {
  const markdown = "x".repeat(420_000);

  const assessment = assessContextFit({
    handoffMarkdown: markdown,
    provider: "claude",
    model: "Opus 4.8 High",
    handoffMode: "full"
  });

  assert.equal(assessment.level, FIT_LEVELS.CAUTION);
  assert.match(assessment.recommendation, /Context pack/i);
});

test("formatContextFitSummary renders compact token usage", () => {
  const assessment = assessContextFit({
    handoffMarkdown: "Hello world",
    provider: "claude",
    model: "Opus 4.8 High"
  });

  assert.equal(formatContextFitSummary(assessment), "3 / 200k est. tokens (0%)");
  assert.equal(formatContextFitBadge(assessment), "Fits current model");
});

test("formatTokenCount abbreviates large counts", () => {
  assert.equal(formatTokenCount(2132), "2.1k");
  assert.equal(formatTokenCount(1_500_000), "1.5M");
});
