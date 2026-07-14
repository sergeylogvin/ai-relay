# ADR-0030: Local library settings and preferences

## Status

Accepted

## Context

The browser library now includes search, filters, collections, bulk actions,
and import/export controls. Users need stable personal defaults without adding
account or server dependencies.

## Decision

Introduce a normalized library preferences model with defaults for:

- sorting;
- list density;
- filter persistence;
- link behavior;
- destructive-action confirmations;
- import behavior;
- page size;
- theme.

Persist preferences locally under a versioned storage key. Add a settings UI
that delegates loading, saving, and resetting to injected callbacks and emits a
preference-changed event after updates.

Invalid or unsupported stored values fall back safely to defaults.

## Consequences

Preferences remain private to the current browser profile and work offline.
Future synchronized settings can reuse the same normalized model while
replacing only the persistence adapter.
