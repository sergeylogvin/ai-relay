# ADR-0026: Composable local library filters

## Status

Accepted

## Context

Ranked search improves discovery, but users also need precise narrowing by
provider, tags, collections, pinned state, content presence, and date range.

## Decision

The library exposes presentation-neutral filter utilities that:

- filter by providers, tags, and collection IDs;
- support `any` and `all` matching for list filters;
- filter by pinned state;
- filter by URL, notes, and content presence;
- filter by inclusive date range;
- support created, updated, and captured timestamps;
- combine all active filters with logical AND;
- preserve input record order;
- summarize active filters for UI presentation;
- process all data locally.

No sorting, persistence, or UI state is introduced in this change.

## Consequences

Search results and complete library lists can share the same deterministic
filter contract. UI controls can be implemented independently in a later PR.
