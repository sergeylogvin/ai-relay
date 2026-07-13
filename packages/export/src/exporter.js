import { createExportEnvelope } from "./schema.js";
import { serializeDeterministically } from "./serialize.js";
import { sha256 } from "./checksum.js";
import { renderHandoffMarkdown } from "./markdown.js";

export class ExportEngine {
  async create({
    conversation,
    handoff = null,
    createdAt = new Date().toISOString()
  }) {
    const envelope = createExportEnvelope({
      conversation,
      handoff,
      createdAt
    });

    const json = serializeDeterministically(envelope);
    const markdown = renderHandoffMarkdown({
      conversation,
      handoff
    });
    const checksum = await sha256(json);

    return Object.freeze({
      schemaVersion: envelope.schemaVersion,
      createdAt,
      files: Object.freeze({
        "capture.json": json,
        "handoff.md": `${markdown}\n`,
        "checksum.sha256": `${checksum}  capture.json\n`
      }),
      checksum
    });
  }
}
