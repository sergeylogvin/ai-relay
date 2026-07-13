import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ClaudeAdapter } from "../packages/providers/src/claude/adapter.js";

class FakeElement {
  constructor({
    text = "",
    selectors = {},
    order = 0
  } = {}) {
    this.innerText = text;
    this.textContent = text;
    this.selectors = selectors;
    this.order = order;
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
}

globalThis.Node = {
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4
};

function buildFixtureDocument() {
  const title = new FakeElement({
    text: "SEO forecast",
    order: 0
  });

  const userOneContent = new FakeElement({
    text: "Goal: Build a 12-month SEO forecast.",
    order: 1
  });
  const userOne = new FakeElement({
    selectors: {
      '[data-testid*="message-content"]': userOneContent
    },
    order: 1
  });

  const assistantContent = new FakeElement({
    text: "Decision: Use GA4 organic sessions as the baseline.",
    order: 2
  });
  const assistant = new FakeElement({
    selectors: {
      ".prose": assistantContent
    },
    order: 2
  });

  const userTwoContent = new FakeElement({
    text: "Todo: Add minimal, optimal, and premium scenarios.",
    order: 3
  });
  const userTwo = new FakeElement({
    selectors: {
      '[data-testid*="message-content"]': userTwoContent
    },
    order: 3
  });

  const main = new FakeElement({
    selectors: {
      '[data-testid*="user-message"]': [userOne, userTwo],
      '[data-testid*="assistant-message"]': [assistant]
    }
  });

  return {
    title: "SEO forecast - Claude",
    location: {
      href: "https://claude.ai/chat/example"
    },
    querySelector(selector) {
      if (selector === "main") return main;
      if (selector === '[data-testid*="conversation-title"]') {
        return title;
      }

      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

test("ClaudeAdapter matches only claude.ai", () => {
  const adapter = new ClaudeAdapter();

  assert.equal(
    adapter.matches("https://claude.ai/chat/example"),
    true
  );
  assert.equal(
    adapter.matches("https://chatgpt.com/c/example"),
    false
  );
});

test("ClaudeAdapter reports conservative capabilities", () => {
  const adapter = new ClaudeAdapter();

  assert.deepEqual(adapter.capabilities(), {
    readConversation: true,
    insertContext: false,
    uploadFiles: false,
    readLimits: false
  });
});

test("ClaudeAdapter reads messages in document order", () => {
  const adapter = new ClaudeAdapter();
  const result = adapter.readConversation(buildFixtureDocument());

  assert.equal(result.provider, "claude");
  assert.equal(result.title, "SEO forecast");
  assert.equal(result.url, "https://claude.ai/chat/example");
  assert.deepEqual(
    result.messages.map(({ role }) => role),
    ["user", "assistant", "user"]
  );
  assert.deepEqual(
    result.messages.map(({ content }) => content),
    [
      "Goal: Build a 12-month SEO forecast.",
      "Decision: Use GA4 organic sessions as the baseline.",
      "Todo: Add minimal, optimal, and premium scenarios."
    ]
  );
});

test("Claude fixture documents expected stable selector roles", async () => {
  const fixture = await readFile(
    new URL("./fixtures/claude/basic.html", import.meta.url),
    "utf8"
  );

  assert.match(fixture, /data-testid="user-message"/);
  assert.match(fixture, /data-testid="assistant-message"/);
  assert.match(fixture, /data-testid="conversation-title"/);
});
