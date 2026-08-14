import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS,
  createDefaultMiravaSessionBuilderV2Options,
  miravaSessionBuilderV2OptionsSchema,
  miravaSessionSelectableShotCountSchema,
} from "./session-options"

describe(
  "MIRAVA Session Builder V2 options contract",
  () => {
    it(
      "uses the product defaults",
      () => {
        expect(
          createDefaultMiravaSessionBuilderV2Options(),
        ).toEqual({
          shotCount: 3,
          framing: "FREE",
          pose: "FREE",
          expression: "FREE",
          gaze: "FREE",
          makeup: "NATURAL",
          skinFinish: "NATURAL",
          hair: "PROFILE",
          userInstruction: "",
        })
      },
    )

    it(
      "exposes every integer from 1 through 10 as selectable photo counts",
      () => {
        expect(
          MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS,
        ).toEqual([
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
        ])

        for (
          const count
          of MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS
        ) {
          expect(
            miravaSessionSelectableShotCountSchema
              .safeParse(
                count,
              )
              .success,
          ).toBe(true)
        }
        expect(
          miravaSessionSelectableShotCountSchema
            .safeParse(0)
            .success,
        ).toBe(false)

        expect(
          miravaSessionSelectableShotCountSchema
            .safeParse(11)
            .success,
        ).toBe(false)
},
    )

    it(
      "keeps legacy six-shot persisted sessions readable",
      () => {
        expect(
          miravaSessionBuilderV2OptionsSchema
            .safeParse({
              shotCount: 6,
            })
            .success,
        ).toBe(true)
      },
    )

    it(
      "validates all structured appearance and direction dimensions",
      () => {
        const parsed =
          miravaSessionBuilderV2OptionsSchema
            .parse({
              shotCount: 8,
              framing:
                "FULL_BODY",
              pose:
                "MOVEMENT",
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
                "  Regard caméra et ambiance très minimaliste.  ",
            })

        expect(
          parsed,
        ).toMatchObject({
          shotCount: 8,
          framing:
            "FULL_BODY",
          pose:
            "MOVEMENT",
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
            "Regard caméra et ambiance très minimaliste.",
        })
      },
    )

    it(
      "does not accept identity data inside the session-options contract",
      () => {
        expect(
          miravaSessionBuilderV2OptionsSchema
            .safeParse({
              faceIdentity:
                "replace-face",
            })
            .success,
        ).toBe(false)

        expect(
          miravaSessionBuilderV2OptionsSchema
            .safeParse({
              identityProfileId:
                "other-profile",
            })
            .success,
        ).toBe(false)
      },
    )

    it(
      "rejects unsupported values",
      () => {
        expect(
          miravaSessionBuilderV2OptionsSchema
            .safeParse({
              shotCount: 11,
            })
            .success,
        ).toBe(false)

        expect(
          miravaSessionBuilderV2OptionsSchema
            .safeParse({
              framing:
                "CINEMATIC",
            })
            .success,
        ).toBe(false)

        expect(
          miravaSessionBuilderV2OptionsSchema
            .safeParse({
              makeup:
                "EDITORIAL_GLOW",
            })
            .success,
        ).toBe(false)
      },
    )
  },
)
