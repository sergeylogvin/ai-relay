# ADR-0023: Versioned full-library JSON snapshots

## Status

Accepted

## Context

The project already supports conversation-level exports and local backup
operations. A complete library migration requires one deterministic,
versioned representation containing records, collections, and tag metadata.

## Decision

The library exposes a pure snapshot exporter that:

- identifies the payload with a stable schema name;
- includes an explicit schema version;
- includes records, collections, and tags;
- records item counts;
- sorts exported entities deterministically;
- produces readable JSON with a trailing newline;
- uses a stable dated filename.

The exporter performs no download or browser-side mutation. UI layers may use
the returned string to trigger an explicit local download.

## Consequences

Snapshots can be validated and imported in future changes without relying on
browser implementation details. Existing conversation and ZIP exports remain
unchanged.
