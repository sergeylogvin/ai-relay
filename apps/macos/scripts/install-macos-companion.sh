#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SOURCE_APP="$ROOT/apps/macos/MenuBar/dist/AIRelayMenuBar.app"
TARGET_DIR="${HOME}/Applications"
TARGET_APP="$TARGET_DIR/AI Relay.app"

bash "$ROOT/apps/macos/scripts/package-menu-bar-app.sh"

mkdir -p "$TARGET_DIR"
rm -rf "$TARGET_APP"
ditto "$SOURCE_APP" "$TARGET_APP"
xattr -cr "$TARGET_APP" 2>/dev/null || true

echo ""
echo "Installed AI Relay at:"
echo "  $TARGET_APP"
echo ""
echo "Next:"
echo "  1. Open AI Relay from Applications or run: open \"$TARGET_APP\""
echo "  2. Enable \"Launch at login\" in the AI Relay window"
echo "  3. Grant Accessibility permission when you first use Paste into front app"
