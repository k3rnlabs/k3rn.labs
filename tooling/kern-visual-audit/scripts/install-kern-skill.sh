#!/usr/bin/env bash
set -euo pipefail

AGENT="${1:-codex}"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/agent-skill/kern-visual-audit"

case "$AGENT" in
  codex)
    TARGET="${CODEX_HOME:-$HOME/.codex}/skills/kern-visual-audit"
    ;;
  claude-code)
    TARGET=".claude/skills/kern-visual-audit"
    ;;
  cursor)
    TARGET=".cursor/skills/kern-visual-audit"
    ;;
  antigravity)
    TARGET=".agents/skills/kern-visual-audit"
    ;;
  *)
    echo "Use: codex | claude-code | cursor | antigravity"
    exit 1
    ;;
esac

mkdir -p "$(dirname "$TARGET")"
rm -rf "$TARGET"
cp -R "$SOURCE" "$TARGET"
echo "Installed KERN Visual Audit skill at $TARGET"
echo "Restart your coding harness so it discovers the skill."
