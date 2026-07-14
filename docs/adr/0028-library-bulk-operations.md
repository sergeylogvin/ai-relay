# ADR-0028: Deterministic bulk operation plans

## Status

Accepted

## Context

The browser library now supports collections, search, and advanced filters.
Users need to select multiple conversations and perform consistent actions
without coupling UI code directly to storage mutations.

## Decision

Introduce presentation-neutral bulk-operation planners that:

- maintain a deterministic selection state;
- support toggle, range selection, select all, and clear;
- plan delete operations without deleting automatically;
- plan collection assignment and removal;
- plan batch tag changes;
- plan pinned-state updates;
- return selected records for export;
- report missing IDs and action counts;
- preserve input ordering;
- never mutate source records.

Add a browser toolbar component that delegates actual persistence to injected
callbacks.

## Consequences

Storage adapters can execute plans transactionally or sequentially. The browser
UI remains testable and independent from persistence details. Confirmation
dialogs and keyboard wiring can evolve separately.
