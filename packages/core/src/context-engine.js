import { DomainValidationError } from "./errors.js";

const VALID_ROLES = new Set(["user", "assistant", "system"]);

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainValidationError(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function normalizeMessage(message, index) {
  if (!message || typeof message !== "object") {
    throw new DomainValidationError(`messages[${index}] must be an object.`);
  }

  const role = String(message.role ?? "").toLowerCase();
  if (!VALID_ROLES.has(role)) {
    throw new DomainValidationError(
      `messages[${index}].role must be user, assistant, or system.`,
    );
  }

  assertNonEmptyString(message.content, `messages[${index}].content`);

  return Object.freeze({
    id:
      typeof message.id === "string" && message.id.trim() !== ""
        ? message.id
        : `message-${index + 1}`,
    role,
    content: normalizeWhitespace(message.content),
    createdAt:
      typeof message.createdAt === "string" ? message.createdAt : null,
  });
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values ?? []) {
    if (typeof value !== "string") continue;

    const normalized = normalizeWhitespace(value);
    if (normalized === "") continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function extractTaggedLines(messages, tag) {
  const prefix = `${tag.toLowerCase()}:`;

  return uniqueStrings(
    messages.flatMap(({ content }) =>
      content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.toLowerCase().startsWith(prefix))
        .map((line) => line.slice(prefix.length).trim()),
    ),
  );
}

function pickLatestUserMessage(messages) {
  return [...messages]
    .reverse()
    .find(({ role }) => role === "user")?.content ?? "";
}

function pickGoal(messages, fallback) {
  const taggedGoals = extractTaggedLines(messages, "goal");
  return taggedGoals.at(-1) ?? fallback ?? "";
}

function pickCurrentTask(messages, fallback) {
  const taggedTasks = extractTaggedLines(messages, "task");
  return taggedTasks.at(-1) ?? fallback ?? pickLatestUserMessage(messages);
}

function buildRecentTranscript(messages, limit) {
  return messages.slice(-limit).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export class ContextEngine {
  constructor({ recentMessageLimit = 8 } = {}) {
    if (!Number.isInteger(recentMessageLimit) || recentMessageLimit < 1) {
      throw new DomainValidationError(
        "recentMessageLimit must be a positive integer.",
      );
    }

    this.recentMessageLimit = recentMessageLimit;
  }

  normalizeMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new DomainValidationError(
        "messages must be a non-empty array.",
      );
    }

    return Object.freeze(messages.map(normalizeMessage));
  }

  createSnapshot({
    projectId,
    provider,
    messages,
    previousState = {},
    capturedAt = new Date().toISOString(),
  }) {
    assertNonEmptyString(projectId, "projectId");
    assertNonEmptyString(provider, "provider");

    const normalizedMessages = this.normalizeMessages(messages);

    const decisions = uniqueStrings([
      ...(previousState.decisions ?? []),
      ...extractTaggedLines(normalizedMessages, "decision"),
    ]);

    const constraints = uniqueStrings([
      ...(previousState.constraints ?? []),
      ...extractTaggedLines(normalizedMessages, "constraint"),
    ]);

    const pendingTasks = uniqueStrings([
      ...(previousState.pendingTasks ?? []),
      ...extractTaggedLines(normalizedMessages, "todo"),
    ]);

    const completedWork = uniqueStrings([
      ...(previousState.completedWork ?? []),
      ...extractTaggedLines(normalizedMessages, "done"),
    ]);

    const state = Object.freeze({
      goal: pickGoal(normalizedMessages, previousState.goal),
      currentTask: pickCurrentTask(
        normalizedMessages,
        previousState.currentTask,
      ),
      constraints: Object.freeze(constraints),
      decisions: Object.freeze(decisions),
      completedWork: Object.freeze(completedWork),
      pendingTasks: Object.freeze(pendingTasks),
      references: Object.freeze(
        uniqueStrings(previousState.references ?? []),
      ),
      fileReferences: Object.freeze(
        uniqueStrings(previousState.fileReferences ?? []),
      ),
      notes: Object.freeze(uniqueStrings(previousState.notes ?? [])),
    });

    return Object.freeze({
      schemaVersion: 1,
      projectId,
      provider: provider.toLowerCase(),
      capturedAt,
      messageCount: normalizedMessages.length,
      recentMessages: Object.freeze(
        buildRecentTranscript(
          normalizedMessages,
          this.recentMessageLimit,
        ),
      ),
      state,
    });
  }

  createHandoff(snapshot, { targetProvider = null } = {}) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new DomainValidationError("snapshot must be an object.");
    }

    assertNonEmptyString(snapshot.projectId, "snapshot.projectId");

    const state = snapshot.state ?? {};

    return Object.freeze({
      schemaVersion: 1,
      projectId: snapshot.projectId,
      sourceProvider: snapshot.provider ?? "unknown",
      targetProvider:
        typeof targetProvider === "string" && targetProvider.trim() !== ""
          ? targetProvider.toLowerCase()
          : null,
      createdAt: new Date().toISOString(),
      goal: state.goal ?? "",
      currentTask: state.currentTask ?? "",
      constraints: Object.freeze([...(state.constraints ?? [])]),
      decisions: Object.freeze([...(state.decisions ?? [])]),
      completedWork: Object.freeze([...(state.completedWork ?? [])]),
      pendingTasks: Object.freeze([...(state.pendingTasks ?? [])]),
      references: Object.freeze([...(state.references ?? [])]),
      fileReferences: Object.freeze([...(state.fileReferences ?? [])]),
      notes: Object.freeze([...(state.notes ?? [])]),
      recentMessages: Object.freeze([...(snapshot.recentMessages ?? [])]),
    });
  }
}

export function formatContextHandoff(handoff) {
  if (!handoff || typeof handoff !== "object") {
    throw new DomainValidationError("handoff must be an object.");
  }

  const sections = [
    ["PROJECT", handoff.projectId],
    ["SOURCE PROVIDER", handoff.sourceProvider],
    ["TARGET PROVIDER", handoff.targetProvider],
    ["GOAL", handoff.goal],
    ["CURRENT TASK", handoff.currentTask],
  ];

  const lines = [
    "# AI Relay Handoff",
    "",
    ...sections.flatMap(([heading, value]) =>
      value ? [`## ${heading}`, "", String(value), ""] : [],
    ),
  ];

  const listSections = [
    ["CONSTRAINTS", handoff.constraints],
    ["DECISIONS", handoff.decisions],
    ["COMPLETED WORK", handoff.completedWork],
    ["PENDING TASKS", handoff.pendingTasks],
    ["REFERENCES", handoff.references],
    ["FILES TO REATTACH", handoff.fileReferences],
    ["NOTES", handoff.notes],
  ];

  for (const [heading, items] of listSections) {
    if (!Array.isArray(items) || items.length === 0) continue;

    lines.push(`## ${heading}`, "");
    lines.push(...items.map((item) => `- ${item}`), "");
  }

  if (Array.isArray(handoff.recentMessages) && handoff.recentMessages.length > 0) {
    lines.push("## RECENT CONTEXT", "");

    for (const message of handoff.recentMessages) {
      lines.push(
        `### ${String(message.role).toUpperCase()}`,
        "",
        String(message.content),
        "",
      );
    }
  }

  lines.push(
    "## CONTINUATION INSTRUCTION",
    "",
    "Continue from this context. Preserve the listed decisions and constraints. Do not assume missing facts.",
    "",
  );

  return lines.join("\n").trim();
}
