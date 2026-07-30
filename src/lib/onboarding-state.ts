/**
 * OnboardingState — source de vérité serveur pour l'onboarding KAEL.
 *
 * Règles d'invariants :
 *  1. status === "COMPLETE" ↔ les 4 aspects ont une valeur non-vide
 *  2. recommendedLab est toujours dans VALID_LABS (toujours DISCOVERY pendant l'onboarding)
 *  3. currentQuestion pointe vers le premier aspect non confirmé (null si COMPLETE)
 *  4. stateSchemaVersion permet des migrations futures sans casser les données existantes
 */

export const STATE_SCHEMA_VERSION = 2

export const ASPECT_KEYS = ["problem", "target", "outcome", "constraint"] as const
export type AspectKey = (typeof ASPECT_KEYS)[number]

/** Étape C — step enum authoritative, source unique serveur */
export type OnboardingStep = "FREE_INPUT" | "IN_PROGRESS" | "COMPLETE"

export const ASPECT_LABELS: Record<AspectKey, string> = {
  problem: "Problème",
  target: "Cible",
  outcome: "Résultat",
  constraint: "Contrainte",
}

export const VALID_LABS = [
  "DISCOVERY",
  "STRUCTURATION",
  "VALIDATION_MARCHE",
  "DESIGN_PRODUIT",
  "ARCHITECTURE_TECHNIQUE",
  "BUSINESS_FINANCE",
] as const
export type OnboardingLab = (typeof VALID_LABS)[number]

/** @deprecated — utiliser `step` à la place. Conservé pour la migration DB. */
export type OnboardingStatus = "IN_PROGRESS" | "COMPLETE"

/**
 * Audit trail : chaque aspect stocke la réponse exacte de l'utilisateur
 * qui a permis de le confirmer, et le timestamp de confirmation.
 *
 * quality  : "strong" = réponse solide niveau pitch-seed (activable par les pôles)
 *            "weak"   = accepté après 2 challenges, à affiner plus tard
 * challengeCount : nombre de fois que KAEL a challengé cet aspect avant confirmation
 */
export interface ConfirmedAspectEntry {
  value: string
  confirmedAt: string
  quality?: "strong" | "weak"
  challengeCount?: number
}

export type ConfirmedAspects = Partial<Record<AspectKey, ConfirmedAspectEntry>>

export interface OnboardingState {
  stateSchemaVersion: number
  step: OnboardingStep
  status: OnboardingStatus          // dérivé de step (kept for compat)
  confirmedAspects: ConfirmedAspects
  currentQuestion: AspectKey | null
  recommendedLab: OnboardingLab
  completedAt?: string
}

// ─── Invariant checks ──────────────────────────────────────────────────────

/** Invariant 1 : COMPLETE exige les 4 aspects avec une valeur non-vide */
export function assertCanComplete(state: OnboardingState): asserts state is OnboardingState & { status: "COMPLETE" } {
  const missing = ASPECT_KEYS.filter((k) => !state.confirmedAspects[k]?.value?.trim())
  if (missing.length > 0) {
    throw new Error(`[OnboardingState] Cannot complete: missing aspects [${missing.join(", ")}]`)
  }
}

/** Invariant 2 : recommendedLab doit être dans VALID_LABS */
export function assertValidLab(lab: string): asserts lab is OnboardingLab {
  if (!VALID_LABS.includes(lab as OnboardingLab)) {
    throw new Error(`[OnboardingState] Invalid lab: "${lab}". Must be one of: ${VALID_LABS.join(", ")}`)
  }
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

export function isComplete(state: OnboardingState): boolean {
  const allPresent = ASPECT_KEYS.every((k) => !!state.confirmedAspects[k]?.value?.trim())
  if (!allPresent) return false
  return ASPECT_KEYS.every((k) => {
    const entry = state.confirmedAspects[k]
    if (!entry) return false
    if (entry.quality === "weak") return (entry.challengeCount ?? 0) >= 1
    return true
  })
}

/** Invariant 3 : premier aspect non confirmé */
export function nextAspect(confirmedAspects: ConfirmedAspects): AspectKey | null {
  return ASPECT_KEYS.find((k) => !confirmedAspects[k]?.value?.trim()) ?? null
}

/** Invariant 2 : valide + fallback DISCOVERY */
export function safeValidateLab(lab: string | undefined): OnboardingLab {
  if (lab && VALID_LABS.includes(lab as OnboardingLab)) return lab as OnboardingLab
  return "DISCOVERY"
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createInitialState(): OnboardingState {
  return {
    stateSchemaVersion: STATE_SCHEMA_VERSION,
    step: "FREE_INPUT",
    status: "IN_PROGRESS",
    confirmedAspects: {},
    currentQuestion: "problem",
    recommendedLab: "DISCOVERY",
  }
}

/**
 * Phrases indicating the user doesn't know yet — should NOT auto-confirm.
 */
const DONT_KNOW_PATTERNS = [
  /je (ne |n')?sais? pas/i,
  /je n'ai pas d'id[ée]e/i,
  /aucune id[ée]e/i,
  /pas s[uû]r/i,
  /je sais (rien|nothing)/i,
  /no idea/i,
  /don'?t know/i,
  /i don'?t/i,
  /hm+/i,
]

function isDontKnow(text: string): boolean {
  const t = text.trim()
  if (t.length === 0) return true
  return DONT_KNOW_PATTERNS.some((p) => p.test(t))
}

/**
 * Fusionne la réponse LLM + réponse utilisateur dans l'état persisté.
 *
 * Stratégie LLM-driven :
 * A) Le LLM juge la qualité sémantique — on lui fait confiance pour confirmer.
 * B) Guard serveur : si le LLM a challengé 2 fois sans confirmer, on force
 *    la confirmation en weak pour débloquer l'utilisateur.
 */
export function applyLLMResponse(
  existing: OnboardingState,
  llmAspects: AspectKey[],
  userMessage: string,
  llmQuality?: Partial<Record<AspectKey, "strong" | "weak">>,
  llmChallengeCount?: Partial<Record<AspectKey, number>>,
): OnboardingState {
  // État terminal → immuable
  if (existing.step === "COMPLETE") return existing

  // Aucune confirmation ne peut être fondée sur une réponse vide ou hésitante.
  // Le LLM peut continuer à guider l'utilisateur, mais l'audit trail reste intact.
  if (isDontKnow(userMessage)) return existing

  const confirmed: ConfirmedAspects = { ...existing.confirmedAspects }
  const now = new Date().toISOString()
  const trimmed = userMessage.trim()

  // ── LLM-driven confirmation (primary) ────────────────────────────────────
  // Le LLM juge la qualité sémantique — on lui fait confiance pour confirmer.
  // Guard anti-skip : un aspect weak ne peut pas être confirmé sans avoir été
  // challengé au moins 1 fois (challengeCount >= 1). S'il n'a pas été challengé,
  // il est enregistré comme weak non-challengé mais pas encore confirmé —
  // sauf si c'est le premier aspect (problem) qui peut être strong d'emblée.
  for (const aspect of llmAspects) {
    if (!ASPECT_KEYS.includes(aspect)) continue
    if (confirmed[aspect]) continue  // déjà confirmé — immuable

    const quality = llmQuality?.[aspect] ?? "strong"
    const challengeCount = llmChallengeCount?.[aspect] ?? 0

    // Guard : aspect weak sans challenge → ne pas confirmer, laisser en attente
    // Exception : "strong" peut être confirmé sans challenge
    if (quality === "weak" && challengeCount < 1) {
      // Stocker quand même avec challengeCount=0 pour que le prochain tour
      // sache qu'il doit challenger cet aspect
      confirmed[aspect] = {
        value: trimmed || (existing.confirmedAspects[aspect]?.value ?? ""),
        confirmedAt: now,
        quality: "weak",
        challengeCount: 0,
      }
      continue
    }

    confirmed[aspect] = {
      value: trimmed || (existing.confirmedAspects[aspect]?.value ?? ""),
      confirmedAt: now,
      quality,
      challengeCount,
    }
  }

  // ── Guard serveur : force weak après 4 challenges ─────────────────────────
  // Si le LLM a challengé 4 fois sans confirmer, on force la confirmation
  // en weak pour débloquer l'utilisateur — la valeur courante est acceptée
  const cq = existing.currentQuestion
  if (cq && !confirmed[cq] && trimmed) {
    const existingChallengeCount = existing.confirmedAspects[cq]?.challengeCount ?? 0
    const llmCount = llmChallengeCount?.[cq] ?? existingChallengeCount
    if (llmCount >= 4) {
      confirmed[cq] = {
        value: trimmed,
        confirmedAt: now,
        quality: "weak",
        challengeCount: llmCount,
      }
    }
  }

  // COMPLETE exige : 4 aspects avec valeur + chaque aspect weak challengé >= 1 fois
  const allPresent = ASPECT_KEYS.every((k) => !!confirmed[k]?.value?.trim())
  const allChallenged = ASPECT_KEYS.every((k) => {
    const entry = confirmed[k]
    if (!entry) return false
    if (entry.quality === "weak") return (entry.challengeCount ?? 0) >= 1
    return true // strong : pas besoin de challenge
  })
  const complete = allPresent && allChallenged
  const nextStep: OnboardingStep = complete ? "COMPLETE" : "IN_PROGRESS"

  return {
    stateSchemaVersion: STATE_SCHEMA_VERSION,
    step: nextStep,
    status: complete ? "COMPLETE" : "IN_PROGRESS",
    confirmedAspects: confirmed,
    currentQuestion: complete ? null : nextAspect(confirmed),
    recommendedLab: "DISCOVERY",
    completedAt: complete ? now : existing.completedAt,
  }
}

/**
 * Désérialise depuis la DB (JSON brut) avec migration de version si nécessaire.
 * Retourne un état initial si null/invalide.
 */
export function deserializeState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== "object") return createInitialState()

  const obj = raw as Record<string, unknown>
  const version = typeof obj.stateSchemaVersion === "number" ? obj.stateSchemaVersion : 0

  // ── Migration v0/v1 → v2 ─────────────────────────────────────────────────
  if (version < STATE_SCHEMA_VERSION) {
    const legacy = obj.confirmedAspects as Record<string, unknown> | undefined
    const migrated: ConfirmedAspects = {}
    if (legacy) {
      for (const k of ASPECT_KEYS) {
        if (typeof legacy[k] === "string") {
          migrated[k] = { value: legacy[k] as string, confirmedAt: new Date(0).toISOString(), quality: "strong", challengeCount: 0 }
        } else if (legacy[k] && typeof legacy[k] === "object") {
          const entry = legacy[k] as ConfirmedAspectEntry
          migrated[k] = {
            ...entry,
            quality: entry.quality ?? "strong",
            challengeCount: entry.challengeCount ?? 0,
          }
        }
      }
    }
    const complete = ASPECT_KEYS.every((k) => !!migrated[k]?.value?.trim())
    const hasAnyConfirmed = Object.keys(migrated).length > 0
    const step: OnboardingStep = complete ? "COMPLETE" : hasAnyConfirmed ? "IN_PROGRESS" : "FREE_INPUT"
    return {
      stateSchemaVersion: STATE_SCHEMA_VERSION,
      step,
      status: complete ? "COMPLETE" : "IN_PROGRESS",
      confirmedAspects: migrated,
      currentQuestion: nextAspect(migrated),
      recommendedLab: safeValidateLab(obj.recommendedLab as string),
      completedAt: obj.completedAt as string | undefined,
    }
  }

  // ── v2 ───────────────────────────────────────────────────────────────────
  const confirmedAspects = (obj.confirmedAspects ?? {}) as ConfirmedAspects
  const complete = ASPECT_KEYS.every((k) => !!confirmedAspects[k]?.value?.trim())
  const rawStep = obj.step as OnboardingStep | undefined
  const step: OnboardingStep = complete ? "COMPLETE" : (rawStep ?? "FREE_INPUT")

  return {
    stateSchemaVersion: STATE_SCHEMA_VERSION,
    step,
    status: complete ? "COMPLETE" : "IN_PROGRESS",
    confirmedAspects,
    currentQuestion: nextAspect(confirmedAspects),
    recommendedLab: safeValidateLab(obj.recommendedLab as string),
    completedAt: obj.completedAt as string | undefined,
  }
}

/** Shape attendu côté UI (exposé via API) */
export interface OnboardingStateDTO {
  step: OnboardingStep
  status: OnboardingStatus
  confirmedAspects: Partial<Record<AspectKey, string>>
  aspectQuality: Partial<Record<AspectKey, "strong" | "weak">>
  currentQuestion: AspectKey | null
  recommendedLab: OnboardingLab
  completedAt?: string
}

export function toDTO(state: OnboardingState): OnboardingStateDTO {
  const aspects: Partial<Record<AspectKey, string>> = {}
  const quality: Partial<Record<AspectKey, "strong" | "weak">> = {}
  for (const k of ASPECT_KEYS) {
    if (state.confirmedAspects[k]) {
      aspects[k] = state.confirmedAspects[k]!.value
      quality[k] = state.confirmedAspects[k]!.quality ?? "strong"
    }
  }
  return {
    step: state.step,
    status: state.status,
    confirmedAspects: aspects,
    aspectQuality: quality,
    currentQuestion: state.currentQuestion,
    recommendedLab: state.recommendedLab,
    completedAt: state.completedAt,
  }
}
