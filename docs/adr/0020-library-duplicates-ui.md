# ADR-0020: Duplicate review UI

## Status

Accepted

## Context

The library can identify duplicate captures, but users need a safe way to
review them before taking action.

## Decision

The browser library marks records returned by the duplicate-detection engine
and provides a “Duplicates only” filter.

The UI remains advisory:

- it does not merge records;
- it does not delete records;
- it does not select a canonical record automatically;
- all duplicate analysis stays local.

## Consequences

Users can review likely duplicates without destructive automation. A later
change may add explicit merge or delete actions with confirmation.
