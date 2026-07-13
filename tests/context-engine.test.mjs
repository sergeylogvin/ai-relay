import test from "node:test";
import assert from "node:assert/strict";

import {
  ContextEngine,
  formatContextHandoff,
} from "../packages/core/src/context-engine.js";
import { DomainValidationError } from "../packages/core/src/errors.js";

const messages = [
  {
    role: "user",
    content: [
      "Goal: Ship AI Relay alpha",
      "Constraint: Local only",
      "Decision: Use a provider-independent core",
      "Task: Build the context engine",
    ].join("\n"),
  },
  {
    role: "assistant",
    content: "Done: Defined the project and snapshot models.",
  },
  {
    role: "user",
    content: "Todo: Add a browser extension after the context engine.",
  },
];

test("ContextEngine creates a structured snapshot", () => {
  const engine = new ContextEngine({ recentMessageLimit: 2 });

  const snapshot = engine.createSnapshot({
    projectId: "ai-relay",
    provider: "Claude",
    messages,
    capturedAt: "2026-07-13T12:00:00.000Z",
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.projectId, "ai-relay");
  assert.equal(snapshot.provider, "claude");
  assert.equal(snapshot.messageCount, 3);
  assert.equal(snapshot.state.goal, "Ship AI Relay alpha");
  assert.equal(snapshot.state.currentTask, "Build the context engine");
  assert.deepEqual(snapshot.state.constraints, ["Local only"]);
  assert.deepEqual(snapshot.state.decisions, [
    "Use a provider-independent core",
  ]);
  assert.deepEqual(snapshot.state.completedWork, [
    "Defined the project and snapshot models.",
  ]);
  assert.deepEqual(snapshot.state.pendingTasks, [
    "Add a browser extension after the context engine.",
  ]);
  assert.equal(snapshot.recentMessages.length, 2);
});

test("ContextEngine preserves previous project state", () => {
  const engine = new ContextEngine();

  const snapshot = engine.createSnapshot({
    projectId: "ai-relay",
    provider: "chatgpt",
    messages: [
      {
        role: "user",
        content: "Continue implementing the storage layer.",
      },
    ],
    previousState: {
      goal: "Ship AI Relay alpha",
      constraints: ["Local only"],
      decisions: ["Use JavaScript modules"],
      pendingTasks: ["Create the browser UI"],
      completedWork: [],
      references: ["README.md"],
      fileReferences: ["example.json"],
      notes: ["First public repository"],
    },
  });

  assert.equal(snapshot.state.goal, "Ship AI Relay alpha");
  assert.equal(
    snapshot.state.currentTask,
    "Continue implementing the storage layer.",
  );
  assert.deepEqual(snapshot.state.constraints, ["Local only"]);
  assert.deepEqual(snapshot.state.decisions, ["Use JavaScript modules"]);
  assert.deepEqual(snapshot.state.references, ["README.md"]);
});

test("ContextEngine creates a portable handoff", () => {
  const engine = new ContextEngine({ recentMessageLimit: 2 });
  const snapshot = engine.createSnapshot({
    projectId: "ai-relay",
    provider: "claude",
    messages,
  });

  const handoff = engine.createHandoff(snapshot, {
    targetProvider: "ChatGPT",
  });

  assert.equal(handoff.sourceProvider, "claude");
  assert.equal(handoff.targetProvider, "chatgpt");
  assert.equal(handoff.goal, "Ship AI Relay alpha");
  assert.equal(handoff.recentMessages.length, 2);
});

test("formatContextHandoff creates readable Markdown", () => {
  const engine = new ContextEngine();
  const snapshot = engine.createSnapshot({
    projectId: "ai-relay",
    provider: "claude",
    messages,
  });
  const handoff = engine.createHandoff(snapshot, {
    targetProvider: "gemini",
  });

  const markdown = formatContextHandoff(handoff);

  assert.match(markdown, /# AI Relay Handoff/);
  assert.match(markdown, /## GOAL/);
  assert.match(markdown, /Ship AI Relay alpha/);
  assert.match(markdown, /## DECISIONS/);
  assert.match(markdown, /provider-independent core/);
  assert.match(markdown, /## CONTINUATION INSTRUCTION/);
});

test("ContextEngine rejects invalid messages", () => {
  const engine = new ContextEngine();

  assert.throws(
    () =>
      engine.createSnapshot({
        projectId: "ai-relay",
        provider: "claude",
        messages: [{ role: "tool", content: "Invalid" }],
      }),
    DomainValidationError,
  );
});
