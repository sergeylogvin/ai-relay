import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ClaudeAdapter } from "../packages/providers/src/claude/adapter.js";

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

test("ClaudeAdapter reports safe context insertion support", () => {
  const adapter = new ClaudeAdapter();

  assert.deepEqual(adapter.capabilities(), {
    readConversation: true,
    insertContext: true,
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

test("ClaudeAdapter finds assistant responses from their action bars", () => {
  const assistantContent = new FakeElement({
    text: "Assistant answer discovered from the action bar.",
    order: 2
  });
  const turn = new FakeElement({
    selectors: { ".prose": assistantContent },
    order: 2
  });
  const actionBar = new FakeElement({ order: 2, parentElement: turn });
  const user = new FakeElement({ text: "User question", order: 1 });
  const main = new FakeElement({
    selectors: {
      '[data-testid*="user-message"]': [user],
      '[role="group"][aria-label="Message actions"]': [actionBar]
    }
  });
  const root = {
    title: "Fallback - Claude",
    location: { href: "https://claude.ai/chat/fallback" },
    querySelector: (selector) => (selector === "main" ? main : null),
    querySelectorAll: () => []
  };

  const result = new ClaudeAdapter().readConversation(root);

  assert.deepEqual(
    result.messages.map(({ role, content }) => [role, content]),
    [
      ["user", "User question"],
      ["assistant", "Assistant answer discovered from the action bar."]
    ]
  );
});

test("ClaudeAdapter keeps one complete assistant turn instead of nested fragments", () => {
  const completeContent = new FakeElement({
    text: "First paragraph.\n\nSecond paragraph.",
    order: 2
  });
  const completeResponse = new FakeElement({
    selectors: { ".prose": completeContent },
    order: 2
  });
  const firstParagraph = new FakeElement({
    text: "First paragraph.",
    order: 2,
    parentElement: completeResponse
  });
  const secondParagraph = new FakeElement({
    text: "Second paragraph.",
    order: 2,
    parentElement: completeResponse
  });
  completeContent.parentElement = completeResponse;

  const user = new FakeElement({ text: "User question", order: 1 });
  const main = new FakeElement({
    selectors: {
      '[data-testid*="user-message"]': [user],
      '[class*="font-claude-response"]': [
        completeResponse,
        firstParagraph,
        secondParagraph
      ]
    }
  });
  const root = {
    title: "Nested fragments - Claude",
    location: { href: "https://claude.ai/chat/nested" },
    querySelector: (selector) => (selector === "main" ? main : null),
    querySelectorAll: () => []
  };

  const result = new ClaudeAdapter().readConversation(root);

  assert.deepEqual(
    result.messages.map(({ role, content }) => [role, content]),
    [
      ["user", "User question"],
      ["assistant", "First paragraph.\n\nSecond paragraph."]
    ]
  );
});

test("ClaudeAdapter keeps assistant content that follows a tool or artifact block", () => {
  const initialBlock = new FakeElement({
    text: "I will create the requested file.",
    order: 2
  });
  const completeTurn = new FakeElement({
    text: [
      "Orchestrated artifact creation",
      "Orchestrated artifact creation",
      "",
      "I will create the requested file.",
      "",
      "The file is ready. Download it above."
    ].join("\n"),
    selectors: { ".prose": initialBlock },
    order: 2
  });
  initialBlock.parentElement = completeTurn;

  const user = new FakeElement({ text: "Create a Markdown file", order: 1 });
  const main = new FakeElement({
    selectors: {
      '[data-testid*="user-message"]': [user],
      '[class*="font-claude-response"]': [completeTurn, initialBlock]
    }
  });
  const root = {
    title: "Artifact response - Claude",
    location: { href: "https://claude.ai/chat/artifact" },
    querySelector: (selector) => (selector === "main" ? main : null),
    querySelectorAll: () => []
  };

  const result = new ClaudeAdapter().readConversation(root);

  assert.equal(result.messages.length, 2);
  assert.equal(
    result.messages[1].content,
    "I will create the requested file.\n\nThe file is ready. Download it above."
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
