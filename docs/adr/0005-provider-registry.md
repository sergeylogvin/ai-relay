# ADR-0005: Provider registry

## Status

Accepted

## Context

AI Relay now has isolated adapters for Claude, ChatGPT, and Gemini. The browser
application needs one provider-neutral entry point for adapter discovery and
conversation reading.

## Decision

The providers package exposes a registry that:

- owns the ordered adapter list;
- finds an adapter by URL or location-like input;
- exposes provider capability metadata;
- delegates conversation reading;
- fails explicitly when no provider matches.

The registry does not contain provider-specific selectors or parsing rules.
Those remain isolated inside each adapter.

## Consequences

- Browser code no longer needs provider-specific conditionals.
- Additional providers can be added by registering another adapter.
- Adapter ordering is deterministic.
- Unsupported pages fail clearly instead of silently using the wrong parser.
