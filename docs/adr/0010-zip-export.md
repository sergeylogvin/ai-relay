# ADR-0010: Dependency-free ZIP export

## Status

Accepted

## Context

Users need one portable package containing all relay artifacts. The browser
extension currently downloads Markdown and JSON separately.

## Decision

The export package includes a small dependency-free ZIP writer that creates
standards-compatible, uncompressed ZIP archives.

The popup packages:

- `capture.json`
- `handoff.md`
- `checksum.sha256`
- `metadata.json`

The archive is created entirely in memory and downloaded only after an explicit
user action.

## Consequences

- No third-party ZIP dependency is required.
- Archive output is deterministic.
- Stored entries are uncompressed, so archives may be larger.
- Compression can be added later without changing the export file contract.
