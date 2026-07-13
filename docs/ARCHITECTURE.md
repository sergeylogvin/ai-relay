# Architecture

AI Relay uses a monorepository with a provider-independent core.

## Layers

### Core

Defines projects, sessions, snapshots, handoffs, and validation rules.

### Providers

Contains isolated adapters for Claude, ChatGPT, Gemini, and future providers.

### Security

Performs redaction, permission checks, and transfer review.

### Storage

Provides local persistence and import/export.

### Applications

- Browser extension
- macOS companion app

Applications depend on shared packages. Shared packages must not depend on application UI.

## Initial data flow

1. Provider adapter reads the visible conversation.
2. Core normalizes messages.
3. Security scans and redacts sensitive values.
4. Handoff engine creates a structured continuation package.
5. User reviews the package.
6. AI Relay opens the selected provider.
7. User manually submits the context.
