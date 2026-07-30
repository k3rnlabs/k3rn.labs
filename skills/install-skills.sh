#!/usr/bin/env bash
set -euo pipefail
AGENT="${1:-codex}"
SCOPE="${2:-project}"
case "$AGENT" in codex|claude-code|cursor|antigravity) ;; *) echo "Use codex|claude-code|cursor|antigravity"; exit 1;; esac
GLOBAL_FLAG=""; [[ "$SCOPE" == "global" ]] && GLOBAL_FLAG="-g"
[[ "$SCOPE" == "project" || "$SCOPE" == "global" ]] || { echo "Scope: project|global"; exit 1; }

npx skills add getsentry/skills --skill skill-scanner --skill agents-md --skill find-bugs --skill code-review --skill security-review --skill code-simplifier --skill iterate-pr -a "$AGENT" $GLOBAL_FLAG -y
npx skills add coreyhaines31/marketingskills --skill product-marketing --skill copywriting --skill ai-seo -a "$AGENT" $GLOBAL_FLAG -y
npx skills add vercel-labs/agent-skills --skill web-design-guidelines --skill vercel-react-best-practices -a "$AGENT" $GLOBAL_FLAG -y
npx skills add supabase/agent-skills --skill supabase --skill supabase-postgres-best-practices -a "$AGENT" $GLOBAL_FLAG -y
npx skills add vercel-labs/agent-browser -a "$AGENT" $GLOBAL_FLAG -y

echo "UI/UX Pro Max: npx ui-ux-pro-max-cli init --ai ${AGENT/claude-code/claude}"
echo "Impeccable: npx impeccable skills install"
echo "Playwright: npm install -g @playwright/cli@latest && playwright-cli install --skills"
echo "Superpowers: follow https://github.com/obra/superpowers"
echo "Restart the harness after installation."
