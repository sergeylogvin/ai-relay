# ADR-0007: Deterministic export engine

## Status

Accepted

## Context

AI Relay must transfer context between providers in a format that is readable,
portable, verifiable, and independent from browser UI code.

## Decision

The export package produces three logical files:

- `capture.json`: a versioned machine-readable export envelope;
- `handoff.md`: a human-readable continuation document;
- `checksum.sha256`: a checksum for `capture.json`.

JSON serialization is deterministic by recursively sorting object keys before
encoding. The export engine does not write files directly and does not depend on
browser APIs. Applications decide whether to copy, download, archive, or store
the generated files.

## Consequences

- Export output is portable across browser, desktop, and CLI clients.
- Checksums can detect accidental modification.
- Schema versioning allows future migration.
- ZIP packaging and encrypted archives remain separate concerns.
