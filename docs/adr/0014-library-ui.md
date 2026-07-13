# ADR-0014: Browser conversation library UI

## Status

Accepted

## Context

Conversation records can now be persisted in browser storage, but users need a
dedicated interface for finding, reviewing, copying, downloading, and deleting
saved handoffs.

## Decision

The browser extension exposes the library as its options page.

The library UI:

- lists locally saved conversations;
- sorts records using the shared library behavior;
- searches title, provider, tags, URL, and handoff content;
- filters by provider;
- displays record metadata and Markdown preview;
- copies or downloads handoff Markdown after explicit user actions;
- deletes records only after confirmation;
- can be opened directly from the popup.

## Consequences

- Saved records become usable without manually opening storage or files.
- The UI remains fully local and provider-neutral.
- Import, continuation actions, tags, and favorites remain separate features.
