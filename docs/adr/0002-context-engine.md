# ADR-0002: Deterministic context engine

## Status

Accepted

## Context

AI Relay needs to produce portable context without requiring an external API,
sending user data to another model, or making the core dependent on a specific
AI provider.

## Decision

The first context engine is deterministic and local.

It:

- normalizes provider messages into a shared role/content model;
- preserves an existing project state;
- recognizes explicit `Goal:`, `Task:`, `Decision:`, `Constraint:`, `Todo:`,
  and `Done:` lines;
- produces immutable snapshots;
- creates provider-neutral handoff objects;
- renders readable Markdown for manual review and transfer.

Model-assisted summarization can be added later as an optional adapter. It will
not replace deterministic behavior or become required for basic handoff.

## Consequences

- The initial implementation is transparent, testable, and private.
- Structured results are best when users or provider adapters supply explicit
  labels.
- Free-form semantic extraction remains limited in the first alpha.
- Future local or remote summarizers can implement a separate interface.
