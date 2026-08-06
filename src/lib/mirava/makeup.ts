import { z } from "zod"

export const MIRAVA_MAKEUP_VERSION = "1.0.0" as const

export const miravaMakeupModeSchema = z.enum([
  "auto_reference",
  "none",
  "natural",
  "soft_glam",
  "glam",
  "editorial",
])

export const miravaMakeupIntensitySchema = z.enum([
  "light",
  "medium",
  "strong",
])

export type MiravaMakeupMode = z.infer<typeof miravaMakeupModeSchema>
export type MiravaMakeupIntensity = z.infer<typeof miravaMakeupIntensitySchema>

export type MiravaMakeupConfig = {
  mode: MiravaMakeupMode
  intensity: MiravaMakeupIntensity
}

const creativeOptionsMakeupSchema = z.object({
  makeupMode: miravaMakeupModeSchema.optional(),
  makeupIntensity: miravaMakeupIntensitySchema.optional(),
}).passthrough()

const modeContracts: Record<MiravaMakeupMode, string[]> = {
  auto_reference: [
    "REFERENCE-AWARE MAKEUP — Treat makeup as a temporary cosmetic styling layer, never as identity.",
    "Use the makeup description already encoded in the approved artistic direction as the authority for complexion finish, coverage level, brows, eyeshadow placement and color, eyeliner, lashes, blush, contour, highlight, lip color and lip finish.",
    "When visible reference makeup is described, transfer only that cosmetic design onto the preserved consenting adult identity. Preserve its visible intensity; do not strengthen or weaken it. Do not transfer facial anatomy, facial proportions, skin identity or distinctive traits from the artistic reference person.",
    "When makeup is absent, visually negligible or not discernible in the approved direction, apply refined camera-ready natural makeup: lightweight complexion evening, softly groomed brows, subtle lash definition, restrained neutral blush and a natural satin lip. The result must read as professionally prepared, not bare-faced and not heavily made up.",
  ],
  none: [
    "NO MAKEUP — Keep the subject visibly makeup-free.",
    "Preserve natural skin texture, natural brows, natural lashes and natural lip color. Do not add foundation, contour, blush, eyeshadow, eyeliner, false lashes, lipstick, gloss or cosmetic highlight.",
  ],
  natural: [
    "NATURAL CAMERA-READY MAKEUP — Apply sheer-to-light complexion correction while preserving pores, freckles and realistic skin texture.",
    "Use softly groomed brows, subtle neutral eyelid definition, naturally separated lashes, restrained blush and a natural satin lip close to the subject's own lip tone.",
    "The finish must look professionally prepared in person and under editorial lighting without appearing visibly heavy.",
  ],
  soft_glam: [
    "SOFT GLAM MAKEUP — Apply polished medium-light complexion coverage with realistic skin texture and a refined luminous-satin finish.",
    "Use softly sculpted brows, blended neutral eyeshadow, controlled eyeliner, defined but believable lashes, balanced blush, subtle contour and highlight, and a polished satin or softly glossy lip.",
    "Keep the result elegant, contemporary and camera-ready rather than theatrical.",
  ],
  glam: [
    "GLAM MAKEUP — Apply polished medium complexion coverage with controlled dimensional contour, highlight and a refined editorial skin finish while preserving pores and believable texture.",
    "Use defined brows, structured blended eye makeup, precise eyeliner, fuller but anatomically believable lashes, visible blush and a deliberate lip color with a clean professional edge.",
    "The result may be striking, but it must remain photorealistic, balanced with the lighting and faithful to the subject's identity.",
  ],
  editorial: [
    "EDITORIAL MAKEUP — Create a deliberate high-fashion cosmetic concept coherent with the approved wardrobe, palette, lighting and photographic genre.",
    "Allow graphic or unusual color placement only when it supports the reference direction. Keep application technically precise, symmetrical where intended and physically plausible on real skin.",
    "The cosmetic concept must enhance the art direction without redesigning the face or obscuring recognizable identity.",
  ],
}

const intensityContracts: Record<MiravaMakeupIntensity, string> = {
  light: "INTENSITY: LIGHT — Keep color saturation, coverage, contour, liner and lash volume restrained.",
  medium: "INTENSITY: MEDIUM — Keep the makeup clearly camera-ready and visible while balanced with the face, wardrobe and lighting.",
  strong: "INTENSITY: STRONG — Make the selected cosmetic direction unmistakable and editorially resolved, while retaining realistic skin, clean application and recognizable identity.",
}

const invariantContract = [
  "COSMETIC IDENTITY LOCK — Makeup is a surface-level styling layer only.",
  "Preserve the exact recognizable identity, natural age, facial geometry, face width, eye shape and spacing, nose anatomy, lip anatomy, jawline, cheek structure, skin tone family and natural facial proportions from the identity references.",
  "Do not use contour, overlining, brow reshaping, lash design or skin smoothing to change the subject into a different person.",
  "Preserve real skin micro-texture beneath complexion products: pores, fine lines and natural tonal variation must remain plausible.",
].join(" ")

const makeupNegativeGuardrails = [
  "makeup changing facial identity",
  "altered facial geometry",
  "different eye shape",
  "different nose shape",
  "different lip anatomy",
  "extreme lip overlining",
  "identity-changing contour",
  "plastic skin",
  "wax skin",
  "airbrushed poreless face",
  "mask-like foundation",
  "muddy eyeshadow",
  "asymmetric accidental eyeliner",
  "melted eyelashes",
  "duplicated eyelashes",
  "cosmetics floating outside facial anatomy",
].join(", ")

const AVOID_SEPARATOR = "\n\nAvoid:"

export function resolveMiravaMakeupConfig(creativeOptions: unknown): MiravaMakeupConfig {
  const parsed = creativeOptionsMakeupSchema.safeParse(creativeOptions ?? {})
  if (!parsed.success) {
    return { mode: "auto_reference", intensity: "medium" }
  }
  return {
    mode: parsed.data.makeupMode ?? "auto_reference",
    intensity: parsed.data.makeupIntensity ?? "medium",
  }
}

export function buildMiravaMakeupDirection(config: MiravaMakeupConfig): {
  positivePrompt: string
  negativeGuardrails: string
} {
  const positivePrompt = [
    `MIRAVA MAKEUP LAYER v${MIRAVA_MAKEUP_VERSION}`,
    ...modeContracts[config.mode],
    config.mode === "none" || config.mode === "auto_reference"
      ? ""
      : intensityContracts[config.intensity],
    invariantContract,
  ].filter(Boolean).join(" ")

  return { positivePrompt, negativeGuardrails: makeupNegativeGuardrails }
}

export function applyMiravaMakeupDirection(prompt: string, creativeOptions: unknown): string {
  const makeup = buildMiravaMakeupDirection(resolveMiravaMakeupConfig(creativeOptions))
  const separatorIndex = prompt.indexOf(AVOID_SEPARATOR)

  if (separatorIndex < 0) {
    return [prompt.trim(), makeup.positivePrompt, `Avoid: ${makeup.negativeGuardrails}`]
      .filter(Boolean)
      .join("\n\n")
  }

  const positive = prompt.slice(0, separatorIndex).trim()
  const existingNegative = prompt.slice(separatorIndex + AVOID_SEPARATOR.length).trim()

  return [
    positive,
    makeup.positivePrompt,
    `Avoid: ${[existingNegative, makeup.negativeGuardrails].filter(Boolean).join(", ")}`,
  ].filter(Boolean).join("\n\n")
}
