import {
  describe,
  expect,
  it,
} from "vitest"

import {
  SESSION_DIRECTION_COPY,
  SESSION_DIRECTION_OPTIONS,
  createMiravaSessionDirectionPatch,
  updateMiravaSessionDirectionState,
} from "./session-direction-step"

describe(
  "MIRAVA Session Builder direction step",
  () => {
    it(
      "exposes the requested French product labels",
      () => {
        expect(
          SESSION_DIRECTION_OPTIONS
            .fr.framing.map(
              (
                option,
              ) =>
                option.label,
            ),
        ).toEqual([
          "Portrait",
          "Buste",
          "Mi-corps",
          "Plein pied",
          "Libre",
        ])

        expect(
          SESSION_DIRECTION_OPTIONS
            .fr.makeup.map(
              (
                option,
              ) =>
                option.label,
            ),
        ).toEqual([
          "Aucun",
          "Naturel",
          "Léger",
          "Soutenu",
        ])

        expect(
          SESSION_DIRECTION_OPTIONS
            .fr.hair.map(
              (
                option,
              ) =>
                option.label,
            ),
        ).toEqual([
          "Comme mon profil",
          "Détachés",
          "Attachés",
          "Libre",
        ])
      },
    )

    it(
      "keeps Spanish localization for every structured group",
      () => {
        expect(
          SESSION_DIRECTION_OPTIONS
            .es.pose,
        ).toHaveLength(5)

        expect(
          SESSION_DIRECTION_OPTIONS
            .es.expression,
        ).toHaveLength(6)

        expect(
          SESSION_DIRECTION_OPTIONS
            .es.gaze,
        ).toHaveLength(3)

        expect(
          SESSION_DIRECTION_OPTIONS
            .es.skinFinish,
        ).toHaveLength(3)

        expect(
          SESSION_DIRECTION_COPY
            .es.instruction,
        ).toBe(
          "Añadir una precisión",
        )
      },
    )

    it(
      "changes one direction control without resetting the other controls",
      () => {
        const current = {
          framing:
            "FULL_BODY",
          pose:
            "MOVEMENT",
          expression:
            "SERIOUS",
          gaze:
            "CAMERA",
          makeup:
            "NONE",
          skinFinish:
            "EDITORIAL",
          hair:
            "LOOSE",
          userInstruction:
            "Composition minimaliste.",
        } as const

        const next =
          updateMiravaSessionDirectionState(
            current,
            "expression",
            "SMILE",
          )

        expect(
          next,
        ).toEqual({
          framing:
            "FULL_BODY",
          pose:
            "MOVEMENT",
          expression:
            "SMILE",
          gaze:
            "CAMERA",
          makeup:
            "NONE",
          skinFinish:
            "EDITORIAL",
          hair:
            "LOOSE",
          userInstruction:
            "Composition minimaliste.",
        })

        expect(
          createMiravaSessionDirectionPatch(
            next,
          ),
        ).toEqual(
          next,
        )
      },
    )

    it(
      "creates only the eight non-identity Builder fields",
      () => {
        const patch =
          createMiravaSessionDirectionPatch(
            {
              framing:
                "FULL_BODY",
              pose:
                "STANDING",
              expression:
                "CONFIDENT",
              gaze:
                "CAMERA",
              makeup:
                "NONE",
              skinFinish:
                "NATURAL",
              hair:
                "LOOSE",
              userInstruction:
                "Regard caméra.",
            },
          )

        expect(
          patch,
        ).toEqual({
          framing:
            "FULL_BODY",
          pose:
            "STANDING",
          expression:
            "CONFIDENT",
          gaze:
            "CAMERA",
          makeup:
            "NONE",
          skinFinish:
            "NATURAL",
          hair:
            "LOOSE",
          userInstruction:
            "Regard caméra.",
        })

        expect(
          "shotCount" in patch,
        ).toBe(false)

        expect(
          "identityProfileId" in patch,
        ).toBe(false)

        expect(
          "faceGeometry" in patch,
        ).toBe(false)
      },
    )
  },
)
