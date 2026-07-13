import { optionalString, stringArray } from "./validation.js";

export function createProjectState(input = {}) {
  return Object.freeze({
    goal: optionalString(input.goal, "goal"),
    currentTask: optionalString(input.currentTask, "currentTask"),
    constraints: Object.freeze(stringArray(input.constraints, "constraints")),
    decisions: Object.freeze(stringArray(input.decisions, "decisions")),
    completedWork: Object.freeze(stringArray(input.completedWork, "completedWork")),
    pendingTasks: Object.freeze(stringArray(input.pendingTasks, "pendingTasks")),
    references: Object.freeze(stringArray(input.references, "references")),
    fileReferences: Object.freeze(stringArray(input.fileReferences, "fileReferences")),
    notes: Object.freeze(stringArray(input.notes, "notes"))
  });
}
