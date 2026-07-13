# ADR-0004: Isolated provider adapters

## Status

Accepted

## Context

Claude, ChatGPT, and Gemini can change their page structure independently.
A shared DOM parser would allow a change in one provider to break every
integration.

## Decision

Each provider has an isolated adapter with:

- provider matching;
- a capability declaration;
- provider-specific selectors;
- conversation extraction;
- provider-specific fixture tests.

Adapters return a common conversation shape:

- provider
- title
- url
- messages

The first Claude adapter is read-only. It does not use cookies, private APIs,
automatic submission, file uploads, or limit endpoints.

Generic browser capture remains a fallback until each provider adapter is
wired into the extension runtime.

## Consequences

- Provider changes are isolated.
- Fixtures can document expected DOM contracts.
- Selector maintenance remains necessary.
- The first alpha must be manually tested against the live provider UI.
