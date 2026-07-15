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
npm run package:macos-menu-bar
open apps/macos/MenuBar/dist/AIRelayMenuBar.app
```

Use the `.app` bundle, not the raw binary from Terminal. Launching the binary directly keeps a Terminal window attached; closing that window quits the app.

### Install for daily use

For login-at-login and paste support, install the app into `~/Applications`:

```bash
cd ~/ai-relay
npm run install:macos-companion
open ~/Applications/AI\ Relay.app
```

In the AI Relay window, enable **Launch at login**. After that, the companion and inbox bridge start quietly in the background when you sign in to macOS. Use the Dock icon when you want to paste a handoff.

### Fast paste hotkey

With **Enable paste hotkey (Cmd+Shift+V)** turned on:

1. Capture in the browser.
2. Focus the target app chat input.
3. Press **Cmd+Shift+V**.

No need to open the AI Relay window.

When the app starts, it opens a small **AI Relay window** with the latest handoff. macOS may hide the top menu bar item on crowded MacBooks; the Dock icon remains the reliable entry point.

The menu bar label shows the latest handoff title when macOS leaves room for it. When no handoff is stored yet, it shows `AI Relay`.

Keep the menu bar app running in the background. After each browser capture, the latest handoff appears in the menu within a couple of seconds.

## Use it

### Browser → desktop

1. Capture a conversation in the browser extension.
2. Switch to Cowork, ChatGPT desktop, or Cursor and focus the chat input.
3. Open the AI Relay window from the Dock.
4. Click **Paste into front app**.

The app copies the handoff, hides itself, and sends `Cmd+V` to the front app. The first time, macOS asks for **Accessibility** permission.

Manual fallback:

1. Focus the target app chat input.
2. Press **Cmd+Shift+V** anywhere, or open AI Relay and click **Paste into front app**.
3. If needed, click **Copy handoff** and paste manually with **Cmd+V**.

### Cursor workflow

1. Capture in the browser.
2. Click **Copy for Cursor** in the popup.
3. Switch to **Cursor** and focus the chat input.
4. The context pack pastes automatically. Manual fallback: **Cmd+Shift+V** or **Cmd+V**.

### Manual desktop copy

**Copy for Desktop** still works from the popup. It stores the handoff in the inbox and copies it to the clipboard.

If the native host is not installed, the extension falls back to the normal browser clipboard.

## Next steps

- Auto-paste for **Copy for Desktop** into ChatGPT Cowork
