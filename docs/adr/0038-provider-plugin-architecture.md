# ADR 0038: Provider plugin architecture

## Decision

AI Relay providers are registered through immutable plugin definitions.

Each provider plugin declares:

- a stable provider ID;
- a display name;
- supported hosts;
- an adapter factory.

The registry depends on plugin definitions rather than importing adapter classes
directly. Plugins may be injected when a registry is created or registered
later at runtime.

## Why

The previous registry directly instantiated Claude, ChatGPT, and Gemini
adapters. That worked, but every provider addition required changing registry
implementation details.

The plugin contract separates:

- provider metadata;
- adapter construction;
- adapter validation;
- provider discovery;
- registry behavior.

A new provider now adds its adapter, selectors, and plugin definition. The
default catalog is the only central list that must be updated for the provider
to ship in the standard browser bundle.

## Validation

Adapters are validated when their plugin is registered. Invalid or duplicate
providers fail early with explicit errors.

## Future work

A later build step may generate the default catalog automatically from provider
directories. Runtime network loading is intentionally out of scope because the
browser extension must remain predictable, reviewable, and compatible with
extension store security requirements.
