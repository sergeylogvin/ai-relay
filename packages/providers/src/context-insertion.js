export class ContextComposerNotFoundError extends Error {
  constructor(providerId) {
    super(`No writable ${providerId} composer was found on this page.`);
    this.name = "ContextComposerNotFoundError";
    this.providerId = providerId;
  }
}

export class ContextComposerNotEmptyError extends Error {
  constructor(providerId) {
    super(
      `The ${providerId} composer already contains text. Clear it before inserting a handoff.`
    );
    this.name = "ContextComposerNotEmptyError";
    this.providerId = providerId;
  }
}

function firstMatchingElement(root, selectors) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) return element;
  }

  return null;
}

function dispatchComposerEvent(element, type, root) {
  const EventConstructor = root.defaultView?.Event ?? globalThis.Event;
  element.dispatchEvent(new EventConstructor(type, { bubbles: true }));
}

function setFormControlValue(element, value, root) {
  const view = root.defaultView;
  const prototype =
    element.tagName === "TEXTAREA"
      ? view?.HTMLTextAreaElement?.prototype
      : view?.HTMLInputElement?.prototype;
  const setter = prototype
    ? Object.getOwnPropertyDescriptor(prototype, "value")?.set
    : null;

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
}

function isContentEditable(element) {
  return (
    element.isContentEditable === true ||
    element.getAttribute?.("contenteditable") === "true"
  );
}

function setContentEditableValue(element, value, root) {
  if (
    typeof element.replaceChildren !== "function" ||
    typeof root.createDocumentFragment !== "function" ||
    typeof root.createElement !== "function" ||
    typeof root.createTextNode !== "function"
  ) {
    element.textContent = value;
    return;
  }

  const fragment = root.createDocumentFragment();
  const lines = value.split("\n");

  lines.forEach((line, index) => {
    if (index > 0) fragment.append(root.createElement("br"));
    if (line !== "") fragment.append(root.createTextNode(line));
  });

  element.replaceChildren(fragment);
}

function readComposerValue(element) {
  const tagName = String(element.tagName ?? "").toUpperCase();

  if (tagName === "TEXTAREA" || tagName === "INPUT") {
    return String(element.value ?? "");
  }

  return String(element.innerText ?? element.textContent ?? "");
}

export function insertContextIntoComposer({
  providerId,
  root = document,
  selectors,
  context
}) {
  if (typeof context !== "string" || context.trim() === "") {
    throw new TypeError("Context must be a non-empty string.");
  }

  const composer = firstMatchingElement(root, selectors);

  if (!composer) {
    throw new ContextComposerNotFoundError(providerId);
  }

  if (readComposerValue(composer).trim() !== "") {
    throw new ContextComposerNotEmptyError(providerId);
  }

  const normalizedContext = context.replace(/\r\n/g, "\n");
  const tagName = String(composer.tagName ?? "").toUpperCase();

  composer.focus?.();

  if (tagName === "TEXTAREA" || tagName === "INPUT") {
    setFormControlValue(composer, normalizedContext, root);
  } else if (isContentEditable(composer)) {
    setContentEditableValue(composer, normalizedContext, root);
  } else {
    throw new ContextComposerNotFoundError(providerId);
  }

  dispatchComposerEvent(composer, "input", root);
  dispatchComposerEvent(composer, "change", root);

  return Object.freeze({
    provider: providerId,
    insertedCharacters: normalizedContext.length,
    composerType:
      tagName === "TEXTAREA" || tagName === "INPUT"
        ? tagName.toLowerCase()
        : "contenteditable"
  });
}
