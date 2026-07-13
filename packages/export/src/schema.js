export const EXPORT_SCHEMA_VERSION = 1;

export function createExportEnvelope({
  conversation,
  handoff,
  createdAt = new Date().toISOString()
}) {
  if (!conversation || typeof conversation !== "object") {
    throw new TypeError("conversation is required.");
  }

  if (!Array.isArray(conversation.messages)) {
    throw new TypeError("conversation.messages must be an array.");
  }

  return Object.freeze({
    schema: "ai-relay.export",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    createdAt,
    source: Object.freeze({
      provider: conversation.provider ?? "unknown",
      title: conversation.title ?? "Untitled conversation",
      url: conversation.url ?? null
    }),
    conversation: Object.freeze({
      messages: Object.freeze(
        conversation.messages.map((message) =>
          Object.freeze({
            role: message.role,
            content: message.content
          })
        )
      )
    }),
    handoff: handoff ?? null
  });
}
