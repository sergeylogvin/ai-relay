# ADR-0006: Browser runtime uses the provider registry

## Status

Accepted

## Context

The initial content script contained its own generic provider detection and DOM
selectors. The providers package now contains isolated adapters and a registry,
so keeping parser logic in the browser would duplicate behavior and allow the
implementations to drift.

## Decision

The content script dynamically imports the provider registry from the extension
bundle and delegates conversation extraction to it.

The browser build copies the provider package source into the extension output.
Only those extension modules are exposed as web-accessible resources, and only
on the three supported provider origins.

The content script remains responsible for:

- receiving explicit capture requests;
- invoking the registry;
- adding capture metadata;
- returning the result to the popup.

It does not contain provider-specific selectors.

## Consequences

- Provider extraction has one source of truth.
- DOM changes remain isolated inside provider adapters.
- The extension build must include provider modules.
- Dynamic module loading must be verified in Chromium and Safari smoke tests.
