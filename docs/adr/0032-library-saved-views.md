# ADR-0032: Local saved library views

## Status

Accepted

## Context

The library now supports search, advanced filters, collections, sorting,
analytics, and user preferences. Repeating the same combinations of these
controls is inefficient for users who regularly revisit focused subsets of
their conversation library.

## Decision

Add a saved-view model that captures:

- search text;
- sort order;
- active collection;
- provider, domain, tag, date, pin, notes, and duplicate filters;
- view name and description;
- default-view status;
- creation and update timestamps.

Persist saved views locally under a versioned storage key. Support create,
apply, rename, duplicate, delete, set-default, import, and export operations.

Add a browser UI that delegates current-query capture and query application to
injected callbacks. Applying a default view remains a local browser behavior.

## Consequences

Users can quickly restore recurring library configurations without sending
data to a server. The saved-view schema is versioned for future migrations and
can later be synchronized through a different persistence adapter.
