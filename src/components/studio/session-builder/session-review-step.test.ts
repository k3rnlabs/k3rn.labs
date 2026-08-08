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
} from "./session-review-step"

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
        MIRAVA_SESSION_SHOT_INTENTS,
      )

      expect(
        callSheet.shots,
      ).toHaveLength(6)
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
  },
)
