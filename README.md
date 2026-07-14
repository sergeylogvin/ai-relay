# AI Relay

**Own your AI context. Continue your work anywhere.**

AI Relay is a local-first, open-source platform for transferring and maintaining work context across Claude, ChatGPT, Gemini, and future AI providers.

## Status

Early development.

## Principles

- Local first
- Privacy first
- Open source
- Provider agnostic
- No telemetry by default
- Human-readable data
- User-controlled transfers

## Planned applications

- Safari Web Extension
- Chromium Extension
- macOS companion app
- Shared TypeScript core

## License

Apache License 2.0

## Library

The browser extension includes a local-first conversation Library with:

- collections, tags, and pinned items;
- duplicate detection and cleanup planning;
- smart search and advanced filters;
- bulk operations;
- snapshot import and export;
- settings, analytics, and saved views;
- keyboard shortcuts and a command palette;
- accessibility and UX support.

See `docs/library-v1-release-notes.md` and
`docs/library-release-checklist.md` for the v1 scope and validation steps.

## Browser release

Create a user-installable browser package:

```bash
npm run package:browser
```

Release files are written to `release/`. See
`docs/browser-installation.md` for installation instructions.
