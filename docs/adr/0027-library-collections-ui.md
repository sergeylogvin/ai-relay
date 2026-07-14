# ADR-0027: Browser collections panel

## Status

Accepted

## Context

The library supports collection metadata, but users need a visible way to
navigate and manage collections from the browser options page.

## Decision

Add a presentation-focused collections panel that:

- lists collections in deterministic alphabetical order;
- shows record counts;
- supports selecting a collection;
- supports create, rename, and delete actions;
- supports dropping selected record IDs onto a collection;
- never deletes conversations when deleting a collection;
- communicates through injected callbacks and browser custom events;
- remains independent from a specific persistence adapter.

The panel receives collection and record access functions from the library page.
This keeps storage details outside the UI component.

## Consequences

The UI can work with the current browser storage adapter and later persistence
implementations. Record-row drag initiation and richer dialogs can evolve in
separate changes without replacing the component contract.
