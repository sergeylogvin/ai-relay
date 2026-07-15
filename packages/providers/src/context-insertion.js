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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPasteHtml(value) {
  return value
    .split("\n")
    .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
    .join("");
}

function countNewlines(text) {
  return (String(text).match(/\n/g) ?? []).length;
}

function verifyMultilineInsert(element, value) {
  const read = readComposerValue(element);

  if (read.trim().length === 0) {
    return false;
  }

  if (!value.includes("\n")) {
    return true;
  }

  if (countNewlines(read) >= 1) {
    return true;
  }

  const paragraphs = element.querySelectorAll?.("p")?.length ?? 0;
  const breaks = element.querySelectorAll?.("br")?.length ?? 0;

  if (paragraphs >= 2) {
    return true;
  }

  if (breaks >= 1 && value.split("\n").length >= 2) {
    return true;
  }

  return false;
}

function tryBeforeInputPaste(element, value, root) {
  const InputEventCtor = root.defaultView?.InputEvent;

  if (typeof InputEventCtor !== "function") {
    return false;
  }

  focusContentEditableEnd(element, root);

  element.dispatchEvent(
    new InputEventCtor("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertFromPaste",
      data: value
    })
  );

  return verifyMultilineInsert(element, value);
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
  dataTransfer.setData("text/html", buildPasteHtml(value));

  const pasteEvent = new ClipboardEventCtor("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer
  });

  element.dispatchEvent(pasteEvent);
  return verifyMultilineInsert(element, value);
}

function tryInsertHtml(element, value, root) {
  const execDocument = execDocumentFor(element, root);

  if (typeof execDocument?.execCommand !== "function") {
    return false;
  }

  focusContentEditableEnd(element, root);

  try {
    if (
      execDocument.execCommand("insertHTML", false, buildPasteHtml(value)) &&
      verifyMultilineInsert(element, value)
    ) {
      dispatchInputEvent(element, root, "insertFromPaste", value);
      return true;
    }
  } catch {
    // Fall through to other strategies.
  }

  return false;
}

function tryDomParagraphInsert(element, value, root) {
  const document =
    element.ownerDocument ?? root.defaultView?.document ?? root;

  if (typeof document.createElement !== "function") {
    return false;
  }

  if (typeof element.appendChild !== "function") {
    return false;
  }

  focusContentEditableEnd(element, root);

  if (typeof element.replaceChildren === "function") {
    element.replaceChildren();
  } else {
    element.textContent = "";
  }

  for (const line of value.split("\n")) {
    const paragraph = document.createElement("p");
    if (line) {
      paragraph.textContent = line;
    }
    element.appendChild(paragraph);
  }

  dispatchInputEvent(element, root, "insertFromPaste", value);
  return verifyMultilineInsert(element, value);
}

function dispatchEnter(element, root) {
  const KeyboardEventCtor = root.defaultView?.KeyboardEvent;

  if (typeof KeyboardEventCtor !== "function") {
    return false;
  }

  const init = {
    bubbles: true,
    cancelable: true,
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13
  };

  for (const type of ["keydown", "keypress", "keyup"]) {
    const event = new KeyboardEventCtor(type, init);
    element.dispatchEvent(event);

    if (type === "keydown" && event.defaultPrevented) {
      return true;
    }
  }

  return false;
}

function tryKeyboardLineByLineInsert(element, value, root) {
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
      if (dispatchEnter(element, root)) {
        continue;
      }

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
  return verifyMultilineInsert(element, value);
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
  return verifyMultilineInsert(element, value);
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

  if (isMultiline && tryBeforeInputPaste(target, value, root)) {
    return;
  }

  if (isMultiline && trySyntheticPaste(target, value, root)) {
    return;
  }

  if (isMultiline && tryInsertHtml(target, value, root)) {
    return;
  }

  if (isMultiline && tryDomParagraphInsert(target, value, root)) {
    return;
  }

  if (isMultiline && tryKeyboardLineByLineInsert(target, value, root)) {
    return;
  }

  if (isMultiline && tryLineByLineInsert(target, value, root)) {
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
