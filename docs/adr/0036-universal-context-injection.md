# ADR 0036: Universal context injection

## Status

Accepted.

## Decision

Provider adapters may expose an `insertContext(context, root)` method when
they declare the `insertContext` capability. The registry provides the single
provider-neutral entry point and rejects unsupported providers with a typed
error.

Insertion writes only to the visible composer and dispatches input events. It
never clicks a send button or submits a form. The user must review and send the
inserted handoff explicitly. AI Relay also refuses to overwrite an existing
draft in the composer.

Provider-specific composer selectors remain isolated beside each adapter so a
provider UI change cannot affect other integrations.

## Consequences

- Browser clients use one API for Claude, ChatGPT, and Gemini.
- Capability metadata is enforced against the adapter implementation.
- DOM selectors remain best-effort and require real-world maintenance.
- Automatic sending remains out of scope for privacy and safety.
