#!/usr/bin/env bash
set -euo pipefail
AGENT="${1:-codex}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/agent-skill/kern-visual-audit"
case "$AGENT" in
  codex|antigravity) TARGET=".agents/skills/kern-visual-audit";;
  claude-code) TARGET=".claude/skills/kern-visual-audit";;
  cursor) TARGET=".cursor/skills/kern-visual-audit";;
  *) echo "Use codex|claude-code|cursor|antigravity"; exit 1;;
esac
mkdir -p "$(dirname "$TARGET")"; rm -rf "$TARGET"; cp -R "$SOURCE" "$TARGET"
echo "Installed at $TARGET. Restart your harness."
