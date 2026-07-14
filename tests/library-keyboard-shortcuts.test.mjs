import test from "node:test";
import assert from "node:assert/strict";

import {
  createShortcutRegistry,
  formatShortcutLabel,
  isEditableTarget,
  normalizeShortcut,
  normalizeShortcutList,
  shortcutMatchesEvent,
  shortcutSignature
} from "../packages/library/src/keyboard-shortcuts.js";

test("normalizes a keyboard shortcut", () => {
  const shortcut = normalizeShortcut({
    id: "palette",
    key: "K",
    modifiers: ["shift", "cmd"],
    description: "Open palette"
  });

  assert.deepEqual(shortcut, {
    id: "palette",
    key: "k",
    modifiers: ["meta", "shift"],
    description: "Open palette",
    category: "General",
    enabled: true,
    allowInEditable: false,
    preventDefault: true
  });
});

test("creates stable shortcut signatures", () => {
  const signature = shortcutSignature({
    id: "palette",
    key: "k",
    modifiers: ["ctrl", "shift"]
  });

  assert.equal(signature, "ctrl+shift+k");
});

test("matches keyboard events exactly", () => {
  const shortcut = {
    id: "palette",
    key: "k",
    modifiers: ["ctrl"]
  };

  assert.equal(
    shortcutMatchesEvent(shortcut, {
      key: "K",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false
    }),
    true
  );

  assert.equal(
    shortcutMatchesEvent(shortcut, {
      key: "K",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: true
    }),
    false
  );
});

test("detects editable targets", () => {
  assert.equal(
    isEditableTarget({ tagName: "INPUT" }),
    true
  );
  assert.equal(
    isEditableTarget({ tagName: "DIV", isContentEditable: true }),
    true
  );
  assert.equal(
    isEditableTarget({ tagName: "BUTTON" }),
    false
  );
});

test("formats labels for mac and non-mac platforms", () => {
  const shortcut = {
    id: "palette",
    key: "k",
    modifiers: ["meta", "shift"]
  };

  assert.equal(
    formatShortcutLabel(shortcut, {
      platform: "MacIntel"
    }),
    "⌘⇧K"
  );

  assert.equal(
    formatShortcutLabel(shortcut, {
      platform: "Linux"
    }),
    "Meta+Shift+K"
  );
});

test("registry finds shortcuts by event", () => {
  const registry = createShortcutRegistry([
    {
      id: "search",
      key: "/"
    }
  ]);

  const match = registry.findByEvent({
    key: "/",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false
  });

  assert.equal(match.id, "search");
});

test("rejects duplicate shortcut signatures", () => {
  assert.throws(
    () =>
      normalizeShortcutList([
        { id: "one", key: "k", modifiers: ["ctrl"] },
        { id: "two", key: "K", modifiers: ["ctrl"] }
      ]),
    /Duplicate/
  );
});
