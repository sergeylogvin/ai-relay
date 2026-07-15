import { renderHandoffMarkdown } from "./markdown.js";

export const EXPORT_HANDOFF_MODES = Object.freeze([
  "full",
  "recent",
  "context-pack"
]);

function renderStructuredSections(handoff) {
  const lines = [];

  if (handoff?.goal) {
    lines.push("## Goal", "", handoff.goal, "");
  }

  if (handoff?.currentTask) {
    lines.push("## Current task", "", handoff.currentTask, "");
  }

  const listSections = [
    ["Constraints", handoff?.constraints],
    ["Decisions", handoff?.decisions],
    ["Completed work", handoff?.completedWork],
    ["Pending tasks", handoff?.pendingTasks],
    ["References", handoff?.references],
    ["Files to reattach", handoff?.fileReferences],
    ["Notes", handoff?.notes]
  ];

  for (const [heading, values] of listSections) {
    if (!Array.isArray(values) || values.length === 0) continue;

    lines.push(`## ${heading}`, "");
    for (const value of values) {
      lines.push(`- ${value}`);
    }
    lines.push("");
  }

  return lines;
}

function renderConversationSection(messages) {
  const lines = ["## Conversation", ""];

  for (const message of messages ?? []) {
    lines.push(
      `### ${String(message.role ?? "unknown").toUpperCase()}`,
      "",
      String(message.content ?? "").trim(),
      ""
    );
  }

  return lines;
}

function renderContinuationInstruction(mode) {
  const instruction =
    mode === "context-pack"
      ? "Continue from this project context. Preserve listed decisions and constraints. Ask before assuming missing facts."
      : "Continue from this context. Preserve prior decisions and constraints. Ask before assuming missing facts.";

  return ["## Continuation instruction", "", instruction, ""];
}

function renderHeader({ conversation, mode }) {
  const modeLabel =
    mode === "full"
      ? "full transcript"
      : mode === "recent"
        ? "recent messages"
        : "context pack";

  return [
    "# AI Relay Handoff",
    "",
    `Provider: ${conversation.provider ?? "unknown"}`,
    `Title: ${conversation.title ?? "Untitled conversation"}`,
    conversation.url ? `Source: ${conversation.url}` : null,
    `Handoff mode: ${modeLabel}`,
    ""
  ].filter((value) => value !== null);
}

export function renderHandoffByMode({
  conversation,
  handoff,
  mode = "full",
  recentMessageLimit = 12
}) {
  if (!EXPORT_HANDOFF_MODES.includes(mode)) {
    throw new TypeError(`Unsupported handoff mode: ${mode}`);
  }

  if (!conversation || typeof conversation !== "object") {
    throw new TypeError("conversation is required.");
  }

  if (mode === "full") {
    return renderHandoffMarkdown({ conversation, handoff });
  }

  const lines = [
    ...renderHeader({ conversation, mode }),
    ...renderStructuredSections(handoff)
  ];

  if (mode === "recent") {
    const messages = (conversation.messages ?? []).slice(-recentMessageLimit);
    lines.push(...renderConversationSection(messages));
  }

  lines.push(...renderContinuationInstruction(mode));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function estimateHandoffCharacters(markdown) {
  return String(markdown ?? "").length;
}
