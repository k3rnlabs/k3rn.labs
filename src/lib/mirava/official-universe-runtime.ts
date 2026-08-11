import {
  miravaCreativeOptionsSchema,
} from "@/lib/mirava/creative-options"

import beautyCloseUpArtifact from "./official-universe-artifacts/beauty-close-up.json"

export const MIRAVA_OFFICIAL_VISUAL_DNA_RUNTIME_VERSION =
  "2.1.0" as const

export const MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET =
  1800

const MIRAVA_USER_OVERRIDE_BUDGET =
  280


type RuntimeSignature = {
  version: string
  genre: string
  framing: string
  camera: string
  background: string
  pose: string
  expression: string
  hair: string
  styling: string
  lighting: string
  finish: string
  makeup: string
}


type OfficialVisualDnaArtifact = {
  schemaVersion: number
  id: string
  name: string
  version: string
  status: string

  runtimeSignature:
    RuntimeSignature

  runtimeSignatureCertification: {
    status: string
    method: string
    sourceSha256: string
    extractorVersion: string
    signatureVersion: string
  }
}


const artifacts:
  Record<
    string,
    OfficialVisualDnaArtifact
  > = {
    "beauty-close-up":
      beautyCloseUpArtifact as
        OfficialVisualDnaArtifact,
  }


function normalize(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
}


function compact(
  value: string,
  maxChars: number,
): string {
  const normalized =
    normalize(
      value,
    )

  if (
    normalized.length <=
      maxChars
  ) {
    return normalized
  }

  if (
    maxChars <=
      1
  ) {
    return "…"
  }

  const sliced =
    normalized.slice(
      0,
      maxChars - 1,
    )

  const boundary =
    Math.max(
      sliced.lastIndexOf(
        ". ",
      ),
      sliced.lastIndexOf(
        "; ",
      ),
      sliced.lastIndexOf(
        ", ",
      ),
      sliced.lastIndexOf(
        " ",
      ),
    )

  const result =
    boundary >
      maxChars * 0.55
      ? sliced.slice(
          0,
          boundary,
        )
      : sliced

  return (
    result
      .trimEnd()
      .replace(
        /[.;,\s]+$/g,
        "",
      )
    + "…"
  )
}


function renderUserOverrides(
  options: {
    location?: string
    styling?: string
    energy?: string
    framing?: string
    photoStyle?: string
    beauty?: string
    audacity?: string
    note?: string
  },
): string {
  const candidates = [
    [
      "location",
      options.location,
    ],
    [
      "styling",
      options.styling,
    ],
    [
      "energy",
      options.energy,
    ],
    [
      "framing",
      options.framing,
    ],
    [
      "photo",
      options.photoStyle,
    ],
    [
      "beauty",
      options.beauty,
    ],
    [
      "audacity",
      options.audacity,
    ],
    [
      "note",
      options.note,
    ],
  ] as const

  const active =
    candidates.filter(
      (
        entry,
      ): entry is readonly [
        string,
        string
      ] =>
        typeof entry[1] ===
          "string" &&
        entry[1]
          .trim()
          .length >
          0,
    )

  if (
    active.length ===
      0
  ) {
    return ""
  }

  const prefix =
    "USER OVERRIDES — "

  const suffix =
    "Only matching dimensions change."

  const separators =
    Math.max(
      0,
      active.length -
        1,
    ) * 2

  const keyChars =
    active.reduce(
      (
        total,
        [key],
      ) =>
        total +
        key.length +
        1,
      0,
    )

  const fixed =
    prefix.length +
    suffix.length +
    2 +
    separators +
    keyChars

  const valueSpace =
    MIRAVA_USER_OVERRIDE_BUDGET -
    fixed

  if (
    valueSpace <
      active.length *
        8
  ) {
    throw new Error(
      "MIRAVA_USER_OVERRIDE_STRUCTURE_OVERFLOW",
    )
  }

  const base =
    8

  const remainderSpace =
    valueSpace -
    active.length *
      base

  const extraEach =
    Math.floor(
      remainderSpace /
        active.length,
    )

  let remainder =
    remainderSpace %
    active.length

  const values =
    active.map(
      (
        [key, value],
      ) => {
        const budget =
          base +
          extraEach +
          (
            remainder >
              0
              ? 1
              : 0
          )

        if (
          remainder >
            0
        ) {
          remainder -= 1
        }

        const cleaned =
          compact(
            value,
            budget,
          )
            .replace(
              /[.;,\s]+$/g,
              "",
            )

        return `${key}=${cleaned}`
      },
    )

  const result =
    `${prefix}${values.join(
      "; ",
    )}. ${suffix}`

  if (
    result.length >
    MIRAVA_USER_OVERRIDE_BUDGET
  ) {
    throw new Error(
      `MIRAVA_USER_OVERRIDE_BUDGET_OVERFLOW:${result.length}`,
    )
  }

  return result
}


function resolveMakeup(
  signature:
    RuntimeSignature,
  mode:
    string | undefined,
  intensity:
    string | undefined,
): string {
  if (
    !mode ||
    mode ===
      "auto_reference"
  ) {
    return (
      `MAKEUP — ${signature.makeup}`
    )
  }

  if (
    mode ===
      "none"
  ) {
    return (
      "MAKEUP — NONE; NO lip gloss; NO lipstick; NO blush; NO eyeshadow/liner/mascara; NO foundation/contour; bare natural skin, brows, lashes and matte natural lips."
    )
  }

  const strength =
    intensity
      ? ` ${intensity.toUpperCase()}`
      : ""

  if (
    mode ===
      "natural"
  ) {
    return (
      `MAKEUP — NATURAL${strength}; sheer correction, real pores, natural brows/lashes, neutral eyes, subtle blush/lips; preserve anatomy.`
    )
  }

  if (
    mode ===
      "soft_glam"
  ) {
    return (
      `MAKEUP — SOFT GLAM${strength}; polished restrained complexion/eyes/lashes/blush/lips; preserve anatomy and real skin.`
    )
  }

  if (
    mode ===
      "glam"
  ) {
    return (
      `MAKEUP — GLAM${strength}; polished editorial complexion, defined eyes/brows, believable lashes, contour/blush/lips; preserve anatomy.`
    )
  }

  if (
    mode ===
      "editorial"
  ) {
    return (
      `MAKEUP — EDITORIAL${strength}; high-fashion cosmetic styling coherent with the universe; preserve facial anatomy.`
    )
  }

  return (
    `MAKEUP — ${signature.makeup}`
  )
}


export function getMiravaOfficialVisualDna(
  universeId:
    string | null | undefined,
): OfficialVisualDnaArtifact | null {
  if (!universeId) {
    return null
  }

  return (
    artifacts[
      universeId
    ] ?? null
  )
}


export function resolveMiravaOfficialUniverseRuntimePrompt(
  args: {
    universeId:
      string

    creativeOptions:
      unknown
  },
): string | null {
  const artifact =
    getMiravaOfficialVisualDna(
      args.universeId,
    )

  if (!artifact) {
    return null
  }

  if (
    artifact
      .runtimeSignatureCertification
      .status !==
      "certified"
  ) {
    throw new Error(
      `MIRAVA_OFFICIAL_VISUAL_DNA_NOT_CERTIFIED:${artifact.id}`,
    )
  }

  const parsed =
    miravaCreativeOptionsSchema
      .safeParse(
        args.creativeOptions ??
          {},
      )

  const options =
    parsed.success
      ? parsed.data
      : {}

  const signature =
    artifact
      .runtimeSignature

  /*
   * Each UI option owns only its own visual dimension.
   *
   * location   => background
   * framing    => framing
   * energy     => expression
   * styling    => wardrobe/accessory styling
   * photoStyle => finish
   *
   * Hair, pose, camera and lighting remain canonical
   * unless a future dedicated control owns them.
   */
  const parts = [
    `OFFICIAL MIRAVA VISUAL DNA — ${artifact.name} ${artifact.version}.`,

    `SIGNATURE — ${signature.genre}`,

    options.framing
      ? ""
      : `FRAMING — ${signature.framing}`,

    `CAMERA — ${signature.camera}`,

    options.location
      ? ""
      : `BACKGROUND — ${signature.background}`,

    `POSE — ${signature.pose}`,

    options.energy
      ? ""
      : `EXPRESSION — ${signature.expression}`,

    `HAIR — ${signature.hair}`,

    options.styling
      ? ""
      : `STYLING — ${signature.styling}`,

    `LIGHTING — ${signature.lighting}`,

    options.photoStyle
      ? ""
      : `FINISH — ${signature.finish}`,

    resolveMakeup(
      signature,
      options.makeupMode,
      options.makeupIntensity,
    ),

    "IDENTITY — FACE_ID controls face anatomy, skin identity, age and hairline only; never copy its pose, expression, hairstyle, wardrobe, scene, camera or light.",

    renderUserOverrides(
      options,
    ),

    "PRECEDENCE — User choices replace only matching dimensions; preserve every other certified universe dimension. Explicit makeupMode controls cosmetics.",
  ]
    .filter(Boolean)

  const result =
    parts.join(
      "\n\n",
    )

  if (
    result.length >
    MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET
  ) {
    throw new Error(
      `MIRAVA_OFFICIAL_VISUAL_DNA_BUDGET_OVERFLOW:${result.length}`,
    )
  }

  return result
}
