# macOS App

macOS companion for pasting AI Relay handoffs into desktop apps such as Claude Cowork, ChatGPT desktop, and Cursor.

## Phase 2 MVP

The first macOS deliverable is a **Native Messaging host** that copies a handoff to the system clipboard. The browser extension can then hand off context to any desktop app with `Cmd+V`.

This package keeps the desktop boundary separate from the shared core packages.

## Install the desktop helper

1. Build or reload the browser extension.
2. Open `chrome://extensions`, enable **Developer mode**, and copy the AI Relay extension ID.
3. Install the native host:

```bash
cd ~/ai-relay
node apps/macos/scripts/install-native-host.mjs <extension-id>
```

4. Reload the AI Relay extension in Chrome.

## Use it

1. Capture a conversation in the browser extension.
2. Click **Copy for Desktop** in the popup.
3. Switch to Claude Cowork, ChatGPT desktop, or Cursor.
4. Paste with `Cmd+V`.

If the helper is not installed, **Copy for Desktop** falls back to the normal browser clipboard.

## Cursor workflow

Use **Copy for Cursor** to copy a compact **context pack** without the full transcript. Paste it into Cursor Agent chat to continue the task in the IDE.

## Next steps

- Menu bar app with pending-handoff status
- Optional auto-paste into the frontmost app via Accessibility APIs
- Shared handoff inbox between browser and desktop
