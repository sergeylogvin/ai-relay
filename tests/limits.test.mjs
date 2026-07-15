import assert from "node:assert/strict";
import test from "node:test";

import {
  LIMIT_SIGNAL_TYPES,
  classifyLimitMessage,
  createLimitSignal,
  formatLimitSignalLabel,
  scanLimitSignals
} from "../packages/providers/src/limits.js";

class FakeElement {
  constructor({ text = "", selectors = {} } = {}) {
    this.innerText = text;
    this.textContent = text;
    this.selectors = selectors;
  }

  querySelector(selector) {
    const value = this.selectors[selector];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  querySelectorAll(selector) {
    const value = this.selectors[selector];
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }
}

test("classifyLimitMessage detects quota and context signals", () => {
  assert.equal(
    classifyLimitMessage("You reached your daily message limit."),
    LIMIT_SIGNAL_TYPES.QUOTA
  );
  assert.equal(
    classifyLimitMessage("This conversation is too long for the model."),
    LIMIT_SIGNAL_TYPES.CONTEXT_FULL
  );
});

test("scanLimitSignals reads visible provider banners", () => {
  const banner = new FakeElement({
    text: "You reached your daily message limit."
  });
  const root = new FakeElement({
    selectors: {
      '[role="alert"]': banner
    }
  });

  const signals = scanLimitSignals(root);

  assert.equal(signals.length, 1);
  assert.equal(signals[0].type, LIMIT_SIGNAL_TYPES.QUOTA);
  assert.equal(formatLimitSignalLabel(signals[0]), "Usage limit detected");
});

test("createLimitSignal rejects empty messages", () => {
  assert.throws(
    () =>
      createLimitSignal({
        message: "   "
      }),
    /message is required/i
  );
});
