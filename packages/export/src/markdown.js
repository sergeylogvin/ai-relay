function addList(lines, heading, values) {
  if (!Array.isArray(values) || values.length === 0) return;

  lines.push(`## ${heading}`, "");
  for (const value of values) {
    lines.push(`- ${value}`);
  }
  lines.push("");
}

export function renderHandoffMarkdown({ conversation, handoff }) {
  if (!conversation || typeof conversation !== "object") {
    throw new TypeError("conversation is required.");
  }

  const lines = [
    "# AI Relay Handoff",
    "",
    `Provider: ${conversation.provider ?? "unknown"}`,
    `Title: ${conversation.title ?? "Untitled conversation"}`,
    conversation.url ? `Source: ${conversation.url}` : null,
    ""
  ].filter((value) => value !== null);

  if (handoff?.goal) {
    lines.push("## Goal", "", handoff.goal, "");
  }

  if (handoff?.currentTask) {
    lines.push("## Current task", "", handoff.currentTask, "");
  }

  addList(lines, "Constraints", handoff?.constraints);
  addList(lines, "Decisions", handoff?.decisions);
  addList(lines, "Completed work", handoff?.completedWork);
  addList(lines, "Pending tasks", handoff?.pendingTasks);
  addList(lines, "References", handoff?.references);
  addList(lines, "Files to reattach", handoff?.fileReferences);
  addList(lines, "Notes", handoff?.notes);

  lines.push("## Conversation", "");

  for (const message of conversation.messages ?? []) {
    lines.push(
      `### ${String(message.role ?? "unknown").toUpperCase()}`,
      "",
      String(message.content ?? "").trim(),
      ""
    );
  }

  lines.push(
    "## Continuation instruction",
    "",
    "Continue from this context. Preserve prior decisions and constraints. Ask before assuming missing facts.",
    ""
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
