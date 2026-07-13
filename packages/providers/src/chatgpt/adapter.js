import { CHATGPT_SELECTORS } from "./selectors.js";

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

function extractContent(element) {
  const contentElement =
    firstMatchingElement(element, CHATGPT_SELECTORS.messageContent) ?? element;

  return normalizeText(
    contentElement.innerText ?? contentElement.textContent
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

export class ChatGPTAdapter {
  id = "chatgpt";

  matches(input) {
    const hostname =
      typeof input === "string"
        ? new URL(input).hostname
        : input?.hostname ?? "";

    return hostname === "chatgpt.com";
  }

  capabilities() {
    return Object.freeze({
      readConversation: true,
      insertContext: false,
      uploadFiles: false,
      readLimits: false
    });
  }

  readConversation(root = document) {
    const conversationRoot =
      firstMatchingElement(root, CHATGPT_SELECTORS.conversationRoot) ?? root;

    const candidates = [
      ...allMatchingElements(
        conversationRoot,
        CHATGPT_SELECTORS.userMessage
      ).map((element) => ({ role: "user", element })),
      ...allMatchingElements(
        conversationRoot,
        CHATGPT_SELECTORS.assistantMessage
      ).map((element) => ({ role: "assistant", element }))
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
          id: `chatgpt-message-${index + 1}`,
          role,
          content: extractContent(element)
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

  readTitle(root = document) {
    const titleElement = firstMatchingElement(
      root,
      CHATGPT_SELECTORS.conversationTitle
    );

    const title = normalizeText(
      titleElement?.innerText ?? titleElement?.textContent
    );

    if (title) return title;

    return normalizeText(root.title) || "Untitled ChatGPT conversation";
  }
}
