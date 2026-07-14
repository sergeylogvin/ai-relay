# ADR-0021: Explicit duplicate merge planning

## Status

Accepted

## Context

Duplicate detection and review are available, but removing duplicate records
must not happen automatically or without a clear canonical record.

## Decision

The library exposes a pure merge-planning function.

The caller must:

1. provide a duplicate group;
2. explicitly select the canonical record;
3. review the merged metadata;
4. persist the canonical record;
5. delete obsolete records only after explicit confirmation.

The merge plan:

- preserves the canonical record ID;
- combines tags and collection membership;
- preserves pinned state when any source record is pinned;
- keeps the oldest creation timestamp;
- keeps the newest update timestamp;
- records merged source IDs;
- returns obsolete IDs separately.

## Consequences

The merge engine is deterministic and testable. No storage mutation occurs
inside the merge planner, preventing accidental destructive cleanup.
