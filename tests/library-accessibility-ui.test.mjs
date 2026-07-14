import test from "node:test";
import assert from "node:assert/strict";

import {
  getFocusableElements,
  trapFocus
} from "../packages/library/src/accessibility.js";

test("returns only visible focusable elements", () => {
  const visibleButton = {
    hidden: false,
    getAttribute() {
      return null;
    }
  };

  const hiddenButton = {
    hidden: true,
    getAttribute() {
      return null;
    }
  };

  const ariaHidden = {
    hidden: false,
    getAttribute(name) {
      return name === "aria-hidden" ? "true" : null;
    }
  };

  const root = {
    querySelectorAll() {
      return [
        visibleButton,
        hiddenButton,
        ariaHidden
      ];
    }
  };

  assert.deepEqual(
    getFocusableElements(root),
    [visibleButton]
  );
});

test("traps focus from last to first", () => {
  const events = [];
  const first = {
    hidden: false,
    getAttribute() {
      return null;
    },
    focus() {
      events.push("first");
    }
  };

  const last = {
    hidden: false,
    getAttribute() {
      return null;
    },
    focus() {
      events.push("last");
    }
  };

  const root = {
    ownerDocument: {
      activeElement: last
    },
    querySelectorAll() {
      return [first, last];
    }
  };

  const event = {
    key: "Tab",
    shiftKey: false,
    preventDefault() {
      events.push("prevented");
    }
  };

  assert.equal(trapFocus(root, event), true);
  assert.deepEqual(events, ["prevented", "first"]);
});
