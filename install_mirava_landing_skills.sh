#!/usr/bin/env bash
set -euo pipefail

AGENT="codex"
ALLOW_DIRTY="false"
DRY_RUN="false"
INSTALL_TOOLS="false"

usage() {
  cat <<'EOF'
Usage:
  bash install_mirava_landing_skills.sh [options]

Options:
  --agent <codex|claude-code|cursor|antigravity>
  --allow-dirty       Autorise un dépôt contenant déjà des modifications.
  --dry-run           Affiche les commandes sans les exécuter.
  --install-tools     Installe également Playwright CLI globalement.
  -h, --help

Exemple recommandé:
  bash install_mirava_landing_skills.sh --agent codex
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      AGENT="${2:-}"
      shift 2
      ;;
    --allow-dirty)
      ALLOW_DIRTY="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --install-tools)
      INSTALL_TOOLS="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Option inconnue: $1" >&2
      usage
      exit 1
      ;;
  esac
done

case "$AGENT" in
  codex|claude-code|cursor|antigravity) ;;
  *)
    echo "Agent non pris en charge: $AGENT" >&2
    exit 1
    ;;
esac

if ! command -v git >/dev/null 2>&1; then
  echo "Git est requis." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est requis." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx est requis." >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "Lance ce script depuis un dépôt Git." >&2
  exit 1
fi
cd "$ROOT"

if [[ "$ALLOW_DIRTY" != "true" ]] && [[ -n "$(git status --porcelain)" ]]; then
  echo "Le dépôt contient déjà des modifications." >&2
  echo "Commit/stash d'abord, ou relance avec --allow-dirty." >&2
  exit 1
fi

LOG_DIR=".kern/skill-install"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/mirava-skills-$STAMP.log"

run() {
  printf '\n$ %q ' "$1" | tee -a "$LOG_FILE"
  shift
  printf '%q ' "$@" | tee -a "$LOG_FILE"
  printf '\n' | tee -a "$LOG_FILE"

  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi

  "$@" 2>&1 | tee -a "$LOG_FILE"
}

echo "KERN / MIRAVA landing skills install" | tee "$LOG_FILE"
echo "Repository: $ROOT" | tee -a "$LOG_FILE"
echo "Agent: $AGENT" | tee -a "$LOG_FILE"
echo "Node: $(node --version)" | tee -a "$LOG_FILE"
echo "Git before:" | tee -a "$LOG_FILE"
git status --short --branch | tee -a "$LOG_FILE"

# 1. Trust and repository context.
run env npx -y skills add getsentry/skills \
  --skill skill-scanner \
  --skill agents-md \
  -a "$AGENT" \
  -y

# 2. Positioning, CRO and copy.
run env npx -y skills add coreyhaines31/marketingskills \
  --skill product-marketing \
  --skill copywriting \
  --skill ai-seo \
  -a "$AGENT" \
  -y

# 3. Visual quality, accessibility and React/Next.js performance.
run env npx -y skills add vercel-labs/agent-skills \
  --skill web-design-guidelines \
  --skill vercel-react-best-practices \
  -a "$AGENT" \
  -y

# 4. Review after implementation.
run env npx -y skills add getsentry/skills \
  --skill find-bugs \
  --skill code-review \
  --skill code-simplifier \
  -a "$AGENT" \
  -y

# 5. Playwright skill instructions. The executable is handled separately below.
run env npx -y skills add \
  https://github.com/microsoft/playwright-cli/tree/main/skills/playwright-cli \
  -a "$AGENT" \
  -y

# 6. UI/UX Pro Max uses its own installer.
UI_AGENT="$AGENT"
if [[ "$AGENT" == "claude-code" ]]; then
  UI_AGENT="claude"
fi
run env npx -y uipro-cli init --ai "$UI_AGENT"

# 7. Impeccable compiles a harness-specific project installation.
IMPECCABLE_PROVIDER="$AGENT"
if [[ "$AGENT" == "claude-code" ]]; then
  IMPECCABLE_PROVIDER="claude"
fi
run env npx -y impeccable skills install \
  -y \
  --providers="$IMPECCABLE_PROVIDER" \
  --scope=project

if [[ "$INSTALL_TOOLS" == "true" ]]; then
  run env npm install -g @playwright/cli@latest
  run env playwright-cli install --skills
fi

echo
echo "Git after:" | tee -a "$LOG_FILE"
git status --short --branch | tee -a "$LOG_FILE"

cat <<EOF | tee -a "$LOG_FILE"

Installation terminée.

À faire maintenant:
1. Examiner le diff:
   git status --short
   git diff --stat

2. Redémarrer $AGENT.

3. Dans l'agent, lancer:
   Utilise skill-scanner pour auditer tous les skills ajoutés par le dernier diff.
   Ne modifie rien. Signale scripts, hooks, accès réseau, permissions et risques supply-chain.

4. Puis lancer le prompt MIRAVA V3 uniquement après validation du scan.

Playwright CLI:
  $(if command -v playwright-cli >/dev/null 2>&1; then echo "déjà disponible"; else echo "non installé globalement — exécuter: npm install -g @playwright/cli@latest && playwright-cli install --skills"; fi)

Motion:
  N'est pas installé automatiquement.
  Installer la bibliothèque seulement si le plan approuvé exige une animation fonctionnelle:
    pnpm add motion
  Skill/AI Kit officiel optionnel:
    npx motion-ai@latest

React Bits:
  Ne pas installer toute la bibliothèque.
  Ajouter seulement un composant approuvé avec la commande affichée sur sa page React Bits.
EOF

echo
echo "Log: $LOG_FILE"
