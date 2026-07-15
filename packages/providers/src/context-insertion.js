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

function focusContentEditableEnd(element, root) {
  element.focus?.();

  const selection =
    root.getSelection?.() ?? root.defaultView?.getSelection?.() ?? null;
  const document = element.ownerDocument ?? root.defaultView?.document ?? root;
  const createRange = document.createRange ?? root.createRange;

  if (!selection || typeof createRange !== "function") return;

  const range = createRange.call(document);
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function dispatchInputEvent(element, root, inputType, data) {
  const InputEventConstructor =
    root.defaultView?.InputEvent ?? globalThis.InputEvent;

  if (typeof InputEventConstructor !== "function") {
    dispatchComposerEvent(element, "input", root);
    return;
  }

  element.dispatchEvent(
    new InputEventConstructor("input", {
      bubbles: true,
      inputType,
      data
    })
  );
}

function resolveEditableTarget(element) {
  if (element.matches?.('.ProseMirror[contenteditable="true"]')) {
    return element;
  }

  const inner = element.querySelector?.(
    '.ProseMirror[contenteditable="true"]'
  );
  return inner ?? element;
}

function execDocumentFor(element, root) {
  return (
    element.ownerDocument ??
    root.defaultView?.document ??
    root.ownerDocument ??
    null
  );
}

function verifyMultilineInsert(element, value) {
  if (!value.includes("\n")) {
    return readComposerValue(element).trim().length > 0;
  }

  const read = readComposerValue(element);
  if (read.includes("\n")) {
    return true;
  }

  const blockCount =
    element.querySelectorAll?.("p, br, div[data-placeholder]")?.length ?? 0;
  return blockCount > 0 || element.childElementCount > 1;
}

function trySyntheticPaste(element, value, root) {
  const view = root.defaultView ?? globalThis;
  const ClipboardEventCtor = view.ClipboardEvent;
  const DataTransferCtor = view.DataTransfer;

  if (
    typeof ClipboardEventCtor !== "function" ||
    typeof DataTransferCtor !== "function"
  ) {
    return false;
  }

  focusContentEditableEnd(element, root);

  const dataTransfer = new DataTransferCtor();
  dataTransfer.setData("text/plain", value);

  const pasteEvent = new ClipboardEventCtor("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer
  });

  element.dispatchEvent(pasteEvent);
  return readComposerValue(element).trim().length > 0;
}

function tryLineByLineInsert(element, value, root) {
  const execDocument = execDocumentFor(element, root);

  if (typeof execDocument?.execCommand !== "function") {
    return false;
  }

  focusContentEditableEnd(element, root);
  const lines = value.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.length > 0) {
      try {
        if (!execDocument.execCommand("insertText", false, line)) {
          return false;
        }
      } catch {
        return false;
      }
    }

    if (index < lines.length - 1) {
      try {
        const broke =
          execDocument.execCommand("insertParagraph", false) ||
          execDocument.execCommand("insertLineBreak", false);
        if (!broke) {
          return false;
        }
      } catch {
        return false;
      }
    }
  }

  dispatchInputEvent(element, root, "insertFromPaste", value);
  return true;
}

function trySingleLineInsert(element, value, root) {
  const execDocument = execDocumentFor(element, root);

  if (typeof execDocument?.execCommand !== "function") {
    return false;
  }

  focusContentEditableEnd(element, root);

  try {
    if (!execDocument.execCommand("insertText", false, value)) {
      return false;
    }
  } catch {
    return false;
  }

  dispatchInputEvent(element, root, "insertText", value);
  return true;
}

function insertContentEditableValue(element, value, root) {
  const target = resolveEditableTarget(element);
  const isMultiline = value.includes("\n");

  if (!isMultiline && trySingleLineInsert(target, value, root)) {
    return;
  }

  if (
    isMultiline &&
    trySyntheticPaste(target, value, root) &&
    verifyMultilineInsert(target, value)
  ) {
    return;
  }

  if (
    isMultiline &&
    tryLineByLineInsert(target, value, root) &&
    verifyMultilineInsert(target, value)
  ) {
    return;
  }

  setContentEditableValue(target, value, root);
  dispatchComposerEvent(target, "input", root);
  dispatchComposerEvent(target, "change", root);
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
    dispatchComposerEvent(composer, "input", root);
    dispatchComposerEvent(composer, "change", root);
  } else if (isContentEditable(composer)) {
    insertContentEditableValue(composer, normalizedContext, root);
  } else {
    throw new ContextComposerNotFoundError(providerId);
  }

  return Object.freeze({
    provider: providerId,
    insertedCharacters: normalizedContext.length,
    composerType:
      tagName === "TEXTAREA" || tagName === "INPUT"
        ? tagName.toLowerCase()
        : "contenteditable"
  });
}
