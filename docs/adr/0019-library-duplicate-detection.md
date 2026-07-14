# ADR-0019: Local duplicate detection

## Status

Accepted

## Context

The same provider conversation can be captured more than once, creating
redundant library records.

## Decision

The library exposes deterministic duplicate-detection helpers using:

1. normalized provider and normalized source URL;
2. provider and checksum when no source URL exists;
3. provider, normalized title, and message count as a conservative fallback.

Duplicate groups are returned newest-first. No records are modified, merged,
or deleted automatically.

## Consequences

- Detection stays local and provider-neutral.
- URL query parameters and fragments do not create false distinctions.
- Consumers can build review or cleanup interfaces separately.
- The fallback may produce occasional false positives and must remain advisory.
