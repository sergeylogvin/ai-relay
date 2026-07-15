import { resolveHandoffInboxPath } from "./handoff-inbox.mjs";
import {
  resolvePasteRequestPath,
  writePasteRequest
} from "./paste-request.mjs";

export async function persistHandoffWithOptionalPasteRequest(
  recordInput,
  inboxPath = resolveHandoffInboxPath()
) {
  const { writeHandoffInbox } = await import("./handoff-inbox.mjs");
  const record = await writeHandoffInbox(recordInput, inboxPath);
  const metadata = recordInput.metadata ?? {};

  if (metadata.pasteRequested) {
    await writePasteRequest(
      {
        storedAt: record.storedAt,
        targetApp: metadata.targetApp ?? "front"
      },
      resolvePasteRequestPath()
    );
  }

  return record;
}
