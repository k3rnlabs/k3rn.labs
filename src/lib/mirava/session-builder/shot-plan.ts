import type {
  MiravaResolvedSessionDirection,
} from "./resolve-session-direction"

export const MIRAVA_SESSION_SHOT_INTENTS = [
  "HERO_FULL_BODY",
  "THREE_QUARTER",
  "SEATED_EDITORIAL",
  "CLOSE_PORTRAIT",
  "MOVEMENT",
  "EDITORIAL_VARIATION",
] as const

export type MiravaSessionShotIntent =
  (typeof MIRAVA_SESSION_SHOT_INTENTS)[number]

export const MIRAVA_SESSION_CONTINUITY_LOCKS = [
  "IDENTITY",
  "SET",
  "LIGHTING",
  "WARDROBE",
] as const

export type MiravaSessionContinuityLock =
  (typeof MIRAVA_SESSION_CONTINUITY_LOCKS)[number]

export type MiravaSessionShot =
  Readonly<{
    shotIndex: number
    shotIntent:
      MiravaSessionShotIntent
    label: Readonly<{
      fr: string
      es: string
    }>
    framingPrompt: string
    posePrompt: string
    cameraPrompt: string
    continuityLocks:
      readonly MiravaSessionContinuityLock[]
  }>

const MIRAVA_SESSION_V1_SHOTS:
  readonly MiravaSessionShot[] = [
    {
      shotIndex: 0,
      shotIntent:
        "HERO_FULL_BODY",
      label: {
        fr: "Silhouette principale",
        es: "Silueta principal",
      },
      framingPrompt:
        "full-body hero framing with the entire outfit and footwear clearly visible",
      posePrompt:
        "confident standing fashion pose with balanced posture and clear garment presentation",
      cameraPrompt:
        "eye-level to slightly low camera position with restrained editorial perspective",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 1,
      shotIntent:
        "THREE_QUARTER",
      label: {
        fr: "Portrait trois-quarts",
        es: "Retrato tres cuartos",
      },
      framingPrompt:
        "three-quarter portrait framing from approximately mid-thigh upward",
      posePrompt:
        "relaxed asymmetrical fashion stance with natural arm placement and visible garment structure",
      cameraPrompt:
        "eye-level camera with clean portrait perspective and moderate subject separation",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 2,
      shotIntent:
        "SEATED_EDITORIAL",
      label: {
        fr: "Pose assise",
        es: "Pose sentada",
      },
      framingPrompt:
        "full or three-quarter seated editorial composition preserving clear body and outfit readability",
      posePrompt:
        "controlled seated fashion pose with intentional leg arrangement and natural hand placement",
      cameraPrompt:
        "slightly offset camera position with structured editorial composition",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 3,
      shotIntent:
        "CLOSE_PORTRAIT",
      label: {
        fr: "Portrait rapproché",
        es: "Retrato cercano",
      },
      framingPrompt:
        "close portrait framing from chest or shoulders upward",
      posePrompt:
        "subtle facial and shoulder direction with calm controlled expression",
      cameraPrompt:
        "eye-level portrait camera with natural facial proportions and no wide-angle distortion",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 4,
      shotIntent:
        "MOVEMENT",
      label: {
        fr: "Mouvement",
        es: "Movimiento",
      },
      framingPrompt:
        "full-body dynamic framing with sufficient space around the moving silhouette",
      posePrompt:
        "controlled walking or transitional fashion movement with anatomically coherent limbs",
      cameraPrompt:
        "editorial camera position preserving sharp subject readability and realistic motion",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 5,
      shotIntent:
        "EDITORIAL_VARIATION",
      label: {
        fr: "Variation éditoriale",
        es: "Variación editorial",
      },
      framingPrompt:
        "distinct editorial composition that remains coherent with the completed session",
      posePrompt:
        "strong alternative fashion pose clearly differentiated from the previous five shots",
      cameraPrompt:
        "controlled alternative angle without changing the configured set, lighting or visual identity",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
  ]

export function createMiravaSessionShotPlan(
  direction:
    MiravaResolvedSessionDirection,
): readonly MiravaSessionShot[] {
  if (
    direction.shotCount !==
    MIRAVA_SESSION_V1_SHOTS.length
  ) {
    throw new Error(
      "MIRAVA_SESSION_SHOT_COUNT_MISMATCH",
    )
  }

  return MIRAVA_SESSION_V1_SHOTS.map(
    (shot) => ({
      ...shot,
      label: {
        ...shot.label,
      },
      continuityLocks: [
        ...shot.continuityLocks,
      ],
    }),
  )
}
