# ADR-0011: Validated import engine

## Status

Accepted

## Context

AI Relay can export portable handoff packages, but another client needs a safe
way to read those exports and generate continuation context.

## Decision

The importer package:

- parses `capture.json`;
- validates schema name and version;
- validates conversation message roles and content;
- optionally verifies `checksum.sha256`;
- generates a provider-neutral continuation prompt;
- does not automatically submit the prompt anywhere.

ZIP extraction and browser import UI remain separate concerns.

## Consequences

- Exported handoffs can be validated before use.
- Corrupted or modified capture files are detected when a checksum is supplied.
- Continuation prompts are reusable in browser, desktop, and CLI clients.
- Future schema versions require explicit importer support.
