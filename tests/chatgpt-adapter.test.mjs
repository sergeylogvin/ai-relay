import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ChatGPTAdapter } from "../packages/providers/src/chatgpt/adapter.js";

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
    text: "AI Relay roadmap",
    order: 0
  });

  const userOneContent = new FakeElement({
    text: "Goal: Prepare the first browser alpha.",
    order: 1
  });
  const userOne = new FakeElement({
    selectors: {
      '[data-message-content]': userOneContent
    },
    order: 1
  });

  const assistantContent = new FakeElement({
    text: "Decision: Keep the extension local-first.",
    order: 2
  });
  const assistant = new FakeElement({
    selectors: {
      ".markdown": assistantContent
    },
    order: 2
  });

  const userTwoContent = new FakeElement({
    text: "Todo: Add the Gemini adapter next.",
    order: 3
  });
  const userTwo = new FakeElement({
    selectors: {
      '[data-message-content]': userTwoContent
    },
    order: 3
  });

  const main = new FakeElement({
    selectors: {
      '[data-message-author-role="user"]': [userOne, userTwo],
      '[data-message-author-role="assistant"]': [assistant]
    }
  });

  return {
    title: "AI Relay roadmap - ChatGPT",
    location: {
      href: "https://chatgpt.com/c/example"
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

test("ChatGPTAdapter matches only chatgpt.com", () => {
  const adapter = new ChatGPTAdapter();

  assert.equal(
    adapter.matches("https://chatgpt.com/c/example"),
    true
  );
  assert.equal(
    adapter.matches("https://claude.ai/chat/example"),
    false
  );
});

test("ChatGPTAdapter reports safe context insertion support", () => {
  const adapter = new ChatGPTAdapter();

  assert.deepEqual(adapter.capabilities(), {
    readConversation: true,
    insertContext: true,
    uploadFiles: false,
    readLimits: false
  });
});

test("ChatGPTAdapter reads messages in document order", () => {
  const adapter = new ChatGPTAdapter();
  const result = adapter.readConversation(buildFixtureDocument());

  assert.equal(result.provider, "chatgpt");
  assert.equal(result.title, "AI Relay roadmap");
  assert.equal(result.url, "https://chatgpt.com/c/example");
  assert.deepEqual(
    result.messages.map(({ role }) => role),
    ["user", "assistant", "user"]
  );
  assert.deepEqual(
    result.messages.map(({ content }) => content),
    [
      "Goal: Prepare the first browser alpha.",
      "Decision: Keep the extension local-first.",
      "Todo: Add the Gemini adapter next."
    ]
  );
});

test("ChatGPT fixture documents expected stable selector roles", async () => {
  const fixture = await readFile(
    new URL("./fixtures/chatgpt/basic.html", import.meta.url),
    "utf8"
  );

  assert.match(fixture, /data-message-author-role="user"/);
  assert.match(fixture, /data-message-author-role="assistant"/);
  assert.match(fixture, /data-testid="conversation-title"/);
});
