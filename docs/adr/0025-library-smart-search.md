# ADR-0025: Local ranked smart search

## Status

Accepted

## Context

The conversation library needs useful retrieval without sending private
conversation data to an external search service.

## Decision

The library exposes a local smart-search function that:

- searches titles, tags, collections, providers, domains, URLs, notes, and content;
- applies field-specific relevance weights;
- rewards exact phrases, exact tokens, prefixes, substrings, and conservative fuzzy matches;
- produces deterministic ranking;
- returns matched fields, per-field scores, matched terms, and snippets;
- exposes a presentation-neutral highlight helper;
- performs all processing locally.

The first version uses a lightweight in-memory scorer. It does not require an
external index or embedding provider.

## Consequences

Search is immediately available for small and medium local libraries. A future
index or semantic layer can preserve the same result contract while improving
performance and recall.
