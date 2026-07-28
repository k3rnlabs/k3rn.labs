# K3RN — Instructions Codex

## LECTURE OBLIGATOIRE EN DEBUT DE SESSION

Avant tout travail, lire dans l'ordre :
1. **Ce fichier** (AGENTS.md) — stack, règles, architecture
2. **`.Codex/rules/project-state.md`** — état vivant du projet, dernières avancées, next steps
3. **`memory/MEMORY.md`** (auto-memory Codex) — patterns, fichiers clés, workflows n8n

Ces 3 fichiers constituent le contexte minimum pour travailler sur K3RN sans régresser ni dupliquer du travail déjà fait.

---

## Stack
Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL (Supabase) · OpenAI gpt-4o · Stripe · Upstash Redis · ReactFlow · Zustand · TanStack Query · Radix UI · Tailwind CSS

## Règles impératives

### 1. Changelog — OBLIGATOIRE
Après tout changement de code : mettre à jour `CHANGELOG.md` à la racine.
Format : `FIX:` / `FEATURE:` / `REFACTOR:` / `CHORE:` · une ligne par changement · section `## YYYY-MM-DD`.
Voir `.Codex/rules/changelog.md` pour le détail complet.

### 2b. Mise à jour documentation — OBLIGATOIRE
Après toute feature significative ou changement architectural :
- Mettre à jour `.Codex/rules/project-state.md` (section "Dernières avancées" + "État des modules")
- Mettre à jour `memory/progress.md` si une phase ou un module change de statut
- Voir `.Codex/rules/documentation-process.md` pour le process complet

### 2. TypeCheck avant tout commit
```bash
npx tsc --noEmit
```
Ne jamais livrer avec des erreurs TypeScript.

### 4. Pas d'over-engineering
Modifier uniquement ce qui est demandé. Pas de refacto non sollicitée, pas de helpers superflus, pas de feature flags.

### 5. Design & Typography
- Pas de polices Mono, Serif ou techniques (Space Grotesk) — **Inter** (sans) et **Plus Jakarta Sans** (display) uniquement.
- Utiliser `font-jakarta` pour les titres et métadonnées premium.
- Favoriser le liquid glassmorphism (shimmer, border white/8, backdrop blur).

---

## Architecture — Règles critiques

### Base de données
- Utiliser `src/lib/db.ts` (wrapper Supabase `DbModel`) — **pas** Prisma Client direct en production
- Toutes les migrations via `prisma migrate dev` ou Supabase MCP

### IA / LLM
- LLM principal : OpenAI `gpt-4o` via `OPENAI_API_KEY`
- Tous les appels LLM passent par `callLLMProxy()` dans `src/lib/n8n.ts` — jamais d'instance OpenAI directe
- Appels complexes (pôles experts) → `invokeN8nPole()` via webhook n8n dédié
- `src/lib/Codex.ts` : invokeKAEL (Chief of Staff), invokeChefDeProjet (onboarding), generateKAELOpener, triggerKAELPostSessionNote, detectPoleRouting
- `src/lib/n8n.ts` : callLLMProxy, invokeN8nPole, callN8nTool, notifySlack, sendEmail
- Voir `.Codex/rules/llm-calls.md` pour le détail complet et les interdits

### Onboarding (KAEL)
- `OnboardingState` est **authoritative côté serveur** — jamais dériver `isComplete` uniquement côté client
- `fileContextSchema` Zod accepte `kind: "text" | "image" | "binary"` — ne pas réduire l'enum
- Filtrer `kind === "binary"` côté client avant envoi au LLM (pas de content/dataUrl utile)
- Textarea auto-resize cappée à `max-h-[200px]` via `useAutoResize` (lit `getComputedStyle.maxHeight`)

### n8n
- Architecture : `K3RN app → n8n MCP → [slack|email|audit|budget]`
- Jamais Zapier direct depuis l'app
- Pattern sub-workflow : `toolWorkflow` v2.2 (Execute Workflow Trigger)

### 2.8 Missions & Dossiers
- **Dossiers** : Gratuits, servent de conteneurs de regroupement.
- **Missions** : Unité de facturation/quota (30 par défaut). Toute interaction experte ou création de dossier **doit** décrémenter le budget mission.
- **Automatisation** : Ne pas recréer de processus manuel de création de mission ; le système doit rester fluide et automatique.

---

## Fichiers critiques

| Fichier | Rôle |
|---------|------|
| `src/lib/Codex.ts` | invokeKAEL (Chief of Staff), invokeChefDeProjet (onboarding), generateKAELOpener, triggerKAELPostSessionNote |
| `src/lib/n8n.ts` | callLLMProxy, invokeN8nPole, callN8nTool, notifySlack, sendEmail |
| `src/lib/project-memory.ts` | buildProjectMemory — brief structuré injecté dans KAEL |
| `src/lib/score-engine.ts` | computeAndPersistScore — 4 dimensions, quality multiplier |
| `src/lib/db.ts` | Wrapper Supabase (DbModel) |
| `src/lib/permissions.ts` | canExport, canCreateCrowdfunding (async) |
| `src/lib/onboarding-state.ts` | State machine onboarding — deserializeState, applyLLMResponse, toDTO |
| `src/lib/validate.ts` | validateBody, apiError, apiSuccess |
| `src/lib/supabase-storage.ts` | Upload/Delete logic for avatars |
| `src/app/api/poles/sessions/[sessionId]/route.ts` | Session pôle — messages + triggerKAELPostSessionNote |
| `src/app/api/stories/render/route.ts` | Instagram Story Rendering (Satori) |
| `src/app/api/user/referral/route.ts` | Referral slug & stats logic |
| `prisma/schema.prisma` | Schéma complet |
| `src/hooks/use-auto-resize.ts` | Textarea auto-resize avec max-height |
| `src/hooks/use-file-extract.ts` | Extraction fichiers (text/image/binary) |

---

## MCP Servers disponibles

### n8n MCP
Workflows K3RN, gestion nodes, validation. Voir `memory/MEMORY.md` pour IDs des workflows actifs.

### Context7 MCP
Doc live des librairies tierces. Utiliser systématiquement : `resolve-library-id` → `query-docs`.

### Supabase MCP
Accès DB direct, migrations, edge functions, logs.

### Chrome DevTools MCP
Déboguer l'app live dans le browser (console, réseau, screenshots, performance).
Config : `{ "chrome-devtools": { "command": "npx", "args": ["chrome-devtools-mcp@latest"] } }`
Voir `memory/chrome-devtools-mcp.md`.

---

## Pôles KAEL

| Code | Manager | Hashtags |
|------|---------|----------|
| P01_STRATEGIE | AXEL | #brainstorming #strategie #pitch |
| P02_MARKET | MAYA | #market #veille #concurrents |
| P03_PRODUIT_TECH | KAI | #produit #tech #mvp |
| P04_FINANCE | ELENA | #finance #budget #investisseur |
| P05_MARKETING | SKY | #marketing #brand #seo |
| P06_LEGAL | MARCUS | #legal #rgpd #contrat |
| P07_TALENT_OPS | NOVA | #talent #ops #recrutement |

Les photos des experts (format **`.webp`** obligatoire) sont organisées en deux flux :
- **Landing Page** : Utiliser `public/images/experts/*_transparent.webp` (fond transparent haute fidélité).
- **WebApp UI** : Utiliser `public/images/experts/*.webp` (format profil standard pour le Dock, Chat, etc.).
Les originaux se trouvent dans `docs/experts/` et doivent être synchronisés vers `public/images/experts/`.

---

## Skills — Quand les utiliser

| Skill | Déclencheur |
|-------|-------------|
| `brainstorming` | AVANT tout travail créatif (features, composants, archi) |
| `architecture` | Décisions archi, trade-offs, ADR |
| `ai-agents-architect` | Concevoir agent IA, tool use, orchestration |
| `workflow-automation` | n8n vs Temporal vs Inngest, patterns durables |
| `api-design-principles` | Conception ou review d'API REST/GraphQL |
| `simplify` | Review code après écriture |

Invoquer le skill **avant** de répondre sur le sujet concerné.
