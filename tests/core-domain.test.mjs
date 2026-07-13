import assert from "node:assert/strict";
import test from "node:test";

import {
  DomainValidationError,
  createHandoff,
  createProject,
  createSession,
  createSnapshot,
  formatHandoffMarkdown,
  updateProjectState
} from "../packages/core/src/index.js";

test("creates an immutable project with normalized state", () => {
  const project = createProject({
    name: "  SEO forecast  ",
    classification: "work",
    currentState: {
      goal: "Increase organic traffic",
      constraints: ["USA only", "", "No branded traffic"]
    }
  });

  assert.equal(project.name, "SEO forecast");
  assert.equal(project.classification, "work");
  assert.deepEqual(project.currentState.constraints, ["USA only", "No branded traffic"]);
  assert.equal(Object.isFrozen(project), true);
  assert.equal(Object.isFrozen(project.currentState), true);
});

test("rejects an empty project name", () => {
  assert.throws(
    () => createProject({ name: " " }),
    (error) => error instanceof DomainValidationError && error.details.field === "name"
  );
});

test("updates project state without mutating the original project", () => {
  const project = createProject({ name: "AI Relay" });
  const updated = updateProjectState(project, { currentTask: "Build core domain" });

  assert.equal(project.currentState.currentTask, "");
  assert.equal(updated.currentState.currentTask, "Build core domain");
  assert.notEqual(updated, project);
});

test("creates related session and snapshot records", () => {
  const project = createProject({ name: "AI Relay" });
  const session = createSession({ projectId: project.id, providerId: "claude" });
  const snapshot = createSnapshot({
    projectId: project.id,
    sessionId: session.id,
    sequence: 2,
    state: { pendingTasks: ["Create storage engine"] }
  });

  assert.equal(session.projectId, project.id);
  assert.equal(snapshot.sessionId, session.id);
  assert.equal(snapshot.sequence, 2);
  assert.deepEqual(snapshot.state.pendingTasks, ["Create storage engine"]);
});

test("formats a portable handoff document", () => {
  const project = createProject({ name: "AI Relay" });
  const handoff = createHandoff({
    projectId: project.id,
    sourceProviderId: "claude",
    targetProviderId: "chatgpt",
    mode: "safe",
    state: {
      goal: "Ship the first alpha",
      decisions: ["Local-first", "No automatic send"],
      pendingTasks: ["Build browser shell"]
    },
    recentMessages: ["User approved the architecture."],
    safetyNotice: "Review corporate data before sending."
  });

  const markdown = formatHandoffMarkdown(handoff);

  assert.match(markdown, /# AI Relay Handoff/);
  assert.match(markdown, /Source: claude/);
  assert.match(markdown, /- Local-first/);
  assert.match(markdown, /Review corporate data/);
});
