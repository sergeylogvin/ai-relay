# ADR-0001: Storage boundary

## Status

Accepted

## Context

AI Relay must work without a backend and must support browser storage, local files,
and a future macOS database without coupling the domain layer to a specific storage
technology.

## Decision

The storage package exposes repositories that depend on small adapter contracts.

The initial implementation includes an in-memory adapter for deterministic tests.
Browser and desktop adapters will implement the same operations:

- put
- get
- has
- delete
- list
- clear

Domain packages do not import browser APIs, IndexedDB, SQLite, or file-system APIs.

## Consequences

- Storage implementations can be replaced without changing core domain models.
- Tests remain fast and deterministic.
- Schema migration remains the responsibility of repository implementations.
- Encryption will be applied above or inside persistent adapters, not in the core domain.
