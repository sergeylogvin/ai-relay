# ADR-0035: Library v1 release boundary

## Status

Accepted

## Context

The Library now includes local storage, organization, collections, duplicate
management, import/export, search, filters, bulk actions, preferences,
analytics, saved views, keyboard workflows, and accessibility support.

Continuing to add unrelated features before establishing a stable release
boundary would make validation and maintenance harder.

## Decision

Declare the current Library feature set as the v1 release boundary.

The release requires:

- successful static checks;
- successful automated tests;
- successful browser build;
- documented scope and release notes;
- a repeatable manual smoke-test checklist;
- no automatic destructive behavior;
- local-first persistence as the default.

Future capabilities should be proposed as post-v1 work rather than silently
expanding the v1 scope.

## Consequences

The Library has a clear stable milestone. Future work can focus on integration,
performance, synchronization adapters, or additional providers without
changing the established v1 contract.
