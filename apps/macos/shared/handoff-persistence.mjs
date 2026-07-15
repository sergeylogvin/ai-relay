import { resolveHandoffInboxPath } from "./handoff-inbox.mjs";
import {
  clearPasteRequest,
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
  const pasteRequestPath = resolvePasteRequestPath();

  if (metadata.pasteRequested) {
    await writePasteRequest(
      {
        storedAt: record.storedAt,
        targetApp: metadata.targetApp ?? "front"
      },
      pasteRequestPath
    );
  } else {
    await clearPasteRequest(pasteRequestPath);
  }

  return record;
}
