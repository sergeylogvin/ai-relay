import { randomUUID } from "node:crypto";
import { createProjectState } from "./project-state.js";
import { isoDate, optionalString, requireNonEmptyString, stringArray } from "./validation.js";

export const HANDOFF_MODES = Object.freeze(["safe", "recent", "full"]);

export function createHandoff(input) {
  const mode = input?.mode ?? "safe";
  if (!HANDOFF_MODES.includes(mode)) {
    throw new TypeError(`Unsupported handoff mode: ${mode}`);
  }

  return Object.freeze({
    id: input?.id ?? randomUUID(),
    projectId: requireNonEmptyString(input?.projectId, "projectId"),
    sourceProviderId: requireNonEmptyString(input?.sourceProviderId, "sourceProviderId"),
    targetProviderId: requireNonEmptyString(input?.targetProviderId, "targetProviderId"),
    mode,
    createdAt: isoDate(input?.createdAt, "createdAt"),
    state: createProjectState(input?.state),
    recentMessages: Object.freeze(stringArray(input?.recentMessages, "recentMessages")),
    safetyNotice: optionalString(input?.safetyNotice, "safetyNotice")
  });
}

export function formatHandoffMarkdown(handoff) {
  const sections = [
    ["Goal", handoff.state.goal],
    ["Current task", handoff.state.currentTask],
    ["Constraints", handoff.state.constraints],
    ["Decisions", handoff.state.decisions],
    ["Completed work", handoff.state.completedWork],
    ["Pending tasks", handoff.state.pendingTasks],
    ["References", handoff.state.references],
    ["Files to attach", handoff.state.fileReferences],
    ["Notes", handoff.state.notes],
    ["Recent messages", handoff.recentMessages]
  ];

  const body = sections
    .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value)))
    .map(([title, value]) => {
      if (Array.isArray(value)) {
        return `## ${title}\n${value.map((item) => `- ${item}`).join("\n")}`;
      }
      return `## ${title}\n${value}`;
    })
    .join("\n\n");

  return [
    "# AI Relay Handoff",
    `Source: ${handoff.sourceProviderId}`,
    `Target: ${handoff.targetProviderId}`,
    `Mode: ${handoff.mode}`,
    handoff.safetyNotice ? `Safety notice: ${handoff.safetyNotice}` : "",
    body,
    "Continue the work from this state. Preserve existing decisions and constraints unless explicitly asked to change them."
  ]
    .filter(Boolean)
    .join("\n\n");
}
