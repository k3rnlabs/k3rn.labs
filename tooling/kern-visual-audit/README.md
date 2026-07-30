# KERN Visual Gold Standard Pipeline

Pipeline repo-ready pour transformer des captures desktop/mobile, une URL et éventuellement un dépôt en :

1. cartographie structurée de la page ;
2. audit visuel et responsive ;
3. détection des marqueurs de génération IA ;
4. audit positionnement/CRO/copy ;
5. audit images et direction artistique ;
6. audit technique conditionnel ;
7. findings P0–P3 avec preuves ;
8. lots de remédiation ;
9. prompts d’implémentation et de vérification ;
10. comparaison avant/après et verdict indépendant.

Le système est conçu comme un sous-SaaS simple de **KERN Labs**. Il peut aussi fonctionner comme workflow interne entièrement piloté par agents.

## Contenu du ZIP

- `MASTER_PROMPT.md` — orchestrateur maître complet.
- `prompts/` — prompts spécialisés de chaque phase.
- `agent-skill/kern-visual-audit/` — skill installable dans le dépôt.
- `schemas/` — contrats JSON stricts.
- `workflows/` — workflow, gates, sévérités et routage des skills.
- `docs/` — PRD, architecture, UX, API, données, sécurité et roadmap.
- `database/supabase-schema.sql` — schéma Supabase multi-tenant minimal.
- `scripts/` — segmentation, création de runs et validation.
- `starter/` — types TypeScript et machine d’état.
- `prototype/visual-audit-console.html` — prototype statique Shadcn neutral/grey.
- `examples/mirava/` — exemple réel à partir des captures MIRAVA fournies.

## Intégration dans KERN Labs

Depuis la racine du dépôt :

```bash
unzip KERN_VISUAL_GOLD_STANDARD_PIPELINE_v1.0.1.zip
cp -R KERN_VISUAL_GOLD_STANDARD_PIPELINE/. .
```

Installer uniquement le skill KERN :

```bash
bash scripts/install-kern-skill.sh codex
```

Agents pris en charge : `codex`, `claude-code`, `cursor`, `antigravity`.

Installer les skills tiers :

```bash
bash skills/install-skills.sh codex project
```

## Modes d’audit

| Mode | Vérifiable |
|---|---|
| Captures | composition, proportions visibles, hiérarchie, images, responsive, marqueurs IA |
| Captures + URL | interactions, animations, navigation, console, réseau, accessibilité partielle |
| Captures + URL + dépôt | composants, DOM, CSS, tokens, SEO, performance, fichiers et corrections |

Le système ne doit jamais déclarer avoir vérifié une donnée absente des entrées.

## Cycle d’un run

```text
DRAFT
→ INPUTS_VALIDATED
→ PAGE_MAPPED
→ VISUAL_AUDITED
→ AI_FINGERPRINT_AUDITED
→ CRO_AUDITED
→ ART_DIRECTION_AUDITED
→ TECHNICAL_AUDITED ou TECHNICAL_SKIPPED
→ PRIORITIZED
→ PROMPTS_PACKAGED
→ IMPLEMENTATION_PENDING
→ VERIFICATION_PENDING
→ VERIFIED
→ FINAL_REVIEWED
→ COMPLETE
```

## Règle gold standard

Un score supérieur à 90/100 est interdit tant que :

- un P0 reste ouvert ;
- un P1 critique reste ouvert ;
- desktop et mobile n’ont pas été vérifiés ;
- les preuves ne sont pas localisées ;
- l’URL n’a pas été testée lorsqu’elle est disponible ;
- les claims de performance ou d’accessibilité ne sont pas mesurés.

## Limite du pack

Ce pack est une **spécification d’implémentation, un système de prompts et un starter contractuel complet**. Il ne constitue pas encore un SaaS déployé.
