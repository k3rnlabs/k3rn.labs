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
  "ALTERNATE_ANGLE",
  "CLOSING_EDITORIAL",
  "PROFILE_EDITORIAL",
  "DETAIL_EDITORIAL",
  "FINAL_HERO",
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
        "subtle facial and shoulder direction with calm controlled posture",
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
        "editorial camera position preserving sharp subject readability and realistic perspective",
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
        "strong alternative fashion pose clearly differentiated from the previous shots",
      cameraPrompt:
        "controlled alternative angle without changing the configured set, lighting or visual identity",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 6,
      shotIntent:
        "ALTERNATE_ANGLE",
      label: {
        fr: "Angle alternatif",
        es: "Ángulo alternativo",
      },
      framingPrompt:
        "editorial composition with a clearly differentiated but coherent framing",
      posePrompt:
        "controlled alternative fashion direction that remains anatomically natural",
      cameraPrompt:
        "subtle alternate camera height or lateral offset while preserving realistic facial and body proportions",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 7,
      shotIntent:
        "CLOSING_EDITORIAL",
      label: {
        fr: "Image finale",
        es: "Imagen final",
      },
      framingPrompt:
        "strong closing editorial composition coherent with the complete session",
      posePrompt:
        "distinct final fashion direction without repeating the previous compositions",
      cameraPrompt:
        "controlled editorial perspective preserving the configured set, lighting and identity",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 8,
      shotIntent:
        "PROFILE_EDITORIAL",
      label: {
        fr: "Profil éditorial",
        es: "Perfil editorial",
      },
      framingPrompt:
        "profile or near-profile editorial composition with strong subject readability and a clearly differentiated silhouette",
      posePrompt:
        "controlled profile-oriented fashion direction with natural posture, coherent limbs and restrained body rotation",
      cameraPrompt:
        "lateral or near-lateral editorial camera position preserving natural facial and body proportions without wide-angle distortion",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 9,
      shotIntent:
        "DETAIL_EDITORIAL",
      label: {
        fr: "Détail éditorial",
        es: "Detalle editorial",
      },
      framingPrompt:
        "distinct editorial detail composition that adds visual variety while preserving clear identity and wardrobe continuity",
      posePrompt:
        "restrained fashion direction designed to reveal styling, garment construction or accessories without duplicating prior poses",
      cameraPrompt:
        "controlled editorial perspective with realistic proportions and deliberate emphasis on session detail",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
    {
      shotIndex: 10,
      shotIntent:
        "FINAL_HERO",
      label: {
        fr: "Image de clôture",
        es: "Imagen de cierre",
      },
      framingPrompt:
        "strong final hero composition that closes the complete editorial session without repeating an earlier framing",
      posePrompt:
        "confident final fashion direction with a distinct silhouette and natural anatomically coherent posture",
      cameraPrompt:
        "premium closing editorial perspective preserving the configured set, lighting, wardrobe and recognizable identity",
      continuityLocks:
        MIRAVA_SESSION_CONTINUITY_LOCKS,
    },
  ]

const MIRAVA_SESSION_SHOT_LIBRARY_INDEXES =
  {
    1: [
      0,
    ],
    2: [
      0,
      3,
    ],
    3: [
      0,
      1,
      3,
    ],
    4: [
      0,
      1,
      3,
      5,
    ],
    5: [
      0,
      1,
      2,
      3,
      5,
    ],
    /*
     * Legacy V1 sessions retain their exact
     * original six-shot sequence.
     */
    6: [
      0,
      1,
      2,
      3,
      4,
      5,
    ],
    7: [
      0,
      1,
      2,
      3,
      4,
      5,
      7,
    ],
    /*
     * Preserve the already-defined eight-shot
     * sequence exactly.
     */
    8: [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
    ],
    /*
     * For nine and ten photos, keep the historical
     * eight-shot closing role reserved for eight-shot
     * sessions and use the extended closing hero.
     */
    9: [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      8,
      10,
    ],
    10: [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      8,
      9,
      10,
    ],
  } as const

export function createMiravaSessionShotPlan(
  direction:
    MiravaResolvedSessionDirection,
): readonly MiravaSessionShot[] {
  const indexes =
    MIRAVA_SESSION_SHOT_LIBRARY_INDEXES[
      direction.shotCount
    ]

  if (!indexes) {
    throw new Error(
      "MIRAVA_SESSION_SHOT_COUNT_MISMATCH",
    )
  }

  return indexes.map(
    (
      libraryIndex,
      shotIndex,
    ) => {
      const shot =
        MIRAVA_SESSION_V1_SHOTS[
          libraryIndex
        ]

      if (!shot) {
        throw new Error(
          "MIRAVA_SESSION_SHOT_MISSING",
        )
      }

      return {
        ...shot,
        /*
         * The persisted shotIndex is always
         * contiguous 0..N-1, even when a shorter
         * plan selects a subset of the library.
         */
        shotIndex,
        label: {
          ...shot.label,
        },
        continuityLocks: [
          ...shot.continuityLocks,
        ],
      }
    },
  )
}
