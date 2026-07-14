import test from "node:test";
import assert from "node:assert/strict";

import {
  filterCommands
} from "../apps/browser/src/command-palette.js";

const commands = [
  {
    id: "settings",
    title: "Open settings",
    description: "Manage preferences",
    keywords: ["preferences"]
  },
  {
    id: "search",
    title: "Focus search",
    description: "Search the library",
    keywords: ["find"]
  },
  {
    id: "analytics",
    title: "Open analytics",
    description: "View library insights",
    keywords: ["reports"]
  }
];

test("returns all enabled commands for empty query", () => {
  const result = filterCommands(commands, "");

  assert.equal(result.length, 3);
});

test("ranks exact and prefix matches first", () => {
  const result = filterCommands(commands, "open");

  assert.deepEqual(
    result.map((command) => command.id),
    ["analytics", "settings"]
  );
});

test("matches command keywords and descriptions", () => {
  assert.equal(
    filterCommands(commands, "preferences")[0].id,
    "settings"
  );

  assert.equal(
    filterCommands(commands, "insights")[0].id,
    "analytics"
  );
});

test("ignores disabled commands", () => {
  const result = filterCommands(
    [
      ...commands,
      {
        id: "disabled",
        title: "Disabled",
        enabled: false
      }
    ],
    ""
  );

  assert.equal(
    result.some((command) => command.id === "disabled"),
    false
  );
});
