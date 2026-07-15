#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUTPUT="$ROOT/apps/macos/MenuBar/.build/arm64-apple-macosx/release/AIRelayMenuBar"

cd "$ROOT/apps/macos/MenuBar"
swift build -c release

echo ""
echo "Built menu bar app at:"
echo "  $OUTPUT"
echo ""
echo "Run it with:"
echo "  open \"$OUTPUT\""
