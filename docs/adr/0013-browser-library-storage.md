# ADR-0013: Browser-backed conversation library

## Status

Accepted

## Context

The shared conversation library currently has only an in-memory adapter.
Browser users need persistent local storage and a direct way to save captured
handoffs without downloading files first.

## Decision

The browser extension uses `chrome.storage.local` through a dedicated
`BrowserStorageLibraryAdapter`.

The popup exposes an explicit **Save to Library** action after a successful
capture. Saved records include provider, title, source URL, timestamps, message
count, checksum, `handoff.md`, and `capture.json`.

## Consequences

- Saved handoffs persist across browser restarts.
- Data remains local to the extension profile.
- Saving requires an explicit user action.
- A library browsing UI remains a separate feature.
