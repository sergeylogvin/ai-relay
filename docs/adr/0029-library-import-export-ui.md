# ADR-0029: Browser import and export UI

## Status

Accepted

## Context

The library already has backup, snapshot export, snapshot import, and ZIP
packaging capabilities. Users need a browser interface that exposes those
capabilities without coupling the page directly to a storage or archive
implementation.

## Decision

Add an import/export UI component that:

- exposes explicit Export Library and Import Library actions;
- accepts JSON and ZIP backups;
- supports file selection and drag-and-drop;
- asks for confirmation before importing;
- reports progress, success, cancellation, and errors;
- delegates import and export work to injected callbacks;
- dispatches a library records changed event after successful import;
- does not mutate persistence directly.

## Consequences

The UI can use the current snapshot and ZIP modules while remaining adaptable
to future archive formats or cloud backup providers. Import strategy and
overwrite behavior remain controlled by the injected implementation.
