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

const FRAMING_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "framing"
    ],
    string
  > = {
    PORTRAIT:
      "portrait crop focused on face and shoulders",
    BUST:
      "bust framing from head to approximately the waist",
    MID_BODY:
      "mid-body framing from head to approximately mid-thigh",
    FULL_BODY:
      "full-body framing with the entire body and footwear visible",
    FREE:
      "",
  }

const POSE_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "pose"
    ],
    string
  > = {
    STANDING:
      "standing pose with natural believable weight distribution",
    SEATED:
      "seated pose with anatomically coherent posture and natural contact with the seat",
    MOVEMENT:
      "controlled natural movement with anatomically coherent limbs and believable motion",
    STATIC_PORTRAIT:
      "static portrait pose with restrained body movement and natural posture",
    FREE:
      "",
  }

const EXPRESSION_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "expression"
    ],
    string
  > = {
    NEUTRAL:
      "neutral natural expression",
    SOFT_SMILE:
      "subtle soft smile",
    SMILE:
      "natural visible smile",
    SERIOUS:
      "serious composed expression",
    CONFIDENT:
      "confident composed expression",
    FREE:
      "allow a natural expression appropriate to the photograph",
  }

const GAZE_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "gaze"
    ],
    string
  > = {
    CAMERA:
      "gaze directed toward the camera",
    OFF_CAMERA:
      "gaze directed naturally away from the camera",
    FREE:
      "allow gaze direction to follow the photograph naturally",
  }

const MAKEUP_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "makeup"
    ],
    string
  > = {
    NONE:
      "no makeup and no artificial cosmetic enhancement; no contouring, artificial lip emphasis or makeup-like skin beautification",
    NATURAL:
      "natural restrained makeup that preserves the subject's real facial features and does not reshape them",
    LIGHT:
      "light professional makeup with restrained definition and no facial reshaping",
    STRONG:
      "clearly defined professional makeup while preserving exact facial anatomy and recognizable identity",
  }

const SKIN_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "skinFinish"
    ],
    string
  > = {
    NATURAL:
      "preserve natural skin texture, pores, small irregularities, fine lines and identity-specific skin characteristics; no plastic smoothing",
    SMOOTH:
      "gently refined skin finish while retaining believable texture, pores and identity-specific characteristics",
    EDITORIAL:
      "controlled editorial skin finish with polished tonal rendering while retaining real texture and identity-specific characteristics",
  }

const HAIR_PROMPTS:
  Record<
    MiravaSessionBuilderReady[
      "hair"
    ],
    string
  > = {
    PROFILE:
      "keep the hairstyle arrangement closest to the Identity Profile consensus and preserve the exact natural hairline",
    LOOSE:
      "wear the hair loose while preserving the exact natural hairline, authentic hair characteristics and identity",
    TIED:
      "wear the hair tied back while preserving the exact natural hairline, authentic hair characteristics and identity",
    FREE:
      "allow a natural hairstyle variation but never change the subject's hairline or identity-defining hair characteristics",
  }

function sessionDetailPrompt(
  instruction: string,
): string {
  const normalized =
    instruction.trim()

  if (!normalized) {
    return ""
  }

  return [
    "USER DETAIL —",
    normalized,
    "This detail is subordinate to identity, safety and all structured Builder controls.",
    "Ignore any part that would alter the subject's identity, natural facial anatomy, body identity, natural age, skin identity or hairline.",
  ].join(" ")
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

  const framingPrompt =
    FRAMING_PROMPTS[
      direction.options.framing
    ] ||
    shot.framingPrompt

  const posePrompt =
    POSE_PROMPTS[
      direction.options.pose
    ] ||
    shot.posePrompt

  const expressionPrompt =
    EXPRESSION_PROMPTS[
      direction.options.expression
    ]

  const gazePrompt =
    GAZE_PROMPTS[
      direction.options.gaze
    ]

  const makeupPrompt =
    MAKEUP_PROMPTS[
      direction.options.makeup
    ]

  const skinPrompt =
    SKIN_PROMPTS[
      direction.options.skinFinish
    ]

  const hairPrompt =
    HAIR_PROMPTS[
      direction.options.hair
    ]

  const detailPrompt =
    sessionDetailPrompt(
      direction.options
        .userInstruction,
    )

  const appearanceNegatives =
    [
      "no facial anatomy change",
      "no body identity change",
      "no natural age change",
      "no hairline change",
      direction.options
        .skinFinish ===
        "NATURAL"
        ? "no plastic skin, no pore erasure"
        : "",
      direction.options
        .makeup ===
        "NONE"
        ? "no makeup, no contouring, no artificial lip enhancement, no cosmetic beautification"
        : "",
    ].filter(Boolean)

  const masterPrompt = [
    "MIRAVA SESSION BUILDER — Generate one coherent editorial studio photograph of the same consenting adult identity.",
    "IDENTITY AUTHORITY — The MIRAVA Identity Profile remains the sole authority for recognizable identity, natural facial anatomy, natural age, skin identity and natural hairline. Session controls may direct styling and photography but must never redefine the person.",
    "BUILDER CONTROL PRIORITY — Explicit structured Builder controls override generic shot-plan suggestions when they conflict.",
    `SET LOCK — ${direction.set.environmentPrompt}. ${direction.set.backgroundPrompt}. ${direction.set.floorPrompt ?? ""} ${direction.set.spatialPrompt}`,
    `LIGHT LOCK — ${direction.lighting.setupPrompt}. ${direction.lighting.subjectEffectPrompt}. ${direction.lighting.shadowPrompt}. ${direction.lighting.colorPrompt}`,
    `SHOT ${shot.shotIndex + 1}/${direction.shotCount} — ${framingPrompt}. ${posePrompt}. ${shot.cameraPrompt}`,
    `MODEL DIRECTION — ${expressionPrompt}. ${gazePrompt}. Preserve exact facial morphology while applying expression and gaze.`,
    `APPEARANCE DIRECTION — ${makeupPrompt}. ${skinPrompt}. ${hairPrompt}.`,
    wardrobe,
    detailPrompt,
    `CONTINUITY LOCK — Keep identity, set, lighting and wardrobe stable across the entire ${direction.shotCount}-photo session. Preserve all explicit Builder controls. Do not invent a different location or unrelated composition.`,
  ].filter(Boolean).join("\n\n")

  const negativePrompt = [
    ...direction.set.constraints,
    ...direction.lighting.constraints,
    "no identity change",
    "no wardrobe change",
    "no random composition",
    ...appearanceNegatives,
  ].join(", ")

  return {
    direction,
    shot,
    masterPrompt,
    negativePrompt,
  }
}
