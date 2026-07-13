import { randomUUID } from "node:crypto";
import { createProjectState } from "./project-state.js";
import { isoDate, requireNonEmptyString } from "./validation.js";

export function createSnapshot(input) {
  return Object.freeze({
    id: input?.id ?? randomUUID(),
    projectId: requireNonEmptyString(input?.projectId, "projectId"),
    sessionId: input?.sessionId ?? null,
    sequence: Number.isInteger(input?.sequence) && input.sequence > 0 ? input.sequence : 1,
    createdAt: isoDate(input?.createdAt, "createdAt"),
    state: createProjectState(input?.state)
  });
}
