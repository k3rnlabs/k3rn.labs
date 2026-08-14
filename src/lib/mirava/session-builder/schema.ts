import { z } from "zod"

import {
  isMiravaLightingPresetId,
  type MiravaLightingPresetId,
} from "./lighting-presets"
import {
  isMiravaSetPresetId,
  type MiravaSetPresetId,
} from "./set-presets"
import {
  MIRAVA_SESSION_LEGACY_SHOT_COUNT,
  createDefaultMiravaSessionBuilderV2Options,
  miravaSessionBuilderV2OptionsSchema,
  miravaSessionPersistedShotCountSchema,
} from "./session-options"

export const MIRAVA_SESSION_BUILDER_VERSION = 1 as const
/*
 * Transitional default only.
 *
 * Runtime Session Builder logic must use config.shotCount.
 * The active default remains six until the variable-count
 * database RPC is migrated and explicitly validated.
 */
export const MIRAVA_SESSION_SHOT_COUNT =
  MIRAVA_SESSION_LEGACY_SHOT_COUNT

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
      shotCount:
        miravaSessionPersistedShotCountSchema,
      lookMode: z.enum(
        MIRAVA_SESSION_LOOK_MODES,
      ),
      framing:
        miravaSessionBuilderV2OptionsSchema
          .shape.framing,
      pose:
        miravaSessionBuilderV2OptionsSchema
          .shape.pose,
      expression:
        miravaSessionBuilderV2OptionsSchema
          .shape.expression,
      gaze:
        miravaSessionBuilderV2OptionsSchema
          .shape.gaze,
      makeup:
        miravaSessionBuilderV2OptionsSchema
          .shape.makeup,
      skinFinish:
        miravaSessionBuilderV2OptionsSchema
          .shape.skinFinish,
      hair:
        miravaSessionBuilderV2OptionsSchema
          .shape.hair,
      userInstruction:
        miravaSessionBuilderV2OptionsSchema
          .shape.userInstruction,
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
      shotCount:
        miravaSessionPersistedShotCountSchema,
      lookMode: z.enum(
        MIRAVA_SESSION_LOOK_MODES,
      ),
      framing:
        miravaSessionBuilderV2OptionsSchema
          .shape.framing,
      pose:
        miravaSessionBuilderV2OptionsSchema
          .shape.pose,
      expression:
        miravaSessionBuilderV2OptionsSchema
          .shape.expression,
      gaze:
        miravaSessionBuilderV2OptionsSchema
          .shape.gaze,
      makeup:
        miravaSessionBuilderV2OptionsSchema
          .shape.makeup,
      skinFinish:
        miravaSessionBuilderV2OptionsSchema
          .shape.skinFinish,
      hair:
        miravaSessionBuilderV2OptionsSchema
          .shape.hair,
      userInstruction:
        miravaSessionBuilderV2OptionsSchema
          .shape.userInstruction,
    })
    .strict()

export type MiravaSessionBuilderReady =
  z.infer<
    typeof miravaSessionBuilderReadySchema
  >

export function createDefaultMiravaSessionBuilderDraft(): MiravaSessionBuilderDraft {
  const v2 =
    createDefaultMiravaSessionBuilderV2Options()

  return {
    version:
      MIRAVA_SESSION_BUILDER_VERSION,
    mode: "CUSTOM_SHOOT",
    setPresetId: null,
    lightingPresetId: null,
    shotCount:
      MIRAVA_SESSION_SHOT_COUNT,
    lookMode: "REFERENCE",
    framing:
      v2.framing,
    pose:
      v2.pose,
    expression:
      v2.expression,
    gaze:
      v2.gaze,
    makeup:
      v2.makeup,
    skinFinish:
      v2.skinFinish,
    hair:
      v2.hair,
    userInstruction:
      v2.userInstruction,
  }
}

export function isMiravaSessionBuilderReady(
  value: unknown,
): value is MiravaSessionBuilderReady {
  return miravaSessionBuilderReadySchema.safeParse(
    value,
  ).success
}
