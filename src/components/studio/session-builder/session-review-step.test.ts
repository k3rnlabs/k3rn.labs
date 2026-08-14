import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SESSION_CONTINUITY_LOCKS,
  MIRAVA_SESSION_SHOT_INTENTS,
} from "@/lib/mirava/session-builder/shot-plan"

import {
  SESSION_REVIEW_COPY,
  canStartMiravaSessionReview,
  createMiravaSessionReviewCallSheet,
  createMiravaSessionReviewDirectionSummary,
  formatMiravaSessionReviewPhotoCount,
} from "./session-review-step"

const reviewSource =
  readFileSync(
    "src/components/studio/session-builder/session-review-step.tsx",
    "utf8",
  )

const flowSource =
  readFileSync(
    "src/components/studio/session-builder/session-builder-flow.tsx",
    "utf8",
  )

const readyConfig = {
  version: 1,
  mode:
    "CUSTOM_SHOOT",
  setPresetId:
    "editorial-studio-v1",
  lightingPresetId:
    "direct-flash-v1",
  shotCount: 6,
  lookMode:
    "CUSTOM",
  framing: "FREE",
  pose: "FREE",
  expression: "FREE",
  gaze: "FREE",
  makeup: "NATURAL",
  skinFinish: "NATURAL",
  hair: "PROFILE",
  userInstruction: "",
} as const

describe(
  "MIRAVA Session Builder review step",
  () => {
    it("derives the call sheet from canonical session direction and shot plan", () => {
      const callSheet =
        createMiravaSessionReviewCallSheet(
          readyConfig,
          "fr",
        )

      expect(
        callSheet.set.id,
      ).toBe(
        "editorial-studio-v1",
      )

      expect(
        callSheet.lighting.id,
      ).toBe(
        "direct-flash-v1",
      )

      expect(
        callSheet.lookMode,
      ).toBe(
        "CUSTOM",
      )

      expect(
        callSheet.shots.map(
          (shot) =>
            shot.shotIntent,
        ),
      ).toEqual(
        MIRAVA_SESSION_SHOT_INTENTS.slice(
          0,
          readyConfig.shotCount,
        ),
      )

      expect(
        callSheet.shots,
      ).toHaveLength(6)
    })

    it("renders the complete canonical ten-photo review plan", () => {
      const tenPhotoConfig = {
        ...readyConfig,
        shotCount:
          10,
      } as const

      const callSheet =
        createMiravaSessionReviewCallSheet(
          tenPhotoConfig,
          "fr",
        )

      expect(
        callSheet.shots,
      ).toHaveLength(
        10,
      )

      expect(
        callSheet.shots.map(
          (shot) =>
            shot.shotIndex,
        ),
      ).toEqual([
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
      ])

      expect(
        callSheet.shots[
          callSheet.shots.length - 1
        ].shotIntent,
      ).toBe(
        "FINAL_HERO",
      )

      expect(
        formatMiravaSessionReviewPhotoCount(
          "fr",
          tenPhotoConfig.shotCount,
        ),
      ).toBe(
        "10 photos",
      )

      expect(
        formatMiravaSessionReviewPhotoCount(
          "es",
          tenPhotoConfig.shotCount,
        ),
      ).toBe(
        "10 fotos",
      )
    })

    it("keeps all four continuity locks on every review shot", () => {
      const callSheet =
        createMiravaSessionReviewCallSheet(
          readyConfig,
          "fr",
        )

      for (
        const shot
        of callSheet.shots
      ) {
        expect(
          shot.continuityLocks,
        ).toEqual(
          MIRAVA_SESSION_CONTINUITY_LOCKS,
        )
      }
    })

    it("localizes the canonical shot labels", () => {
      const fr =
        createMiravaSessionReviewCallSheet(
          readyConfig,
          "fr",
        )

      const es =
        createMiravaSessionReviewCallSheet(
          readyConfig,
          "es",
        )

      expect(
        fr.shots[0].label,
      ).toBe(
        "Silhouette principale",
      )

      expect(
        es.shots[0].label,
      ).toBe(
        "Silueta principal",
      )
    })

    it("surfaces the exact localized Builder direction in Review", () => {
      const configured = {
        ...readyConfig,
        framing:
          "FULL_BODY",
        pose:
          "MOVEMENT",
        expression:
          "SOFT_SMILE",
        gaze:
          "CAMERA",
        makeup:
          "NONE",
        skinFinish:
          "EDITORIAL",
        hair:
          "LOOSE",
        userInstruction:
          "Ambiance très minimaliste.",
      } as const

      const fr =
        createMiravaSessionReviewDirectionSummary(
          configured,
          "fr",
        )

      expect(
        fr,
      ).toEqual([
        {
          key:
            "framing",
          label:
            "Cadrage",
          value:
            "Plein pied",
        },
        {
          key:
            "pose",
          label:
            "Pose",
          value:
            "En mouvement",
        },
        {
          key:
            "expression",
          label:
            "Expression",
          value:
            "Sourire léger",
        },
        {
          key:
            "gaze",
          label:
            "Regard",
          value:
            "Caméra",
        },
        {
          key:
            "makeup",
          label:
            "Maquillage",
          value:
            "Aucun",
        },
        {
          key:
            "skinFinish",
          label:
            "Peau",
          value:
            "Éditoriale",
        },
        {
          key:
            "hair",
          label:
            "Cheveux",
          value:
            "Détachés",
        },
        {
          key:
            "instruction",
          label:
            "Ajouter une précision",
          value:
            "Ambiance très minimaliste.",
        },
      ])

      const es =
        createMiravaSessionReviewDirectionSummary(
          configured,
          "es",
        )

      expect(
        es[0],
      ).toEqual({
        key:
          "framing",
        label:
          "Encuadre",
        value:
          "Cuerpo entero",
      })

      expect(
        es[4].value,
      ).toBe(
        "Ninguno",
      )
    })

    it("uses a neutral localized value when no free instruction exists", () => {
      expect(
        createMiravaSessionReviewDirectionSummary(
          readyConfig,
          "fr",
        )[7].value,
      ).toBe(
        "Aucune précision",
      )

      expect(
        createMiravaSessionReviewDirectionSummary(
          readyConfig,
          "es",
        )[7].value,
      ).toBe(
        "Sin precisión",
      )
    })

    it("formats the photo count from the persisted shot count", () => {
      expect(
        formatMiravaSessionReviewPhotoCount(
          "fr",
          1,
        ),
      ).toBe(
        "1 photo",
      )

      expect(
        formatMiravaSessionReviewPhotoCount(
          "fr",
          8,
        ),
      ).toBe(
        "8 photos",
      )

      expect(
        formatMiravaSessionReviewPhotoCount(
          "es",
          1,
        ),
      ).toBe(
        "1 foto",
      )

      expect(
        formatMiravaSessionReviewPhotoCount(
          "es",
          8,
        ),
      ).toBe(
        "8 fotos",
      )
    })

    it("blocks launch when credits are insufficient", () => {
      expect(
        canStartMiravaSessionReview(
          {
            configurationReady:
              true,
            creditCost:
              6,
            availableCredits:
              5,
          },
        ),
      ).toBe(false)

      expect(
        canStartMiravaSessionReview(
          {
            configurationReady:
              true,
            creditCost:
              6,
            availableCredits:
              6,
          },
        ),
      ).toBe(true)
    })

    it("blocks launch for incomplete or busy sessions", () => {
      expect(
        canStartMiravaSessionReview(
          {
            configurationReady:
              false,
            creditCost:
              6,
            availableCredits:
              20,
          },
        ),
      ).toBe(false)

      expect(
        canStartMiravaSessionReview(
          {
            configurationReady:
              true,
            creditCost:
              6,
            availableCredits:
              20,
            startBusy:
              true,
          },
        ),
      ).toBe(false)
    })

    it("blocks launch while the shoot engine is intentionally unavailable", () => {
      expect(
        canStartMiravaSessionReview(
          {
            configurationReady:
              true,
            creditCost:
              6,
            availableCredits:
              20,
            launchEnabled:
              false,
          },
        ),
      ).toBe(false)
    })

    it("does not invent a credit requirement when balance is not provided", () => {
      expect(
        canStartMiravaSessionReview(
          {
            configurationReady:
              true,
            creditCost:
              6,
            availableCredits:
              null,
          },
        ),
      ).toBe(true)
    })

    it("uses localized product-facing Review headings", () => {
      expect(
        SESSION_REVIEW_COPY
          .fr.eyebrow,
      ).toBe(
        "Étape 5 · Récapitulatif",
      )

      expect(
        SESSION_REVIEW_COPY
          .fr.callSheet,
      ).toBe(
        "Votre séance",
      )

      expect(
        SESSION_REVIEW_COPY
          .es.eyebrow,
      ).toBe(
        "Paso 5 · Resumen",
      )

      expect(
        SESSION_REVIEW_COPY
          .es.callSheet,
      ).toBe(
        "Tu sesión",
      )
    })

    it("exposes localized final CTA copy", () => {
      expect(
        SESSION_REVIEW_COPY
          .fr.start,
      ).toBe(
        "Démarrer la séance",
      )

      expect(
        SESSION_REVIEW_COPY
          .es.start,
      ).toBe(
        "Iniciar la sesión",
      )
    })


    it("renders the actual selected Builder visuals in Review", () => {
      expect(
        reviewSource,
      ).toContain(
        "data-mirava-review-visual-preview",
      )

      expect(
        reviewSource,
      ).toContain(
        "setPreviewImage",
      )

      expect(
        reviewSource,
      ).toContain(
        "lightingPreviewImage",
      )

      expect(
        reviewSource,
      ).toContain(
        "data-mirava-review-look-thumbnails",
      )

      expect(
        reviewSource,
      ).toContain(
        "referrerPolicy=\"no-referrer\"",
      )
    })

    it("wires existing set and lighting preview maps into final Review", () => {
      expect(
        flowSource,
      ).toContain(
        `setPreviewImages={
            setPreviewImages
          }`,
      )

      expect(
        flowSource,
      ).toContain(
        `lightingPreviewImages={
            lightingPreviewImages
          }`,
      )
    })
  },
)
