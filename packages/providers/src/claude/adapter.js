import { CLAUDE_SELECTORS } from "./selectors.js";
import { insertContextIntoComposer } from "../context-insertion.js";

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatchingElement(root, selectors) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) return element;
  }

  return null;
}

function allMatchingElements(root, selectors) {
  const result = [];
  const seen = new Set();

  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      if (seen.has(element)) continue;
      seen.add(element);
      result.push(element);
    }
  }

  result.sort((left, right) => {
    if (left === right) return 0;

    const relation = left.compareDocumentPosition(right);
    if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  return result;
}

function extractContent(element, role) {
  const contentElement =
    firstMatchingElement(element, CLAUDE_SELECTORS.messageContent) ?? element;
  const nestedContent = normalizeText(
    contentElement.innerText ?? contentElement.textContent
  );

  if (role === "assistant") {
    const completeTurn = normalizeText(
      element.innerText ?? element.textContent
    );

    if (completeTurn.length > nestedContent.length) return completeTurn;
  }

  return nestedContent;
}

function findAssistantContentFromActionBar(actionBar, conversationRoot) {
  let candidate = actionBar?.parentElement ?? null;

  while (candidate && candidate !== conversationRoot) {
    const contentElement = firstMatchingElement(
      candidate,
      CLAUDE_SELECTORS.messageContent
    );

    if (contentElement) return contentElement;
    candidate = candidate.parentElement;
  }

  return null;
}

function removeNestedElements(elements) {
  return elements.filter(
    (element) =>
      !elements.some(
        (candidate) =>
          candidate !== element && candidate.contains?.(element)
      )
  );
}

function deduplicateMessages(messages) {
  const seen = new Set();
  const result = [];

  for (const message of messages) {
    const key = `${message.role}:${message.content}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(message);
  }

  return result;
}

export class ClaudeAdapter {
  id = "claude";

  matches(input) {
    const hostname =
      typeof input === "string"
        ? new URL(input).hostname
        : input?.hostname ?? "";

    return hostname === "claude.ai";
  }

  capabilities() {
    return Object.freeze({
      readConversation: true,
      insertContext: true,
      uploadFiles: false,
      readLimits: false
    });
  }

  readConversation(root = document) {
    const conversationRoot =
      firstMatchingElement(root, CLAUDE_SELECTORS.conversationRoot) ?? root;

    const assistantFallbacks = allMatchingElements(
      conversationRoot,
      CLAUDE_SELECTORS.assistantActionBar
    )
      .map((actionBar) =>
        findAssistantContentFromActionBar(actionBar, conversationRoot)
      )
      .filter(Boolean);

    const userElements = removeNestedElements(
      allMatchingElements(conversationRoot, CLAUDE_SELECTORS.userMessage)
    );
    const assistantElements = removeNestedElements([
      ...allMatchingElements(
        conversationRoot,
        CLAUDE_SELECTORS.assistantMessage
      ),
      ...assistantFallbacks
    ]);

    const candidates = [
      ...userElements.map((element) => ({ role: "user", element })),
      ...assistantElements.map((element) => ({
        role: "assistant",
        element
      }))
    ];

    candidates.sort((left, right) => {
      if (left.element === right.element) return 0;

      const relation = left.element.compareDocumentPosition(
        right.element
      );

      if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const messages = deduplicateMessages(
      candidates
        .map(({ role, element }, index) => ({
          id: `claude-message-${index + 1}`,
          role,
          content: extractContent(element, role)
        }))
        .filter(({ content }) => content !== "")
    );

    return Object.freeze({
      provider: this.id,
      title: this.readTitle(root),
      url: root.location?.href ?? null,
      messages: Object.freeze(messages)
    });
  }

  insertContext(context, root = document) {
    return insertContextIntoComposer({
      providerId: this.id,
      root,
      selectors: CLAUDE_SELECTORS.composer,
      context
    });
  }

  readTitle(root = document) {
    const titleElement = firstMatchingElement(
      root,
      CLAUDE_SELECTORS.conversationTitle
    );

    const title = normalizeText(
      titleElement?.innerText ?? titleElement?.textContent
    );

    if (title) return title;

    return normalizeText(root.title) || "Untitled Claude conversation";
  }
}
