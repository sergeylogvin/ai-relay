# ADR-0022: Non-destructive library cleanup planning

## Status

Accepted

## Context

As the local conversation library grows, it can accumulate empty collections,
orphan tags, and duplicated metadata references.

Automatic destructive cleanup would be risky because the library may contain
user-curated structures.

## Decision

The library exposes a pure cleanup planner that:

- identifies empty collections;
- identifies orphan tags;
- normalizes duplicate tag and collection references;
- reports changed record IDs;
- performs no persistence or deletion itself.

The caller must explicitly review and apply the returned plan.

## Consequences

Cleanup is deterministic, testable, and safe by default. A future UI can
present the plan and require user confirmation before applying changes.
