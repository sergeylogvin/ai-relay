import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { GeminiAdapter } from "../packages/providers/src/gemini/adapter.js";

class FakeElement {
  constructor({
    text = "",
    selectors = {},
    order = 0,
    parentElement = null
  } = {}) {
    this.innerText = text;
    this.textContent = text;
    this.selectors = selectors;
    this.order = order;
    this.parentElement = parentElement;
  }

  querySelector(selector) {
    const value = this.selectors[selector];

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value ?? null;
  }

  querySelectorAll(selector) {
    const value = this.selectors[selector];

    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  compareDocumentPosition(other) {
    if (this.order < other.order) {
      return Node.DOCUMENT_POSITION_FOLLOWING;
    }

    if (this.order > other.order) {
      return Node.DOCUMENT_POSITION_PRECEDING;
    }

    return 0;
  }

  contains(other) {
    let candidate = other;

    while (candidate) {
      if (candidate === this) return true;
      candidate = candidate.parentElement;
    }

    return false;
  }
}

globalThis.Node = {
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4
};

function buildFixtureDocument() {
  const title = new FakeElement({
    text: "AI Relay alpha",
    order: 0
  });

  const userOneContent = new FakeElement({
    text: "Goal: Complete the provider integration layer.",
    order: 1
  });
  const userOne = new FakeElement({
    selectors: {
      ".query-text": userOneContent
    },
    order: 1
  });

  const assistantContent = new FakeElement({
    text: "Decision: Use isolated adapters per provider.",
    order: 2
  });
  const assistant = new FakeElement({
    selectors: {
      ".response-content": assistantContent
    },
    order: 2
  });

  const userTwoContent = new FakeElement({
    text: "Todo: Add a provider registry after Gemini.",
    order: 3
  });
  const userTwo = new FakeElement({
    selectors: {
      ".query-text": userTwoContent
    },
    order: 3
  });

  const main = new FakeElement({
    selectors: {
      "user-query": [userOne, userTwo],
      "model-response": [assistant]
    }
  });

  return {
    title: "AI Relay alpha - Gemini",
    location: {
      href: "https://gemini.google.com/app/example"
    },
    querySelector(selector) {
      if (selector === "main") return main;
      if (selector === '[data-test-id*="conversation-title"]') {
        return title;
      }

      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

test("GeminiAdapter matches only gemini.google.com", () => {
  const adapter = new GeminiAdapter();

  assert.equal(
    adapter.matches("https://gemini.google.com/app/example"),
    true
  );
  assert.equal(
    adapter.matches("https://chatgpt.com/c/example"),
    false
  );
});

test("GeminiAdapter reports safe context insertion support", () => {
  const adapter = new GeminiAdapter();

  assert.deepEqual(adapter.capabilities(), {
    readConversation: true,
    insertContext: true,
    uploadFiles: false,
    readLimits: false
  });
});

test("GeminiAdapter reads messages in document order", () => {
  const adapter = new GeminiAdapter();
  const result = adapter.readConversation(buildFixtureDocument());

  assert.equal(result.provider, "gemini");
  assert.equal(result.title, "AI Relay alpha");
  assert.equal(result.url, "https://gemini.google.com/app/example");
  assert.deepEqual(
    result.messages.map(({ role }) => role),
    ["user", "assistant", "user"]
  );
  assert.deepEqual(
    result.messages.map(({ content }) => content),
    [
      "Goal: Complete the provider integration layer.",
      "Decision: Use isolated adapters per provider.",
      "Todo: Add a provider registry after Gemini."
    ]
  );
});

test("GeminiAdapter keeps complete turns instead of nested UI fragments", () => {
  const userContent = new FakeElement({
    text: "Name three benefits of electronic signatures.",
    order: 1
  });
  const userTurn = new FakeElement({
    selectors: { ".query-text": userContent },
    order: 1
  });
  const userLabel = new FakeElement({
    text: "You said",
    order: 1,
    parentElement: userTurn
  });
  userContent.parentElement = userTurn;

  const assistantContent = new FakeElement({
    text: "They save time, reduce costs, and improve traceability.",
    order: 2
  });
  const assistantTurn = new FakeElement({
    selectors: { ".response-content": assistantContent },
    order: 2
  });
  const assistantFragment = new FakeElement({
    text: "They save time",
    order: 2,
    parentElement: assistantTurn
  });
  assistantContent.parentElement = assistantTurn;

  const main = new FakeElement({
    selectors: {
      "user-query": [userTurn],
      '[class*="user-query"]': [userLabel],
      "model-response": [assistantTurn],
      '[class*="model-response"]': [assistantFragment]
    }
  });
  const root = {
    title: "Benefits - Gemini",
    location: { href: "https://gemini.google.com/app/example" },
    querySelector: (selector) => (selector === "main" ? main : null),
    querySelectorAll: () => []
  };

  const result = new GeminiAdapter().readConversation(root);

  assert.deepEqual(
    result.messages.map(({ role, content }) => [role, content]),
    [
      ["user", "Name three benefits of electronic signatures."],
      [
        "assistant",
        "They save time, reduce costs, and improve traceability."
      ]
    ]
  );
});

test("GeminiAdapter removes speaker labels from captured turn content", () => {
  const userContent = new FakeElement({
    text: "You said\n\nName three benefits of electronic signatures.",
    order: 1
  });
  const userTurn = new FakeElement({
    selectors: { ".query-text": userContent },
    order: 1
  });

  const assistantContent = new FakeElement({
    text:
      "Gemini said\n\nThey save time, reduce costs, and improve traceability.",
    order: 2
  });
  const assistantTurn = new FakeElement({
    selectors: { ".response-content": assistantContent },
    order: 2
  });

  const main = new FakeElement({
    selectors: {
      "user-query": [userTurn],
      "model-response": [assistantTurn]
    }
  });
  const root = {
    title: "Benefits - Gemini",
    location: { href: "https://gemini.google.com/app/example" },
    querySelector: (selector) => (selector === "main" ? main : null),
    querySelectorAll: () => []
  };

  const result = new GeminiAdapter().readConversation(root);

  assert.deepEqual(
    result.messages.map(({ role, content }) => [role, content]),
    [
      ["user", "Name three benefits of electronic signatures."],
      [
        "assistant",
        "They save time, reduce costs, and improve traceability."
      ]
    ]
  );
});

test("Gemini fixture documents expected selector roles", async () => {
  const fixture = await readFile(
    new URL("./fixtures/gemini/basic.html", import.meta.url),
    "utf8"
  );

  assert.match(fixture, /<user-query>/);
  assert.match(fixture, /<model-response>/);
  assert.match(fixture, /data-test-id="conversation-title"/);
});
