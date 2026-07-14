# ADR-0033: Library keyboard shortcuts and command palette

## Status

Accepted

## Context

The library now includes search, filters, collections, saved views, analytics,
bulk operations, import/export, and preferences. Frequent users need faster
navigation and action discovery without relying entirely on pointer input.

## Decision

Add a normalized keyboard-shortcut model with:

- stable shortcut IDs and signatures;
- exact modifier matching;
- editable-target protection;
- platform-aware labels;
- a shortcut registry for event matching.

Add a local command palette with searchable commands, keyboard navigation,
selection, and execution. Add a browser shortcut controller and a visible
shortcut reference section.

Default shortcuts include search focus, command palette, collection creation,
selection navigation, open, toggle, delete, and escape actions.

All commands are dispatched locally through injected handlers or custom
events.

## Consequences

Keyboard users gain faster navigation and discoverable actions. The shortcut
model stays decoupled from browser UI and can later support user-configurable
bindings through the existing preferences system.
