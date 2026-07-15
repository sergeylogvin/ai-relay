#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP_PATH="$ROOT/apps/macos/MenuBar/dist/AIRelayMenuBar.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Menu bar app not found. Building it now..."
  bash "$ROOT/apps/macos/scripts/package-menu-bar-app.sh"
fi

bash "$ROOT/apps/macos/scripts/start-inbox-bridge.sh"

pkill -x AIRelayMenuBar 2>/dev/null || true
sleep 0.5
open "$APP_PATH"
sleep 1

if pgrep -x AIRelayMenuBar >/dev/null; then
  echo "AI Relay is running."
  echo "Inbox bridge is running on http://127.0.0.1:17831"
  echo "A small AI Relay window should open automatically."
  echo "Reload the browser extension, then click Capture to sync the handoff."
else
  echo "AI Relay menu bar failed to start."
  exit 1
fi
