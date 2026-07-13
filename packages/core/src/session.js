import { randomUUID } from "node:crypto";
import { isoDate, optionalString, requireNonEmptyString } from "./validation.js";

export function createSession(input) {
  return Object.freeze({
    id: input?.id ?? randomUUID(),
    projectId: requireNonEmptyString(input?.projectId, "projectId"),
    providerId: requireNonEmptyString(input?.providerId, "providerId"),
    title: optionalString(input?.title, "title"),
    sourceUrl: optionalString(input?.sourceUrl, "sourceUrl"),
    startedAt: isoDate(input?.startedAt, "startedAt"),
    endedAt: input?.endedAt ? isoDate(input.endedAt, "endedAt") : null
  });
}
