import { sha256 } from "../../export/src/checksum.js";
import { ImportValidationError } from "./errors.js";
import { createContinuationPrompt } from "./prompt.js";
import { validateExportEnvelope } from "./validate.js";

function parseChecksumLine(value) {
  const match = String(value ?? "")
    .trim()
    .match(/^([a-f0-9]{64})\s+\*?capture\.json$/i);

  return match?.[1]?.toLowerCase() ?? null;
}

export class ImportEngine {
  async import({
    captureJson,
    checksumFile = null
  }) {
    if (typeof captureJson !== "string" || captureJson.trim() === "") {
      throw new ImportValidationError(
        "captureJson must be a non-empty string."
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(captureJson);
    } catch (error) {
      throw new ImportValidationError("capture.json is not valid JSON.", {
        cause: error instanceof Error ? error.message : String(error)
      });
    }

    const envelope = validateExportEnvelope(parsed);
    const actualChecksum = await sha256(captureJson);

    let checksumVerified = null;

    if (checksumFile !== null) {
      const expectedChecksum = parseChecksumLine(checksumFile);

      if (!expectedChecksum) {
        throw new ImportValidationError(
          "checksum.sha256 has an invalid format."
        );
      }

      checksumVerified = expectedChecksum === actualChecksum;

      if (!checksumVerified) {
        throw new ImportValidationError(
          "capture.json checksum does not match checksum.sha256.",
          {
            expectedChecksum,
            actualChecksum
          }
        );
      }
    }

    return Object.freeze({
      envelope,
      checksum: actualChecksum,
      checksumVerified,
      continuationPrompt: createContinuationPrompt(envelope)
    });
  }
}
