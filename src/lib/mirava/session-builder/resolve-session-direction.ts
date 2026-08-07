import {
  miravaSessionBuilderReadySchema,
  type MiravaSessionBuilderReady,
} from "./schema"
import {
  getMiravaLightingPreset,
  type MiravaLightingPresetId,
} from "./lighting-presets"
import {
  getMiravaSetPreset,
  type MiravaSetPresetId,
} from "./set-presets"

export const MIRAVA_SESSION_AUTHORITY_SOURCES = [
  "IDENTITY_PROFILE",
  "ARTISTIC_REFERENCE",
  "SESSION_SET",
  "SESSION_LIGHTING",
  "SESSION_LOOK",
  "SHOT_PLAN",
] as const

export type MiravaSessionAuthoritySource =
  (typeof MIRAVA_SESSION_AUTHORITY_SOURCES)[number]

export type MiravaSessionAuthorityMap = Readonly<{
  identity: "IDENTITY_PROFILE"
  environment: "SESSION_SET"
  lighting: "SESSION_LIGHTING"
  wardrobe:
    | "SESSION_LOOK"
    | "ARTISTIC_REFERENCE"
  pose: "SHOT_PLAN"
  composition: "SHOT_PLAN"
  framing: "SHOT_PLAN"
  photographicCharacter:
    "ARTISTIC_REFERENCE"
}>

export type MiravaResolvedSetDirection =
  Readonly<{
    presetId: MiravaSetPresetId
    version: number
    environmentPrompt: string
    backgroundPrompt: string
    floorPrompt: string | null
    spatialPrompt: string
    constraints: readonly string[]
  }>

export type MiravaResolvedLightingDirection =
  Readonly<{
    presetId: MiravaLightingPresetId
    version: number
    setupPrompt: string
    subjectEffectPrompt: string
    shadowPrompt: string
    colorPrompt: string
    constraints: readonly string[]
  }>

export type MiravaResolvedSessionDirection =
  Readonly<{
    builderVersion: number
    mode: "CUSTOM_SHOOT"
    shotCount: 6
    lookMode:
      | "REFERENCE"
      | "CUSTOM"
    authority:
      MiravaSessionAuthorityMap
    set: MiravaResolvedSetDirection
    lighting:
      MiravaResolvedLightingDirection
  }>

export class MiravaSessionDirectionError
  extends Error {
  readonly code:
    | "INVALID_SESSION_CONFIG"
    | "UNKNOWN_SET_PRESET"
    | "UNKNOWN_LIGHTING_PRESET"

  constructor(
    code:
      | "INVALID_SESSION_CONFIG"
      | "UNKNOWN_SET_PRESET"
      | "UNKNOWN_LIGHTING_PRESET",
    message: string,
  ) {
    super(message)
    this.name =
      "MiravaSessionDirectionError"
    this.code = code
  }
}

function resolveAuthorityMap(
  config: MiravaSessionBuilderReady,
): MiravaSessionAuthorityMap {
  return {
    identity: "IDENTITY_PROFILE",
    environment: "SESSION_SET",
    lighting: "SESSION_LIGHTING",
    wardrobe:
      config.lookMode === "CUSTOM"
        ? "SESSION_LOOK"
        : "ARTISTIC_REFERENCE",
    pose: "SHOT_PLAN",
    composition: "SHOT_PLAN",
    framing: "SHOT_PLAN",
    photographicCharacter:
      "ARTISTIC_REFERENCE",
  }
}

export function resolveMiravaSessionDirection(
  input: unknown,
): MiravaResolvedSessionDirection {
  const parsed =
    miravaSessionBuilderReadySchema.safeParse(
      input,
    )

  if (!parsed.success) {
    throw new MiravaSessionDirectionError(
      "INVALID_SESSION_CONFIG",
      "The MIRAVA session builder configuration is incomplete or invalid.",
    )
  }

  const config = parsed.data

  const setPreset =
    getMiravaSetPreset(
      config.setPresetId,
    )

  if (!setPreset) {
    throw new MiravaSessionDirectionError(
      "UNKNOWN_SET_PRESET",
      `Unknown MIRAVA set preset: ${config.setPresetId}`,
    )
  }

  const lightingPreset =
    getMiravaLightingPreset(
      config.lightingPresetId,
    )

  if (!lightingPreset) {
    throw new MiravaSessionDirectionError(
      "UNKNOWN_LIGHTING_PRESET",
      `Unknown MIRAVA lighting preset: ${config.lightingPresetId}`,
    )
  }

  return {
    builderVersion: config.version,
    mode: config.mode,
    shotCount: config.shotCount,
    lookMode: config.lookMode,
    authority:
      resolveAuthorityMap(config),
    set: {
      presetId: setPreset.id,
      version: setPreset.version,
      environmentPrompt:
        setPreset.environmentPrompt,
      backgroundPrompt:
        setPreset.backgroundPrompt,
      floorPrompt:
        setPreset.floorPrompt,
      spatialPrompt:
        setPreset.spatialPrompt,
      constraints: [
        ...setPreset.constraints,
      ],
    },
    lighting: {
      presetId: lightingPreset.id,
      version:
        lightingPreset.version,
      setupPrompt:
        lightingPreset.setupPrompt,
      subjectEffectPrompt:
        lightingPreset.subjectEffectPrompt,
      shadowPrompt:
        lightingPreset.shadowPrompt,
      colorPrompt:
        lightingPreset.colorPrompt,
      constraints: [
        ...lightingPreset.constraints,
      ],
    },
  }
}
