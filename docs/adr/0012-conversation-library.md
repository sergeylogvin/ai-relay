# ADR-0012: Local conversation library

## Status

Accepted

## Context

AI Relay can export and import handoff packages, but users also need a local
library for repeated access without managing individual files manually.

## Decision

The library package introduces:

- a provider-neutral conversation record;
- adapter-based persistence boundaries;
- deterministic sorting by `updatedAt`;
- search across title, provider, tags, source URL, and handoff content;
- provider and tag filters;
- save, get, list, delete, and clear operations.

The first adapter is in-memory and exists for tests and shared behavior.
Browser storage and desktop storage adapters remain separate implementation
tasks.

## Consequences

- Library behavior can be shared across browser, desktop, and CLI clients.
- Storage technology remains replaceable.
- Search is local and requires no external service.
- Browser UI integration can be added without changing the domain model.
