# ADR-0034: Library UX polish and accessibility layer

## Status

Accepted

## Context

The library feature set is complete enough for broad use, but the interface
still needs consistent empty states, loading feedback, focus handling, live
announcements, and keyboard-visible affordances.

## Decision

Add a reusable accessibility layer that provides:

- normalized live-region announcements;
- focus history and restoration;
- focusable-element discovery and focus trapping;
- reusable empty-state definitions;
- loading skeleton rendering;
- accessible dialog behavior;
- a library skip link;
- consistent focus-visible styling;
- reduced-motion and forced-colors support;
- ARIA labels and live regions for status elements.

The browser integration listens for library record and filtering events,
announces result counts, and renders a clear empty state when no records are
visible.

## Consequences

The library becomes easier to use with keyboards, screen readers, reduced
motion, and high-contrast settings. Accessibility logic remains modular and
can be reused by future browser surfaces.
