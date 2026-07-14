# ADR-0024: Validated snapshot import planning

## Status

Accepted

## Context

Versioned full-library snapshots can now be exported. Restoring them must be
safe, predictable, and independent from browser storage implementation.

## Decision

The library exposes:

- a snapshot parser that validates schema and version;
- duplicate-ID normalization;
- a merge import mode;
- a replace import mode;
- a pure import planner that returns the resulting state and summary;
- no persistence or deletion inside the planner.

Merge mode updates matching IDs and preserves fields not present in imported
records. Replace mode returns only the imported snapshot contents.

## Consequences

The UI can preview import effects before applying them. Unsupported or corrupt
snapshots fail early without changing local data.
