# ADR-0016: Portable conversation library backups

## Status

Accepted

## Context

Conversation records are stored locally in browser storage. Users need a safe
way to move the library between browser profiles, create backups, and recover
records after reinstalling the extension.

## Decision

AI Relay exports the complete conversation library as a versioned JSON backup.

The backup contains:

- a stable format identifier;
- a schema version;
- export timestamp;
- record count;
- all validated conversation records.

Import supports two explicit modes:

- merge: imported records are added or replace records with the same ID;
- replace: the current library is cleared before imported records are saved.

All imported records pass through the existing library record validation.
Import and export remain local and user-triggered.

## Consequences

- Backups are portable and human-readable.
- Future schema migrations can use the version field.
- Corrupt or unsupported backups fail before modifying the library.
- Replace mode is explicit and requires user confirmation.
