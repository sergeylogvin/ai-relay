# ADR-0018: Conversation collections

## Status

Accepted

## Context

Tags provide flexible classification, but users also need one simple grouping
field for major areas such as Work, Research, and Personal.

## Decision

Each conversation may have one optional collection name.

The library UI provides:

- a collection field in the organization panel;
- suggestions based on existing collection names;
- a collection filter;
- collection-aware text search.

Collection metadata remains local and is included automatically in backups.

## Consequences

- Existing records without a collection remain valid.
- Collections require no separate database migration.
- Nested folders are intentionally out of scope.
