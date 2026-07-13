# ADR-0017: Local conversation organization

## Status

Accepted

## Context

As the saved conversation library grows, users need lightweight ways to group
important records and retrieve them quickly.

## Decision

AI Relay stores organization metadata directly on local conversation records:

- normalized tags;
- a pinned flag;
- tag filtering;
- pinned-only filtering;
- pinned-first ordering.

The browser page creates the new controls at runtime so the feature does not
depend on fragile HTML source anchors.

## Consequences

- Existing records remain compatible.
- Search includes tags.
- Backup files retain tags and pinned state as record fields.
- No account, cloud storage, or external API is required.
