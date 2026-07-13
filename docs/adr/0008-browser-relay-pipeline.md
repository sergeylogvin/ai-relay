# ADR-0008: Browser relay pipeline

## Status

Accepted

## Context

The browser extension can already read conversations through provider adapters.
The shared core can create snapshots and handoffs, and the export package can
produce portable files. These pieces must now operate as one end-to-end flow.

## Decision

The content script composes the shared runtime in this order:

1. `ProviderRegistry` selects the correct adapter.
2. The adapter reads the visible conversation.
3. `ContextEngine` creates a deterministic snapshot.
4. `ContextEngine` creates a provider-neutral handoff.
5. `ExportEngine` produces:
   - `capture.json`
   - `handoff.md`
   - `checksum.sha256`
6. The popup receives a reviewable payload.

The build copies provider, core, and export modules into the extension output.
The content script dynamically imports those modules from extension URLs.

Build tests use isolated temporary output directories to avoid concurrent test
runs deleting the same `dist` directory.

No message is submitted automatically. The user must review and explicitly copy
or export the result.

## Consequences

- AI Relay now has an end-to-end local capture pipeline.
- Browser UI remains thin and provider-neutral.
- Shared modules have one implementation across browser, future desktop, and CLI.
- Chromium and Safari still require manual runtime smoke tests.
