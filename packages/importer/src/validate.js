import { ImportValidationError } from "./errors.js";

const SUPPORTED_SCHEMA = "ai-relay.export";
const SUPPORTED_SCHEMA_VERSION = 1;
const ALLOWED_ROLES = new Set([
  "system",
  "user",
  "assistant",
  "tool"
]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ImportValidationError(`${label} must be an object.`);
  }
}

function validateMessage(message, index) {
  assertObject(message, `conversation.messages[${index}]`);

  if (!ALLOWED_ROLES.has(message.role)) {
    throw new ImportValidationError(
      `conversation.messages[${index}].role is not supported.`,
      {
        index,
        role: message.role
      }
    );
  }

  if (typeof message.content !== "string") {
    throw new ImportValidationError(
      `conversation.messages[${index}].content must be a string.`,
      {
        index
      }
    );
  }

  return Object.freeze({
    role: message.role,
    content: message.content
  });
}

export function validateExportEnvelope(value) {
  assertObject(value, "export");

  if (value.schema !== SUPPORTED_SCHEMA) {
    throw new ImportValidationError(
      `Unsupported export schema: ${String(value.schema)}.`
    );
  }

  if (value.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new ImportValidationError(
      `Unsupported schema version: ${String(value.schemaVersion)}.`,
      {
        supportedVersion: SUPPORTED_SCHEMA_VERSION
      }
    );
  }

  assertObject(value.source, "source");
  assertObject(value.conversation, "conversation");

  if (!Array.isArray(value.conversation.messages)) {
    throw new ImportValidationError(
      "conversation.messages must be an array."
    );
  }

  const messages = value.conversation.messages.map(validateMessage);

  return Object.freeze({
    schema: value.schema,
    schemaVersion: value.schemaVersion,
    createdAt: value.createdAt ?? null,
    source: Object.freeze({
      provider: value.source.provider ?? "unknown",
      title: value.source.title ?? "Untitled conversation",
      url: value.source.url ?? null
    }),
    conversation: Object.freeze({
      messages: Object.freeze(messages)
    }),
    handoff: value.handoff ?? null
  });
}
