function addSection(lines, heading, value) {
  if (!value) return;

  if (Array.isArray(value)) {
    if (value.length === 0) return;

    lines.push(`## ${heading}`, "");

    for (const item of value) {
      lines.push(`- ${item}`);
    }

    lines.push("");
    return;
  }

  lines.push(`## ${heading}`, "", String(value), "");
}

export function createContinuationPrompt(envelope) {
  const lines = [
    "# Continue this AI Relay handoff",
    "",
    `Original provider: ${envelope.source.provider}`,
    `Original title: ${envelope.source.title}`,
    envelope.source.url ? `Source URL: ${envelope.source.url}` : null,
    ""
  ].filter((value) => value !== null);

  const handoff = envelope.handoff ?? {};

  addSection(lines, "Goal", handoff.goal);
  addSection(lines, "Current task", handoff.currentTask);
  addSection(lines, "Constraints", handoff.constraints);
  addSection(lines, "Decisions", handoff.decisions);
  addSection(lines, "Completed work", handoff.completedWork);
  addSection(lines, "Pending tasks", handoff.pendingTasks);
  addSection(lines, "References", handoff.references);
  addSection(lines, "Files to reattach", handoff.fileReferences);
  addSection(lines, "Notes", handoff.notes);

  lines.push("## Conversation context", "");

  for (const message of envelope.conversation.messages) {
    lines.push(
      `### ${message.role.toUpperCase()}`,
      "",
      message.content.trim(),
      ""
    );
  }

  lines.push(
    "## Instruction",
    "",
    "Continue from this context. Preserve established decisions and constraints. Do not claim access to files that were not reattached. Ask before assuming missing facts.",
    ""
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
