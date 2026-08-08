import {
  createMiravaSessionShotPlan,
  type MiravaSessionShot,
} from "./shot-plan"
import {
  resolveMiravaSessionDirection,
  type MiravaResolvedSessionDirection,
} from "./resolve-session-direction"
import type {
  MiravaSessionBuilderReady,
} from "./schema"

export type MiravaSessionLookPromptItem = Readonly<{
  category: string
  label: string | null
  brand: string | null
  description: string | null
  viewKeys: readonly string[]
}>

export type MiravaSessionShotGenerationContext = Readonly<{
  direction: MiravaResolvedSessionDirection
  shot: MiravaSessionShot
  masterPrompt: string
  negativePrompt: string
}>

function customLookPrompt(items: readonly MiravaSessionLookPromptItem[]): string {
  const garments = items.map((item) => [
    item.category,
    item.label,
    item.brand ? `by ${item.brand}` : "",
    item.description,
    item.viewKeys.length ? `views: ${item.viewKeys.join(", ")}` : "",
  ].filter(Boolean).join(" "))

  return garments.length
    ? `WARDROBE LOCK — Reproduce this exact configured wardrobe consistently in every session shot: ${garments.join("; ")}. Do not substitute garments, accessories, colours, materials or styling.`
    : ""
}

export function buildMiravaSessionShotGenerationContext(args: {
  config: MiravaSessionBuilderReady
  shotIndex: number
  lookItems: readonly MiravaSessionLookPromptItem[]
  artisticReferenceDirection?: string | null
}): MiravaSessionShotGenerationContext {
  const direction = resolveMiravaSessionDirection(args.config)
  const shot = createMiravaSessionShotPlan(direction)[args.shotIndex]

  if (!shot) throw new Error("MIRAVA_SESSION_SHOT_MISSING")

  const wardrobe = direction.lookMode === "CUSTOM"
    ? customLookPrompt(args.lookItems)
    : [
        "ARTISTIC REFERENCE LOCK — Preserve only the approved reference wardrobe and photographic character.",
        args.artisticReferenceDirection?.trim() ?? "",
        "IDENTITY SEPARATION — The artistic reference is never an identity authority. Do not transfer its face, facial anatomy, body identity, skin identity or distinguishing physical characteristics. Identity comes exclusively from the consenting Identity Profile images.",
      ].filter(Boolean).join(" ")

  const masterPrompt = [
    "MIRAVA SESSION BUILDER V1 — Generate one coherent editorial studio photograph of the same adult identity.",
    `SET LOCK — ${direction.set.environmentPrompt}. ${direction.set.backgroundPrompt}. ${direction.set.floorPrompt ?? ""} ${direction.set.spatialPrompt}`,
    `LIGHT LOCK — ${direction.lighting.setupPrompt}. ${direction.lighting.subjectEffectPrompt}. ${direction.lighting.shadowPrompt}. ${direction.lighting.colorPrompt}`,
    `SHOT ${shot.shotIndex + 1}/6 (${shot.shotIntent}) — ${shot.framingPrompt}. ${shot.posePrompt}. ${shot.cameraPrompt}`,
    wardrobe,
    "CONTINUITY LOCK — Keep identity, set, lighting and wardrobe stable across the entire six-photo session. The shot plan controls pose, framing and composition; do not invent a different location or random composition.",
  ].filter(Boolean).join("\n\n")

  const negativePrompt = [
    ...direction.set.constraints,
    ...direction.lighting.constraints,
    "no identity change",
    "no wardrobe change",
    "no random composition",
  ].join(", ")

  return { direction, shot, masterPrompt, negativePrompt }
}
