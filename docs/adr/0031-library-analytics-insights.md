# ADR-0031: Local library analytics and insights

## Status

Accepted

## Context

The conversation library now supports search, filtering, collections, bulk
operations, import/export, and local preferences. Users need an overview of
library growth, organization, activity, storage, and duplicate-review needs.

## Decision

Add a deterministic local analytics module that calculates:

- total, pinned, tagged, and collected conversations;
- conversations without tags or collections;
- activity across 7-, 30-, and 90-day windows;
- provider and domain distributions;
- estimated serialized storage size;
- duplicate-group counts supplied by the existing duplicate detector;
- actionable organization and activity insights.

Add a browser analytics panel that loads records through injected callbacks,
renders summary metrics and breakdowns, and refreshes when library records or
preferences change.

No analytics data is transmitted outside the browser.

## Consequences

Users receive useful insights while retaining local-only privacy. The analytics
model remains independent from browser storage and can later support exports,
saved reports, or optional synchronized telemetry without changing its core
calculation contract.
