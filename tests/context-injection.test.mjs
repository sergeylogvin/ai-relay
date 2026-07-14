import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ContextComposerNotEmptyError,
  ContextComposerNotFoundError,
  ProviderCapabilityError,
  ProviderRegistry,
  defineProviderPlugin,
  insertContextIntoComposer
} from "../packages/providers/src/index.js";

const root = resolve(import.meta.dirname, "..");

function createComposer({
  tagName = "TEXTAREA",
  contentEditable = false
} = {}) {
  const events = [];

  return {
    tagName,
    value: "",
    textContent: "",
    isContentEditable: contentEditable,
    focused: false,
    events,
    focus() {
      this.focused = true;
    },
    getAttribute(name) {
      return name === "contenteditable" && contentEditable ? "true" : null;
    },
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    }
  };
}

function createRoot(composer) {
  return {
    querySelector() {
      return composer;
    }
  };
}

function createPlugin({ insertContext = false } = {}) {
  return defineProviderPlugin({
    id: "example",
    displayName: "Example",
    hosts: ["example.ai"],
    createAdapter: () => ({
      id: "example",
      matches(input) {
        return new URL(input).hostname === "example.ai";
      },
      capabilities() {
        return { readConversation: true, insertContext };
      },
      readConversation() {
        return { provider: "example", messages: [] };
      },
      ...(insertContext
        ? {
            insertContext(context) {
              return { provider: "example", insertedCharacters: context.length };
            }
          }
        : {})
    })
  });
}

test("inserts context into a textarea and dispatches input events", () => {
  const composer = createComposer();
  const result = insertContextIntoComposer({
    providerId: "example",
    root: createRoot(composer),
    selectors: ["textarea"],
    context: "Continue from this handoff."
  });

  assert.equal(composer.value, "Continue from this handoff.");
  assert.equal(composer.focused, true);
  assert.deepEqual(composer.events, ["input", "change"]);
  assert.equal(result.composerType, "textarea");
  assert.equal(result.insertedCharacters, 27);
});

test("inserts context into a contenteditable composer", () => {
  const composer = createComposer({
    tagName: "DIV",
    contentEditable: true
  });

  const result = insertContextIntoComposer({
    providerId: "example",
    root: createRoot(composer),
    selectors: ['[contenteditable="true"]'],
    context: "Portable context"
  });

  assert.equal(composer.textContent, "Portable context");
  assert.equal(result.composerType, "contenteditable");
});

test("rejects missing composers and empty context", () => {
  assert.throws(
    () =>
      insertContextIntoComposer({
        providerId: "example",
        root: { querySelector: () => null },
        selectors: ["textarea"],
        context: "Context"
      }),
    ContextComposerNotFoundError
  );

  assert.throws(
    () =>
      insertContextIntoComposer({
        providerId: "example",
        root: createRoot(createComposer()),
        selectors: ["textarea"],
        context: "   "
      }),
    /non-empty string/
  );
});

test("does not overwrite an existing draft", () => {
  const composer = createComposer();
  composer.value = "Unsent draft";

  assert.throws(
    () =>
      insertContextIntoComposer({
        providerId: "example",
        root: createRoot(composer),
        selectors: ["textarea"],
        context: "Handoff"
      }),
    ContextComposerNotEmptyError
  );

  assert.equal(composer.value, "Unsent draft");
  assert.deepEqual(composer.events, []);
});

test("registry delegates insertion and rejects unsupported providers", () => {
  const supported = new ProviderRegistry([
    createPlugin({ insertContext: true })
  ]);
  const result = supported.insertContext(
    "https://example.ai/chat/1",
    "Handoff",
    {}
  );

  assert.equal(result.insertedCharacters, 7);

  const unsupported = new ProviderRegistry([createPlugin()]);
  assert.throws(
    () =>
      unsupported.insertContext(
        "https://example.ai/chat/1",
        "Handoff",
        {}
      ),
    ProviderCapabilityError
  );
});

test("capability validation requires an insertion implementation", () => {
  assert.throws(
    () =>
      defineProviderPlugin({
        id: "broken",
        displayName: "Broken",
        hosts: ["broken.ai"],
        createAdapter: () => ({
          id: "broken",
          matches: () => true,
          capabilities: () => ({
            readConversation: true,
            insertContext: true
          }),
          readConversation: () => ({ provider: "broken", messages: [] })
        })
      }).createAdapter(),
    /does not implement insertContext/
  );
});

test("browser integration inserts but never sends context", async () => {
  const [contentScript, popup, popupHtml] = await Promise.all([
    readFile(resolve(root, "apps/browser/src/content-script.js"), "utf8"),
    readFile(resolve(root, "apps/browser/src/popup.js"), "utf8"),
    readFile(resolve(root, "apps/browser/src/popup.html"), "utf8")
  ]);

  assert.match(contentScript, /AI_RELAY_INSERT_CONTEXT/);
  assert.match(contentScript, /registry\.insertContext/);
  assert.match(popup, /AI_RELAY_INSERT_CONTEXT/);
  assert.match(popupHtml, /id="insertContextButton"/);
  assert.doesNotMatch(contentScript, /\.click\(\)|requestSubmit|\.submit\(/);
});
