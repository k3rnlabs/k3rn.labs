// Physical traits — distinctive body characteristics for AI generation fidelity

export const BODY_ZONES = [
  "neck",
  "chest",
  "left-arm",
  "right-arm",
  "left-forearm",
  "right-forearm",
  "left-wrist",
  "right-wrist",
  "back",
  "shoulder",
  "hand",
  "finger",
  "ankle",
  "leg",
  "collarbone",
  "face",
  "other",
] as const

export const TRAIT_KINDS = ["tattoo", "scar", "birthmark", "piercing", "other"] as const

export type BodyZone = typeof BODY_ZONES[number]
export type TraitKind = typeof TRAIT_KINDS[number]

export type PhysicalTrait = {
  id: string
  kind: TraitKind
  zone: BodyZone
  description: string
}

export type PhysicalTraitsPayload = {
  items: PhysicalTrait[]
}

export const BODY_ZONE_LABELS: Record<BodyZone, Record<"fr" | "es", string>> = {
  neck: { fr: "Cou", es: "Cuello" },
  chest: { fr: "Poitrine", es: "Pecho" },
  "left-arm": { fr: "Bras gauche", es: "Brazo izquierdo" },
  "right-arm": { fr: "Bras droit", es: "Brazo derecho" },
  "left-forearm": { fr: "Avant-bras gauche", es: "Antebrazo izquierdo" },
  "right-forearm": { fr: "Avant-bras droit", es: "Antebrazo derecho" },
  "left-wrist": { fr: "Poignet gauche", es: "Muñeca izquierda" },
  "right-wrist": { fr: "Poignet droit", es: "Muñeca derecha" },
  back: { fr: "Dos", es: "Espalda" },
  shoulder: { fr: "Épaule", es: "Hombro" },
  hand: { fr: "Main", es: "Mano" },
  finger: { fr: "Doigt", es: "Dedo" },
  ankle: { fr: "Cheville", es: "Tobillo" },
  leg: { fr: "Jambe", es: "Pierna" },
  collarbone: { fr: "Clavicule", es: "Clavícula" },
  face: { fr: "Visage", es: "Rostro" },
  other: { fr: "Autre", es: "Otro" },
}

export const TRAIT_KIND_LABELS: Record<TraitKind, Record<"fr" | "es", string>> = {
  tattoo: { fr: "Tatouage", es: "Tatuaje" },
  scar: { fr: "Cicatrice", es: "Cicatriz" },
  birthmark: { fr: "Grain de beauté / tache", es: "Lunar / marca de nacimiento" },
  piercing: { fr: "Piercing", es: "Piercing" },
  other: { fr: "Autre caractéristique", es: "Otra característica" },
}

export const TRAIT_KIND_EMOJIS: Record<TraitKind, string> = {
  tattoo: "🖋️",
  scar: "〰️",
  birthmark: "●",
  piercing: "◉",
  other: "✦",
}

export const MAX_TRAITS = 12
export const MAX_DESCRIPTION_LENGTH = 100

export function isValidPhysicalTrait(trait: unknown): trait is PhysicalTrait {
  if (!trait || typeof trait !== "object") return false
  const t = trait as Record<string, unknown>
  return (
    typeof t.id === "string" && t.id.length > 0 &&
    TRAIT_KINDS.includes(t.kind as TraitKind) &&
    BODY_ZONES.includes(t.zone as BodyZone) &&
    typeof t.description === "string" && t.description.length > 0 && t.description.length <= MAX_DESCRIPTION_LENGTH
  )
}

export function parsePhysicalTraits(raw: unknown): PhysicalTrait[] {
  if (!raw || typeof raw !== "object") return []
  const payload = raw as Record<string, unknown>
  if (!Array.isArray(payload.items)) return []
  return payload.items.filter(isValidPhysicalTrait)
}

const ZONE_EN: Record<BodyZone, string> = {
  neck: "neck",
  chest: "chest",
  "left-arm": "left upper arm",
  "right-arm": "right upper arm",
  "left-forearm": "left forearm",
  "right-forearm": "right forearm",
  "left-wrist": "left wrist",
  "right-wrist": "right wrist",
  back: "back",
  shoulder: "shoulder",
  hand: "hand",
  finger: "finger",
  ankle: "ankle",
  leg: "leg",
  collarbone: "collarbone",
  face: "face",
  other: "body",
}

const KIND_EN: Record<TraitKind, string> = {
  tattoo: "tattoo",
  scar: "scar",
  birthmark: "birthmark",
  piercing: "piercing",
  other: "distinctive mark",
}

/**
 * Generates an English prompt segment for identity-invariant physical traits.
 * Injected into the generation prompt right after IDENTITY INVARIANT.
 */
export function formatPhysicalTraitsForPrompt(traits: PhysicalTrait[]): string {
  if (!traits.length) return ""
  const lines = traits.map((t) => `- ${t.description} (${KIND_EN[t.kind]} on ${ZONE_EN[t.zone]})`).join("\n")
  return [
    "PHYSICAL TRAITS INVARIANT — The subject has the following distinctive physical characteristics that must be reproduced faithfully and consistently wherever anatomically visible in the scene:",
    lines,
    "Do not erase, cover, or reinterpret these characteristics.",
  ].join("\n")
}
