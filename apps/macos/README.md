# macOS App

macOS companion for pasting AI Relay handoffs into desktop apps such as Claude Cowork, ChatGPT desktop, and Cursor.

## Phase 2

The desktop workflow has three pieces:

1. **Browser extension** captures a handoff and syncs it to the desktop inbox.
2. **Native Messaging host** stores the handoff in `~/Library/Application Support/AI Relay/pending-handoff.json`.
3. **Menu bar app** shows the latest handoff and copies it to the clipboard for paste in any desktop app.

## Install the desktop helper

1. Build or reload the browser extension.
2. Open `chrome://extensions`, enable **Developer mode**, and copy the AI Relay extension ID.
3. Install the native host:

```bash
cd ~/ai-relay
node apps/macos/scripts/install-native-host.mjs <extension-id>
```

4. Reload the AI Relay extension in Chrome.

## Run the menu bar app

```bash
cd ~/ai-relay
bash apps/macos/scripts/build-menu-bar.sh
open apps/macos/MenuBar/.build/release/AIRelayMenuBar
```

Keep the menu bar app running in the background. After each browser capture, the latest handoff appears in the menu within a couple of seconds.

## Use it

### Browser → desktop

1. Capture a conversation in the browser extension.
2. Open the menu bar app.
3. Click **Copy handoff**.
4. Switch to Cowork, ChatGPT desktop, or Cursor.
5. Paste with `Cmd+V`.

### Cursor workflow

Use **Copy for Cursor** in the popup for a compact context pack without the transcript.

### Manual desktop copy

**Copy for Desktop** still works from the popup. It stores the handoff in the inbox and copies it to the clipboard.

If the native host is not installed, the extension falls back to the normal browser clipboard.

## Next steps

- Launch the menu bar app automatically at login
- Optional auto-paste into the frontmost app via Accessibility APIs
- Limit awareness in the browser popup
