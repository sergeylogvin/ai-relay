# ADR-0003: Browser extension foundation

## Status

Accepted

## Context

AI Relay needs an installable browser client before provider-specific adapters
are complete. The first client must stay auditable, local, and low-permission.

## Decision

The first browser client uses a plain Manifest V3 WebExtension.

It:

- requests only `activeTab` and `storage`;
- limits host access to Claude, ChatGPT, and Gemini;
- has no cookie access;
- has no backend;
- never submits messages automatically;
- captures visible page content through a content script;
- presents a reviewable Markdown preview;
- requires an explicit user action to copy the result.

Provider-specific selectors will be isolated in later adapters. The initial
capture logic is intentionally conservative and generic.

## Consequences

- The same source can later be converted into a Safari Web Extension.
- The first build has no framework or bundler dependency.
- Generic capture may miss messages when provider DOM structures change.
- Provider adapters and fixture tests remain necessary before public release.
