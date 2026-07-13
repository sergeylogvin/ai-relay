# ADR-0015: Provider-neutral conversation continuation

## Status

Accepted

## Context

Saved handoffs should be easy to transfer into a new AI conversation without
private APIs or automatic submission.

## Decision

AI Relay generates a continuation prompt from the saved handoff record. The
library can copy a generic prompt or a provider-specific prompt, then open
ChatGPT, Claude, or Gemini in a new tab.

The extension never pastes or submits content automatically.

## Consequences

- continuation remains provider-neutral;
- users retain control over pasted and submitted content;
- provider URLs live in one shared module;
- automatic submission remains out of scope.
