import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEmptyState,
  createFocusHistory,
  normalizeAnnouncement
} from "../packages/library/src/accessibility.js";

test("normalizes accessibility announcements", () => {
  const announcement = normalizeAnnouncement({
    message: " Updated ",
    politeness: "assertive",
    clearAfterMs: 500
  });

  assert.deepEqual(announcement, {
    message: "Updated",
    politeness: "assertive",
    clearAfterMs: 500
  });
});

test("defaults announcement settings", () => {
  const announcement = normalizeAnnouncement({
    message: "Ready"
  });

  assert.equal(announcement.politeness, "polite");
  assert.equal(announcement.clearAfterMs, 2000);
});

test("focus history restores the latest element", () => {
  const events = [];
  const first = {
    focus() {
      events.push("first");
    }
  };
  const second = {
    focus() {
      events.push("second");
    }
  };

  const history = createFocusHistory();

  history.push(first);
  history.push(second);

  assert.equal(history.size(), 2);
  assert.equal(history.restore(), true);
  assert.deepEqual(events, ["second"]);
  assert.equal(history.size(), 1);
});

test("builds empty states with optional actions", () => {
  const state = buildEmptyState({
    title: "No results",
    message: "Change filters.",
    actionLabel: "Clear",
    actionId: "clear"
  });

  assert.deepEqual(state, {
    title: "No results",
    message: "Change filters.",
    action: {
      label: "Clear",
      id: "clear"
    }
  });
});

test("rejects invalid accessibility input", () => {
  assert.throws(
    () => normalizeAnnouncement({ message: "" }),
    /message is required/
  );

  assert.throws(
    () =>
      buildEmptyState({
        title: "",
        message: "Missing title"
      }),
    /required/
  );
});
