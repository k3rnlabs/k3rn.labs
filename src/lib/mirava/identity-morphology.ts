/*
 * MIRAVA intrinsic identity morphology.
 *
 * This contract contains durable physical structure only.
 * Clothing, lingerie, removable jewellery, makeup, glasses,
 * pose and environment are deliberately not representable.
 */

export const MORPHOLOGY_CONFIDENCE = [
  "low",
  "medium",
  "high",
] as const

export type MorphologyConfidence =
  typeof MORPHOLOGY_CONFIDENCE[number]

export type MorphologyObservation<
  T extends string,
> = {
  value: T
  confidence: MorphologyConfidence
}

export const NECK_LENGTH_VALUES = [
  "short",
  "balanced",
  "long",
] as const

export const SHOULDER_WIDTH_VALUES = [
  "narrow",
  "balanced",
  "broad",
] as const

export const SHOULDER_SLOPE_VALUES = [
  "sloped",
  "balanced",
  "square",
] as const

export const COLLARBONE_VALUES = [
  "subtle",
  "moderate",
  "defined",
] as const

export const TORSO_LENGTH_VALUES = [
  "short",
  "balanced",
  "long",
] as const

export const TORSO_FRAME_VALUES = [
  "narrow",
  "balanced",
  "broad",
] as const

export const BUST_VOLUME_VALUES = [
  "subtle",
  "moderate",
  "full",
] as const

export const WAIST_DEFINITION_VALUES = [
  "subtle",
  "moderate",
  "defined",
] as const

export const HIP_WIDTH_VALUES = [
  "narrow",
  "balanced",
  "broad",
] as const

export type IdentityMorphology = {
  version: 1

  sourceViewKeys?: string[]

  neckLength?:
    MorphologyObservation<
      typeof NECK_LENGTH_VALUES[number]
    >

  shoulderWidth?:
    MorphologyObservation<
      typeof SHOULDER_WIDTH_VALUES[number]
    >

  shoulderSlope?:
    MorphologyObservation<
      typeof SHOULDER_SLOPE_VALUES[number]
    >

  collarboneDefinition?:
    MorphologyObservation<
      typeof COLLARBONE_VALUES[number]
    >

  torsoLength?:
    MorphologyObservation<
      typeof TORSO_LENGTH_VALUES[number]
    >

  torsoFrame?:
    MorphologyObservation<
      typeof TORSO_FRAME_VALUES[number]
    >

  bustVolume?:
    MorphologyObservation<
      typeof BUST_VOLUME_VALUES[number]
    >

  waistDefinition?:
    MorphologyObservation<
      typeof WAIST_DEFINITION_VALUES[number]
    >

  hipWidth?:
    MorphologyObservation<
      typeof HIP_WIDTH_VALUES[number]
    >
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value),
  )
}

function parseObservation<
  T extends string,
>(
  value: unknown,
  allowed: readonly T[],
): MorphologyObservation<T> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (
    typeof value.value !== "string" ||
    !allowed.includes(
      value.value as T,
    )
  ) {
    return undefined
  }

  if (
    typeof value.confidence !== "string" ||
    !MORPHOLOGY_CONFIDENCE.includes(
      value.confidence as MorphologyConfidence,
    )
  ) {
    return undefined
  }

  return {
    value:
      value.value as T,
    confidence:
      value.confidence as MorphologyConfidence,
  }
}

export function parseIdentityMorphology(
  raw: unknown,
): IdentityMorphology | null {
  if (!isRecord(raw)) {
    return null
  }

  if (raw.version !== 1) {
    return null
  }

  const result: IdentityMorphology = {
    version:
      1,
  }

  if (
    Array.isArray(
      raw.sourceViewKeys,
    )
  ) {
    result.sourceViewKeys =
      raw.sourceViewKeys.filter(
        (value): value is string =>
          typeof value === "string",
      )
  }

  result.neckLength =
    parseObservation(
      raw.neckLength,
      NECK_LENGTH_VALUES,
    )

  result.shoulderWidth =
    parseObservation(
      raw.shoulderWidth,
      SHOULDER_WIDTH_VALUES,
    )

  result.shoulderSlope =
    parseObservation(
      raw.shoulderSlope,
      SHOULDER_SLOPE_VALUES,
    )

  result.collarboneDefinition =
    parseObservation(
      raw.collarboneDefinition,
      COLLARBONE_VALUES,
    )

  result.torsoLength =
    parseObservation(
      raw.torsoLength,
      TORSO_LENGTH_VALUES,
    )

  result.torsoFrame =
    parseObservation(
      raw.torsoFrame,
      TORSO_FRAME_VALUES,
    )

  result.bustVolume =
    parseObservation(
      raw.bustVolume,
      BUST_VOLUME_VALUES,
    )

  result.waistDefinition =
    parseObservation(
      raw.waistDefinition,
      WAIST_DEFINITION_VALUES,
    )

  result.hipWidth =
    parseObservation(
      raw.hipWidth,
      HIP_WIDTH_VALUES,
    )

  return result
}

const LABELS: Record<
  Exclude<
    keyof IdentityMorphology,
    "version" | "sourceViewKeys"
  >,
  string
> = {
  neckLength:
    "neck length",
  shoulderWidth:
    "shoulder width",
  shoulderSlope:
    "shoulder slope",
  collarboneDefinition:
    "collarbone definition",
  torsoLength:
    "torso length",
  torsoFrame:
    "upper-torso frame",
  bustVolume:
    "natural bust volume",
  waistDefinition:
    "waist definition",
  hipWidth:
    "hip width",
}

export function formatIdentityMorphologyForPrompt(
  morphology:
    IdentityMorphology | null,
): string {
  if (!morphology) {
    return ""
  }

  const lines: string[] = []

  for (
    const key of
    Object.keys(
      LABELS,
    ) as Array<
      keyof typeof LABELS
    >
  ) {
    const observation =
      morphology[key]

    if (
      !observation ||
      observation.confidence ===
        "low"
    ) {
      continue
    }

    lines.push(
      `- ${LABELS[key]}: ${observation.value}`,
    )
  }

  if (!lines.length) {
    return ""
  }

  return [
    "INTRINSIC BODY IDENTITY — Sole authority for intrinsic body morphology.",
    ...lines,
    "These observations describe the person's body, not her styling. Never infer or preserve clothing, jewellery, makeup, pose, camera or scene from BODY_ID or identity photographs. ART DIRECTION controls wardrobe and pose; do not invent unlisted morphology.",
  ].join("\n")
}


export const MIRAVA_IDENTITY_MORPHOLOGY_EXTRACTOR_PROMPT = `
You are MIRAVA's private intrinsic-body morphology extractor.

You receive multiple photographs of the SAME consenting adult identity model.

Your task is narrowly limited to extracting stable natural physical structure that can later help preserve the person's morphology during image generation.

DO NOT describe or preserve styling.

ABSOLUTE EXCLUSIONS
Never record:
- clothing;
- lingerie;
- bras;
- tops;
- dresses;
- trousers;
- shoes;
- removable jewellery;
- earrings on the earlobe;
- necklaces;
- bracelets;
- watches;
- rings;
- glasses;
- makeup;
- false lashes;
- temporary hairstyle styling;
- photographic pose;
- arm placement;
- expression;
- camera angle;
- background;
- environment.

Do not infer body morphology from the artistic choices of the identity photograph.

OBSERVATION RULE
Record a body characteristic only when it is directly and reliably observable.

A form-fitting garment may provide limited silhouette evidence only when the underlying natural contour is visually unambiguous.

Never infer through:
- loose clothing;
- structured clothing;
- padding;
- push-up construction;
- shapewear;
- heavy compression;
- perspective distortion;
- occlusion.

When evidence is ambiguous, omit the field.

Never guess.

CONSENSUS RULE
Use agreement across multiple views whenever available.

If views conflict because of pose, perspective or clothing, lower confidence or omit the observation.

BODY FIELDS

neckLength:
- short
- balanced
- long

shoulderWidth:
- narrow
- balanced
- broad

shoulderSlope:
- sloped
- balanced
- square

collarboneDefinition:
- subtle
- moderate
- defined

torsoLength:
- short
- balanced
- long

torsoFrame:
- narrow
- balanced
- broad

bustVolume:
- subtle
- moderate
- full

waistDefinition:
- subtle
- moderate
- defined

hipWidth:
- narrow
- balanced
- broad

CONFIDENCE
Use:
- high: directly clear and supported by more than one useful observation;
- medium: directly observable but with limited views;
- low: uncertain.

Low-confidence guesses are allowed in the JSON for auditability but will never be sent to the image generator.

IMPORTANT
Bust volume describes only broad natural visible morphology. Do not estimate cup size, measurements or sexualize the observation.

Do not infer bust volume from padding or bra construction.

Do not infer waist or hip structure unless those regions are actually visible enough to support the observation.

RETURN JSON ONLY.

Exact structure:

{
  "version": 1,
  "neckLength": {
    "value": "short|balanced|long",
    "confidence": "low|medium|high"
  },
  "shoulderWidth": {
    "value": "narrow|balanced|broad",
    "confidence": "low|medium|high"
  },
  "shoulderSlope": {
    "value": "sloped|balanced|square",
    "confidence": "low|medium|high"
  },
  "collarboneDefinition": {
    "value": "subtle|moderate|defined",
    "confidence": "low|medium|high"
  },
  "torsoLength": {
    "value": "short|balanced|long",
    "confidence": "low|medium|high"
  },
  "torsoFrame": {
    "value": "narrow|balanced|broad",
    "confidence": "low|medium|high"
  },
  "bustVolume": {
    "value": "subtle|moderate|full",
    "confidence": "low|medium|high"
  },
  "waistDefinition": {
    "value": "subtle|moderate|defined",
    "confidence": "low|medium|high"
  },
  "hipWidth": {
    "value": "narrow|balanced|broad",
    "confidence": "low|medium|high"
  }
}

Omit any unsupported field completely.
`.trim()
