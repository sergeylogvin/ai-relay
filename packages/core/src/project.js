import { randomUUID } from "node:crypto";
import { createProjectState } from "./project-state.js";
import { isoDate, optionalString, requireNonEmptyString } from "./validation.js";

export const PROJECT_CLASSIFICATIONS = Object.freeze([
  "personal",
  "work",
  "confidential"
]);

export function createProject(input) {
  const classification = input?.classification ?? "personal";
  if (!PROJECT_CLASSIFICATIONS.includes(classification)) {
    throw new TypeError(`Unsupported project classification: ${classification}`);
  }

  const createdAt = isoDate(input?.createdAt, "createdAt");

  return Object.freeze({
    id: input?.id ?? randomUUID(),
    name: requireNonEmptyString(input?.name, "name"),
    description: optionalString(input?.description, "description"),
    classification,
    createdAt,
    updatedAt: isoDate(input?.updatedAt ?? createdAt, "updatedAt"),
    currentState: createProjectState(input?.currentState),
    snapshotIds: Object.freeze([...(input?.snapshotIds ?? [])])
  });
}

export function updateProjectState(project, nextState, updatedAt = new Date()) {
  return Object.freeze({
    ...project,
    currentState: createProjectState(nextState),
    updatedAt: isoDate(updatedAt, "updatedAt")
  });
}
