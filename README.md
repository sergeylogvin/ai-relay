# AI Relay

> **Own your AI context. Continue your work anywhere.**

AI Relay is an open-source browser extension that captures conversations from AI assistants into portable, human-readable formats.

Continue a conversation in another AI, archive it locally, or share it with your team without being locked into a single provider.

**Local-first · Privacy-first · Open source**

---

## Why AI Relay?

Every AI provider keeps conversations inside its own ecosystem.

AI Relay helps you:

- capture conversations from supported AI assistants;
- export conversations to Markdown or JSON;
- preserve message structure, metadata, source URL, and checksum;
- continue work across different AI providers;
- organize captured conversations in a local Library;
- keep your data under your control.

No cloud dependency. No telemetry by default. No vendor lock-in.

## Current Status

AI Relay is in active early development.

The following flows are already working:

- Claude conversation capture;
- Markdown and JSON handoff export;
- conversation preview;
- SHA-256 checksums;
- local conversation Library;
- browser release packaging for Chromium-based browsers.

## Features

| Feature | Status |
|---|:---:|
| Claude capture | ✅ |
| Markdown export | ✅ |
| JSON export | ✅ |
| Conversation preview | ✅ |
| Metadata capture | ✅ |
| SHA-256 checksum | ✅ |
| Local-first Library | ✅ |
| Collections, tags, and pinned items | ✅ |
| Smart search and advanced filters | ✅ |
| Duplicate detection and cleanup planning | ✅ |
| Bulk operations | ✅ |
| Snapshot import and export | ✅ |
| Settings, analytics, and saved views | ✅ |
| Keyboard shortcuts and command palette | ✅ |
| Accessibility and UX support | ✅ |
| Chromium extension package | ✅ |

## Supported Providers

| Provider | Status |
|---|:---:|
| Claude | ✅ Supported |
| ChatGPT | 🚧 Planned |
| Gemini | 🚧 Planned |
| Perplexity | 🚧 Planned |
| Microsoft Copilot | 🚧 Planned |
| Grok | 🚧 Planned |

## Installation

### Install a prepared browser release

1. Download the latest AI Relay browser ZIP.
2. Extract the ZIP into a permanent folder.
3. Open `chrome://extensions` in Chrome, Edge, or Brave.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted extension folder containing `manifest.json`.
7. Pin AI Relay to the browser toolbar.

See [`docs/browser-installation.md`](docs/browser-installation.md) for detailed instructions.

### Build from source

Requirements:

- Git
- Node.js
- npm
- a Chromium-based browser

```bash
git clone https://github.com/sergeylogvin/ai-relay.git
cd ai-relay

npm install
npm run check
npm test
npm run package:browser
```

Generated release files are written to `release/`.

## Quick Start

1. Open a supported conversation in Claude.
2. Click the AI Relay extension icon.
3. Click **Capture current conversation**.
4. Review the title, message count, checksum, and handoff preview.
5. Copy or download the Markdown or JSON export.
6. Paste the handoff into another AI assistant or save it locally.

## Portable Handoff

AI Relay produces two export formats:

### Markdown

A readable handoff designed for people and AI assistants.

It includes:

- provider;
- conversation title;
- source URL;
- current task;
- structured user and assistant messages.

### JSON

A structured handoff designed for tools, automation, import, and future integrations.

## Local Library

The browser extension includes a local-first conversation Library with:

- collections, tags, and pinned items;
- duplicate detection and cleanup planning;
- smart search and advanced filters;
- bulk operations;
- snapshot import and export;
- settings, analytics, and saved views;
- keyboard shortcuts and a command palette;
- accessibility and UX support.

See:

- [`docs/library-v1-release-notes.md`](docs/library-v1-release-notes.md)
- [`docs/library-release-checklist.md`](docs/library-release-checklist.md)

## Browser Release

Create a user-installable browser package with:

```bash
npm run package:browser
```

The release process generates:

- a browser-extension ZIP archive;
- a SHA-256 checksum;
- release metadata.

The repository also includes a GitHub Actions workflow for browser release artifacts.

## Principles

- **Local first** — core Library data stays in the browser profile by default.
- **Privacy first** — no telemetry by default.
- **Open source** — users can inspect and improve the project.
- **Provider agnostic** — the data model is not tied to one AI service.
- **Human-readable data** — Markdown remains a first-class format.
- **User-controlled transfers** — users decide what to capture, export, import, or delete.

## Architecture

```text
AI provider page
      ↓
Provider adapter
      ↓
Capture and normalization
      ↓
Portable handoff
      ↓
Markdown / JSON / Local Library
```

The project is designed around a shared core with browser-specific adapters and interfaces.

## Planned Applications

- Chromium extension
- Safari Web Extension
- macOS companion app
- shared TypeScript core

## Roadmap

### Current release

- Claude capture
- Markdown and JSON exports
- checksums and previews
- local conversation Library
- packaged Chromium release

### Next

- ChatGPT support
- Gemini support
- Perplexity support
- improved onboarding and release assets
- Chrome Web Store preparation

### Later

- direct cross-provider continuation;
- conversation merge and branching;
- optional encrypted synchronization;
- desktop companion application.

## Development

```bash
npm install
npm run check
npm test
npm run build:browser
```

To create a local user release:

```bash
npm run package:browser
```

## Contributing

Contributions are welcome.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

Please also review:

- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)

## Privacy

AI Relay is designed as a local-first browser extension.

Read [`docs/privacy-policy.md`](docs/privacy-policy.md) for details about locally processed and stored data.

## License

Licensed under the [Apache License 2.0](LICENSE).
