#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="${AI_RELAY_INBOX_SERVER:-$SCRIPT_DIR/../shared/inbox-http-server.mjs}"
PIDFILE="${HOME}/Library/Application Support/AI Relay/inbox-bridge.pid"
LOG="/tmp/ai-relay-inbox-bridge.log"
HEALTH_URL="http://127.0.0.1:17831/health"

mkdir -p "$(dirname "$PIDFILE")"

bridge_running() {
  curl -fsS "$HEALTH_URL" >/dev/null 2>&1
}

if [[ -f "$PIDFILE" ]]; then
  existing_pid="$(cat "$PIDFILE")"
  if kill -0 "$existing_pid" 2>/dev/null && bridge_running; then
    exit 0
  fi
fi

pkill -f "inbox-http-server.mjs" 2>/dev/null || true
sleep 0.2

nohup node "$SERVER" >>"$LOG" 2>&1 &
echo "$!" > "$PIDFILE"
sleep 0.4

if ! bridge_running; then
  echo "AI Relay inbox bridge failed to start." >&2
  echo "Check $LOG" >&2
  exit 1
fi
