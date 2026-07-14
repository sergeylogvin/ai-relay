import { GEMINI_SELECTORS } from "./selectors.js";
import { insertContextIntoComposer } from "../context-insertion.js";

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const GEMINI_SPEAKER_LABELS = Object.freeze({
  user: Object.freeze(["You said"]),
  assistant: Object.freeze(["Gemini said"])
});

const GENERIC_GEMINI_TITLES = new Set([
  "Gemini",
  "Google Gemini",
  "Conversation with Gemini",
  "New chat",
  "New chat - Gemini"
]);

function normalizeDocumentTitle(value) {
  return normalizeText(value)
    .replace(/\s*[-–—]\s*(?:Google\s+)?Gemini\s*$/i, "")
    .trim();
}

function stripLeadingSpeakerLabel(value, role) {
  const text = normalizeText(value);
  const labels = GEMINI_SPEAKER_LABELS[role] ?? [];

  for (const label of labels) {
    if (text === label) return "";

    const prefix = `${label}\n`;
    if (text.startsWith(prefix)) {
      return normalizeText(text.slice(prefix.length));
    }
  }

  return text;
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
    firstMatchingElement(element, GEMINI_SELECTORS.messageContent) ?? element;

  return stripLeadingSpeakerLabel(
    contentElement.innerText ?? contentElement.textContent,
    role
  );
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

export class GeminiAdapter {
  id = "gemini";

  matches(input) {
    const hostname =
      typeof input === "string"
        ? new URL(input).hostname
        : input?.hostname ?? "";

    return hostname === "gemini.google.com";
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
      firstMatchingElement(root, GEMINI_SELECTORS.conversationRoot) ?? root;

    const userElements = removeNestedElements(
      allMatchingElements(
        conversationRoot,
        GEMINI_SELECTORS.userMessage
      )
    );
    const assistantElements = removeNestedElements(
      allMatchingElements(
        conversationRoot,
        GEMINI_SELECTORS.assistantMessage
      )
    );

    const candidates = [
      ...userElements.map((element) => ({ role: "user", element })),
      ...assistantElements.map((element) => ({ role: "assistant", element }))
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
          id: `gemini-message-${index + 1}`,
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
      selectors: GEMINI_SELECTORS.composer,
      context
    });
  }

  readTitle(root = document) {
    const titleElement = firstMatchingElement(
      root,
      GEMINI_SELECTORS.conversationTitle
    );

    const title = normalizeText(
      titleElement?.innerText ?? titleElement?.textContent
    );

    if (title && !GENERIC_GEMINI_TITLES.has(title)) return title;

    const documentTitle = normalizeDocumentTitle(root.title);
    if (
      documentTitle &&
      !GENERIC_GEMINI_TITLES.has(documentTitle)
    ) {
      return documentTitle;
    }

    return "Untitled Gemini conversation";
  }
}
