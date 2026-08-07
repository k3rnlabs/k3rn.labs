import { z } from "zod"

import {
  isMiravaLightingPresetId,
  type MiravaLightingPresetId,
} from "./lighting-presets"
import {
  isMiravaSetPresetId,
  type MiravaSetPresetId,
} from "./set-presets"

export const MIRAVA_SESSION_BUILDER_VERSION = 1 as const
export const MIRAVA_SESSION_SHOT_COUNT = 6 as const

export const MIRAVA_SESSION_BUILDER_MODES = [
  "CUSTOM_SHOOT",
] as const

export const MIRAVA_SESSION_LOOK_MODES = [
  "REFERENCE",
  "CUSTOM",
] as const

export type MiravaSessionBuilderMode =
  (typeof MIRAVA_SESSION_BUILDER_MODES)[number]

export type MiravaSessionLookMode =
  (typeof MIRAVA_SESSION_LOOK_MODES)[number]

export const miravaSetPresetIdSchema =
  z.custom<MiravaSetPresetId>(
    isMiravaSetPresetId,
    "Unknown MIRAVA set preset.",
  )

export const miravaLightingPresetIdSchema =
  z.custom<MiravaLightingPresetId>(
    isMiravaLightingPresetId,
    "Unknown MIRAVA lighting preset.",
  )

export const miravaSessionBuilderDraftSchema =
  z
    .object({
      version: z.literal(
        MIRAVA_SESSION_BUILDER_VERSION,
      ),
      mode: z.literal("CUSTOM_SHOOT"),
      setPresetId:
        miravaSetPresetIdSchema.nullable(),
      lightingPresetId:
        miravaLightingPresetIdSchema.nullable(),
      shotCount: z.literal(
        MIRAVA_SESSION_SHOT_COUNT,
      ),
      lookMode: z.enum(
        MIRAVA_SESSION_LOOK_MODES,
      ),
    })
    .strict()

export type MiravaSessionBuilderDraft =
  z.infer<
    typeof miravaSessionBuilderDraftSchema
  >

export const miravaSessionBuilderReadySchema =
  z
    .object({
      version: z.literal(
        MIRAVA_SESSION_BUILDER_VERSION,
      ),
      mode: z.literal("CUSTOM_SHOOT"),
      setPresetId: miravaSetPresetIdSchema,
      lightingPresetId:
        miravaLightingPresetIdSchema,
      shotCount: z.literal(
        MIRAVA_SESSION_SHOT_COUNT,
      ),
      lookMode: z.enum(
        MIRAVA_SESSION_LOOK_MODES,
      ),
    })
    .strict()

export type MiravaSessionBuilderReady =
  z.infer<
    typeof miravaSessionBuilderReadySchema
  >

export function createDefaultMiravaSessionBuilderDraft(): MiravaSessionBuilderDraft {
  return {
    version:
      MIRAVA_SESSION_BUILDER_VERSION,
    mode: "CUSTOM_SHOOT",
    setPresetId: null,
    lightingPresetId: null,
    shotCount:
      MIRAVA_SESSION_SHOT_COUNT,
    lookMode: "REFERENCE",
  }
}

export function isMiravaSessionBuilderReady(
  value: unknown,
): value is MiravaSessionBuilderReady {
  return miravaSessionBuilderReadySchema.safeParse(
    value,
  ).success
}
