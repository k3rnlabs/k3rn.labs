import { getPromptProfile } from "../profiles/prompt-profiles"
import {
  buildAdaptiveRealismLayer,
  buildAdaptiveRealismNegativeGuardrails,
} from "../profiles/realism-profiles"
import { compiledGenerationPromptSchema, CompiledGenerationPrompt } from "../schemas/compiled-generation-prompt.schema"
import { SceneContextClassification } from "../schemas/scene-context.schema"
import { VisualDirectionBlueprint } from "../schemas/visual-direction-blueprint.schema"
import { MiravaPipelineError } from "./pipeline-errors"

export type GenerationPromptCompilerInput = {
  blueprint: VisualDirectionBlueprint
  sceneContext: SceneContextClassification

  generation?: {
    aspectRatio?: string
    imageCount?: number
    outputQuality?: string
    frameIndex?: number
  }

  userDirection?: string

  identityProfile?: {
    profileId: string
    validatedImageCount: number
  }
}

export const COMPILER_METADATA = {
  compilerVersion: "1.4.0",
} as const

/**
 * MIRAVA GENERATION PROMPT COMPILER V1
 * Compiles a visual direction blueprint and context classification into a single,
 * production-ready prompt to be sent with separate identity profile images.
 */
export function compileGenerationPrompt(input: GenerationPromptCompilerInput): CompiledGenerationPrompt {
  const { blueprint, sceneContext, userDirection, generation } = input
  const profileConfig = getPromptProfile(sceneContext.sceneProfile)

  // A. IDENTITY CLAUSE
  const identityClause = [
    "IDENTITY INVARIANT — The newly supplied identity photographs are biometric references only and the sole identity source for the subject.",
    "Preserve the adult model's recognizable facial identity, natural facial anatomy, eye shape, nose structure, lip shape, natural skin characteristics, and natural body proportions.",
    "CREATIVE FREEDOM — Do not copy the identity photos’ pose, gaze, expression, head angle, crop, camera perspective, lighting, background, clothing, jewelry, makeup, accessories or hair arrangement. Rebuild all of those elements from the approved art direction below.",
    "Do not blend identity features or transfer facial characteristics from the artistic reference.",
  ].join(" ")

  // B. PHOTOGRAPHIC CONTEXT & PROFILE FRAMING
  const profileFramingSegment = profileConfig.positiveFraming.join(" ")

  // C. COMPOSITION & CAMERA
  const basePrompt = blueprint.baseGenerationPrompt.trim()

  // D. REFERENCE FIDELITY LOCK
  const referenceFidelityLockClause =
    blueprint.transferMode === "FIDELITY"
      ? [
          "REFERENCE FIDELITY LOCK — The approved art direction is authoritative for architecture, environment, camera geometry, subject scale, perspective strength, pose skeleton, arm and hand anchors, frame-edge contacts, expression, gaze, hairstyle arrangement, wardrobe topology, lighting architecture, exposure relationships, palette, and photographic finish.",
          "The identity photographs control only recognizable identity, natural facial and body anatomy, skin characteristics, hairline, authentic hair traits, and validated physical traits. They must not override the approved pose, expression, gaze, hairstyle arrangement, wardrobe construction, environment, crop, camera, or lighting.",
          "Preserve every specific reference element rather than replacing it with a generic equivalent. Contemporary architecture must remain contemporary; glass balustrades must not become traditional railings; distinctive fixtures must not become generic lights; a specific pose must not become a semantically similar pose; a specific garment topology must not become a generic garment.",
          "Preserve the extracted visual hierarchy. Do not intensify low-angle distortion, enlarge the nearest thigh, hip, hand, chest, or other foreground element beyond the approved perspective, and do not change which element visually dominates the frame.",
          "Coverage-safe adaptation may change only the minimum garment coverage required for a neutral commercial result. It must not alter architecture, pose skeleton, expression, hairstyle silhouette, camera geometry, lighting, or overall photographic character.",
          "TRANSFER_MODE = FIDELITY.",
        ].join(" ")
      : [
          "TRANSFER_MODE = POLISHED.",
          "Refine technical execution while preserving the approved architecture, pose structure, expression, composition, wardrobe construction, and lighting system.",
        ].join(" ")

  const microAnatomyAndObjectCoherenceClause = [
    "MICRO-ANATOMY AND OBJECT COHERENCE — Preserve topological, anatomical, and physical continuity in every visible high-detail region.",
    "Each clearly visible hand must have exactly five distinct fingers unless a finger is genuinely occluded, with correct thumb placement, natural phalanges, knuckles, nails, wrist continuity, and physically plausible grips.",
    "If feet are visible, barefoot, foregrounded, or shown in open-toe footwear, each visible foot must have exactly five distinct toes in natural order from big toe to little toe, with realistic length progression, spacing, proportions, separate toenails when visible, and natural footwear interaction.",
    "Keep both eyes aligned to one coherent gaze with plausible iris, pupil, and eyelid structure; preserve continuous lips, a natural mouth opening, plausible teeth and gums, naturally attached ears, and correctly anchored jewelry.",
    "Maintain continuous joints and limbs, believable balance and gravity, realistic contact with surfaces, and correct occlusion between skin, hair, garments, accessories, held objects, furniture, and the environment.",
    "Keep straps, seams, buttons, zippers, laces, mesh, fringe, hems, layered fabric, jewelry, phones, glasses, bags, sports equipment, cups, and other props structurally continuous and physically connected.",
    "Mirrors and reflective surfaces must preserve the same identity, pose, limb count, wardrobe, accessories, and object layout; cast and contact shadows must match the extracted light direction and physical contact points.",
    "Tattoos, scars, birthmarks, and distinctive traits may appear only when supported by the supplied identity photographs or validated physical-trait data, preserving correct body side, placement, orientation, scale, and continuity.",
  ].join(" ")

  // E. ADAPTIVE PHOTOGRAPHIC REALISM
  const adaptiveRealismLayer =
    buildAdaptiveRealismLayer(sceneContext)

  const adaptiveRealismNegativeGuardrails =
    buildAdaptiveRealismNegativeGuardrails(sceneContext)

  // F. USER DIRECTION (IF PROVIDED)
  let userNoteSegment = ""
  if (userDirection && userDirection.trim().length > 0) {
    const cleanNote = userDirection.trim()
    userNoteSegment = `SESSION PREFERENCE — ${cleanNote}. (Apply while maintaining identity invariance and extracted lighting architecture).`
  }

  // F. FRAME INDEX BRIEF (FOR SERIES)
  const seriesImageCount =
    generation?.imageCount ?? 1

  let frameSegment = ""

  if (
    seriesImageCount > 1 &&
    typeof generation?.frameIndex === "number"
  ) {
    const index =
      generation.frameIndex

    if (index === 0) {
      frameSegment = [
        "REFERENCE HERO FRAME — This first image is the fidelity anchor for the series.",
        "Preserve the extracted crop, subject scale, camera height, perspective strength, pose skeleton, arm and hand anchors, frame-edge contacts, expression, gaze, hairstyle silhouette, wardrobe topology, architecture, and lighting without creative substitution.",
      ].join(" ")
    } else {
      frameSegment = [
        `SERIES VARIATION ${index + 1} — Variation is subordinate to the approved art direction.`,
        "Vary only the dimensions explicitly authorized by the series brief or client-approved preferences.",
        "Preserve architectural era and materials, wardrobe topology, identity, coverage rules, palette, photographic finish, and all non-varied reference constraints.",
      ].join(" ")
    }
  }

  const referenceFidelityVerificationClause = [
    "FINAL REFERENCE FIDELITY CHECK — Before rendering, verify that the output still matches the approved architecture and material system, exact pose skeleton, arm and hand anchors, expression and gaze mechanics, hairstyle silhouette, wardrobe topology, camera perspective, frame-edge relationships, lighting direction, exposure balance, and visual hierarchy.",
    "Reject generic substitutions, silent modernization or aging of the environment, pose simplification, default direct eye contact, default smiling, hairstyle flattening, garment redesign, exaggerated foreground anatomy, or a different compositional emphasis.",
    "Later instructions may refine technical quality or approved series variation, but they must not erase or contradict the approved art direction.",
  ].join(" ")

  // G. CONSTRUCT FINAL POSITIVE PROMPT
  const positivePromptParts = [
    identityClause,
    profileFramingSegment,
    referenceFidelityLockClause,
    basePrompt,
    microAnatomyAndObjectCoherenceClause,
    adaptiveRealismLayer,
    frameSegment,
    userNoteSegment,
    referenceFidelityVerificationClause,
  ].filter(Boolean)

  const positivePrompt = positivePromptParts.join("\n\n")

  // H. NEGATIVE GUARDRAILS
  const negativeGuardrailsParts = [
    blueprint.negativeGuardrails,
    adaptiveRealismNegativeGuardrails,
    "identity mixing, facial drift, altered facial anatomy, body reshaping, extra limbs",
    "missing fingers, duplicated fingers, fused fingers, melted fingers, six-fingered hands, misplaced thumbs, malformed knuckles, broken wrists, impossible grips",
    "crossed gaze, divergent pupils, duplicated eyes, malformed eyelids, broken lip contours, fused teeth, duplicated teeth, double rows of teeth, malformed gums",
    "detached ears, floating earrings, duplicated jewelry, jewelry embedded in skin or hair",
    "impossible joint angles, detached limbs, disappearing limbs, fused body contact, floating feet, unsupported bodies, detached contact shadows",
    "missing toes, four-toed feet, fused toes, duplicated toes, melted toes, malformed toe spacing, merged toenails, deformed forefoot anatomy",
    "footwear straps concealing, merging, removing, duplicating, or deforming toes",
    "broken straps, duplicated buttons, discontinuous seams, impossible garment openings, floating fabric, warped held objects, intersecting props",
    "inconsistent mirrors, different reflected identity, altered reflected pose, contradictory shadows, duplicated background objects, malformed secondary faces, ownerless body parts",
    "invented tattoos, mirrored tattoos, relocated tattoos, duplicated tattoos, transformed scars, invented birthmarks, copied artistic-reference identity marks",
    "generic architecture substitution, dated interior replacing contemporary architecture, changed balustrade materials, generic fixtures replacing specific fixtures, altered stair geometry, generic domestic environment replacing approved architecture",
    "pose skeleton drift, semantically similar but geometrically different pose, arm-anchor substitution, changed hand contact points, altered frame-edge exits, upright posture replacing an approved diagonal lean",
    "expression drift, open eyes replacing closed eyes, direct gaze replacing the approved gaze, neutral smile replacing a kiss expression or specified mouth shape, changed chin angle or head tilt",
    "hair arrangement drift, flattened hair volume, changed parting, forward waves moved behind the shoulders, straight-back hair replacing the approved silhouette",
    "wardrobe topology drift, generic garment replacing a sculptural garment, added bra cups, invented straps, changed cutout geometry, changed mesh and opaque panel boundaries, altered seam routes",
    "perspective exaggeration, extreme low angle replacing a moderate low angle, enlarged foreground thigh, enlarged hip, enlarged hand, changed subject scale, changed visual hierarchy",
    "changed garment coverage, unintended transparency, incorrect wardrobe construction",
    "invented fill light, HDR flattening, plastic skin, excessive retouching, studio relighting, cinematic reinterpretation",
  ].filter(Boolean)

  const negativeGuardrails = negativeGuardrailsParts.join(", ")

  const parseResult = compiledGenerationPromptSchema.safeParse({
    positivePrompt,
    negativeGuardrails,
    sceneProfile: sceneContext.sceneProfile,
    metadata: {
      extractorVersion: blueprint.extractionMetadata.extractorVersion,
      classifierVersion: blueprint.extractionMetadata.classifierVersion,
      compilerVersion: COMPILER_METADATA.compilerVersion,
      compiledAt: new Date().toISOString(),
    },
  })

  if (!parseResult.success) {
    throw new MiravaPipelineError(
      `Compiled generation prompt failed validation: ${parseResult.error.message}`,
      "PROMPT_COMPILATION_FAILED"
    )
  }

  return parseResult.data
}
