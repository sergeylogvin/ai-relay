# ADR-0009: Popup relay UI

## Status

Accepted

## Context

The browser relay pipeline now returns a complete local export payload. The
popup must expose that payload without duplicating provider, context, or export
logic.

## Decision

The popup:

- requests a capture from the active supported tab;
- displays provider, title, message count, and checksum;
- previews `handoff.md`;
- copies Markdown or JSON only after an explicit click;
- downloads Markdown or JSON only after an explicit click;
- never submits content to an AI provider automatically.

ZIP packaging remains a separate feature.

## Consequences

- Users can review the generated handoff before exporting it.
- Popup code remains a thin UI layer.
- The browser extension now exposes the first usable end-to-end workflow.
- Manual smoke testing is still required against live provider pages.
