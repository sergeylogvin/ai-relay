# ADR 0039: Provider capability system

## Decision

Provider adapters expose a normalized, immutable capability object.

The shared capability vocabulary includes:

- conversation reading;
- context insertion;
- file uploads;
- limit reading;
- streaming;
- attachments;
- artifacts;
- images.

Missing capabilities default to `false`. Unknown capability keys are ignored.

## Why

Provider-specific UI and workflows must not rely on provider IDs or scattered
conditionals. Consumers can now ask the registry whether the current provider
supports an operation before rendering or invoking it.

## Registry API

The registry provides:

- `getCapabilities(input)`;
- `supports(input, capability)`;
- `providersSupporting(capability)`.

## Compatibility

Existing adapters may keep returning partial capability objects. They are
normalized at registration time, so the browser bundle receives a stable shape.

## Scope

This decision only describes declared capabilities. It does not automatically
implement missing provider features.
