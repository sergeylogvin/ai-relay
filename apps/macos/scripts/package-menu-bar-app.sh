#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MENU_BAR_DIR="$ROOT/apps/macos/MenuBar"
BINARY_PATH="$MENU_BAR_DIR/.build/arm64-apple-macosx/release/AIRelayMenuBar"
APP_DIR="$MENU_BAR_DIR/dist/AIRelayMenuBar.app"
APP_BINARY="$APP_DIR/Contents/MacOS/AIRelayMenuBar"

bash "$ROOT/apps/macos/scripts/build-menu-bar.sh"

mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources/inbox-bridge"

cat > "$APP_DIR/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>AIRelayMenuBar</string>
  <key>CFBundleIdentifier</key>
  <string>com.ai-relay.menu-bar</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>AI Relay</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSAppleEventsUsageDescription</key>
  <string>AI Relay pastes captured handoffs into the frontmost desktop app.</string>
</dict>
</plist>
EOF

cp "$BINARY_PATH" "$APP_BINARY"
chmod +x "$APP_BINARY"

BRIDGE_DIR="$APP_DIR/Contents/Resources/inbox-bridge"
cp "$ROOT/apps/macos/shared/inbox-http-server.mjs" "$BRIDGE_DIR/inbox-http-server.mjs"
cp "$ROOT/apps/macos/shared/inbox-bridge-config.mjs" "$BRIDGE_DIR/inbox-bridge-config.mjs"
cp "$ROOT/apps/macos/shared/handoff-inbox.mjs" "$BRIDGE_DIR/handoff-inbox.mjs"

cat > "$BRIDGE_DIR/start-inbox-bridge.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="$SCRIPT_DIR/inbox-http-server.mjs"
PIDFILE="${HOME}/Library/Application Support/AI Relay/inbox-bridge.pid"
LOG="/tmp/ai-relay-inbox-bridge.log"
HEALTH_URL="http://127.0.0.1:17831/health"

mkdir -p "$(dirname "$PIDFILE")"

if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  exit 0
fi

pkill -f "inbox-http-server.mjs" 2>/dev/null || true
sleep 0.2
nohup node "$SERVER" >>"$LOG" 2>&1 &
echo "$!" > "$PIDFILE"
sleep 0.4
curl -fsS "$HEALTH_URL" >/dev/null
EOF
chmod +x "$BRIDGE_DIR/start-inbox-bridge.sh"

echo ""
echo "Packaged menu bar app at:"
echo "  $APP_DIR"
echo ""
echo "Launch with:"
echo "  open \"$APP_DIR\""
