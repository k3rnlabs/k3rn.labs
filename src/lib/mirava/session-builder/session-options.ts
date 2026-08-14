import { z } from "zod"

/*
 * MIRAVA Session Builder V2 user-facing shot counts.
 *
 * The persisted legacy value 6 remains readable so
 * existing V1 drafts/sessions are not orphaned.
 */
export const MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
] as const

export const MIRAVA_SESSION_MAX_SHOT_COUNT =
  Math.max(
    ...MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS,
  )

export const MIRAVA_SESSION_MAX_SHOT_INDEX =
  MIRAVA_SESSION_MAX_SHOT_COUNT - 1

export const MIRAVA_SESSION_DEFAULT_SHOT_COUNT =
  3 as const

export const MIRAVA_SESSION_LEGACY_SHOT_COUNT =
  6 as const

export const miravaSessionSelectableShotCountSchema =
  z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(10),
  ])

export const miravaSessionPersistedShotCountSchema =
  z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(10),
  ])

export type MiravaSessionSelectableShotCount =
  z.infer<
    typeof miravaSessionSelectableShotCountSchema
  >

export type MiravaSessionPersistedShotCount =
  z.infer<
    typeof miravaSessionPersistedShotCountSchema
  >

export const MIRAVA_SESSION_FRAMINGS = [
  "PORTRAIT",
  "BUST",
  "MID_BODY",
  "FULL_BODY",
  "FREE",
] as const

export const MIRAVA_SESSION_POSES = [
  "STANDING",
  "SEATED",
  "MOVEMENT",
  "STATIC_PORTRAIT",
  "FREE",
] as const

export const MIRAVA_SESSION_EXPRESSIONS = [
  "NEUTRAL",
  "SOFT_SMILE",
  "SMILE",
  "SERIOUS",
  "CONFIDENT",
  "FREE",
] as const

export const MIRAVA_SESSION_GAZES = [
  "CAMERA",
  "OFF_CAMERA",
  "FREE",
] as const

export const MIRAVA_SESSION_MAKEUP_OPTIONS = [
  "NONE",
  "NATURAL",
  "LIGHT",
  "STRONG",
] as const

export const MIRAVA_SESSION_SKIN_FINISHES = [
  "NATURAL",
  "SMOOTH",
  "EDITORIAL",
] as const

export const MIRAVA_SESSION_HAIR_OPTIONS = [
  "PROFILE",
  "LOOSE",
  "TIED",
  "FREE",
] as const

export const miravaSessionFramingSchema =
  z.enum(
    MIRAVA_SESSION_FRAMINGS,
  )

export const miravaSessionPoseSchema =
  z.enum(
    MIRAVA_SESSION_POSES,
  )

export const miravaSessionExpressionSchema =
  z.enum(
    MIRAVA_SESSION_EXPRESSIONS,
  )

export const miravaSessionGazeSchema =
  z.enum(
    MIRAVA_SESSION_GAZES,
  )

export const miravaSessionMakeupSchema =
  z.enum(
    MIRAVA_SESSION_MAKEUP_OPTIONS,
  )

export const miravaSessionSkinFinishSchema =
  z.enum(
    MIRAVA_SESSION_SKIN_FINISHES,
  )

export const miravaSessionHairSchema =
  z.enum(
    MIRAVA_SESSION_HAIR_OPTIONS,
  )

export type MiravaSessionFraming =
  z.infer<
    typeof miravaSessionFramingSchema
  >

export type MiravaSessionPose =
  z.infer<
    typeof miravaSessionPoseSchema
  >

export type MiravaSessionExpression =
  z.infer<
    typeof miravaSessionExpressionSchema
  >

export type MiravaSessionGaze =
  z.infer<
    typeof miravaSessionGazeSchema
  >

export type MiravaSessionMakeup =
  z.infer<
    typeof miravaSessionMakeupSchema
  >

export type MiravaSessionSkinFinish =
  z.infer<
    typeof miravaSessionSkinFinishSchema
  >

export type MiravaSessionHair =
  z.infer<
    typeof miravaSessionHairSchema
  >

export const MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS =
  500 as const

/*
 * This object contains only the new structured
 * Session Builder V2 dimensions.
 *
 * Studio, lighting and wardrobe already have their
 * own existing canonical fields/contracts and are
 * intentionally not duplicated here.
 */
export const miravaSessionBuilderV2OptionsSchema =
  z
    .object({
      shotCount:
        miravaSessionPersistedShotCountSchema
          .default(
            MIRAVA_SESSION_DEFAULT_SHOT_COUNT,
          ),

      framing:
        miravaSessionFramingSchema
          .default("FREE"),

      pose:
        miravaSessionPoseSchema
          .default("FREE"),

      expression:
        miravaSessionExpressionSchema
          .default("FREE"),

      gaze:
        miravaSessionGazeSchema
          .default("FREE"),

      makeup:
        miravaSessionMakeupSchema
          .default("NATURAL"),

      skinFinish:
        miravaSessionSkinFinishSchema
          .default("NATURAL"),

      hair:
        miravaSessionHairSchema
          .default("PROFILE"),

      userInstruction:
        z
          .string()
          .trim()
          .max(
            MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS,
          )
          .default(""),
    })
    .strict()

export type MiravaSessionBuilderV2Options =
  z.infer<
    typeof miravaSessionBuilderV2OptionsSchema
  >

export function createDefaultMiravaSessionBuilderV2Options():
  MiravaSessionBuilderV2Options {
  return miravaSessionBuilderV2OptionsSchema.parse(
    {},
  )
}
