import {
  describe,
  expect,
  it,
} from "vitest"

import {
  resolveMiravaSessionDirection,
} from "./resolve-session-direction"

import {
  createMiravaSessionShotPlan,
} from "./shot-plan"

import {
  MIRAVA_SESSION_SHOT_COUNT,
  miravaSessionBuilderReadySchema,
} from "./schema"

const base = {
  version: 1 as const,
  mode: "CUSTOM_SHOOT" as const,
  setPresetId:
    "white-cyclorama-v1" as const,
  lightingPresetId:
    "clean-v1" as const,
  lookMode:
    "CUSTOM" as const,
  framing:
    "FREE" as const,
  pose:
    "FREE" as const,
  expression:
    "FREE" as const,
  gaze:
    "FREE" as const,
  makeup:
    "NATURAL" as const,
  skinFinish:
    "NATURAL" as const,
  hair:
    "PROFILE" as const,
  userInstruction: "",
}

describe(
  "MIRAVA variable Session Builder shot count",
  () => {
    it(
      "keeps six as the temporary active default before the RPC migration",
      () => {
        expect(
          MIRAVA_SESSION_SHOT_COUNT,
        ).toBe(6)
      },
    )

    it.each([
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
    ] as const)(
      "accepts persisted shot count %i",
      (
        shotCount,
      ) => {
        expect(
          miravaSessionBuilderReadySchema
            .safeParse({
              ...base,
              shotCount,
            })
            .success,
        ).toBe(true)
      },
    )

    it.each([
      0,
      11,
      -1,
      1.5,
    ])(
      "rejects unsupported shot count %i",
      (
        shotCount,
      ) => {
        expect(
          miravaSessionBuilderReadySchema
            .safeParse({
              ...base,
              shotCount,
            })
            .success,
        ).toBe(false)
      },
    )

    it.each([
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
    ] as const)(
      "builds exactly %i contiguous canonical shots",
      (
        shotCount,
      ) => {
        const config =
          miravaSessionBuilderReadySchema
            .parse({
              ...base,
              shotCount,
            })

        const direction =
          resolveMiravaSessionDirection(
            config,
          )

        const plan =
          createMiravaSessionShotPlan(
            direction,
          )

        expect(
          plan,
        ).toHaveLength(
          shotCount,
        )

        expect(
          plan.map(
            (shot) =>
              shot.shotIndex,
          ),
        ).toEqual(
          Array.from(
            {
              length:
                shotCount,
            },
            (
              _,
              index,
            ) => index,
          ),
        )
      },
    )

    it(
      "preserves the exact legacy six-shot intent sequence",
      () => {
        const config =
          miravaSessionBuilderReadySchema
            .parse({
              ...base,
              shotCount: 6,
            })

        expect(
          createMiravaSessionShotPlan(
            resolveMiravaSessionDirection(
              config,
            ),
          ).map(
            (shot) =>
              shot.shotIntent,
          ),
        ).toEqual([
          "HERO_FULL_BODY",
          "THREE_QUARTER",
          "SEATED_EDITORIAL",
          "CLOSE_PORTRAIT",
          "MOVEMENT",
          "EDITORIAL_VARIATION",
        ])
      },
    )

    it(
      "uses a compact diversified three-photo plan",
      () => {
        const config =
          miravaSessionBuilderReadySchema
            .parse({
              ...base,
              shotCount: 3,
            })

        expect(
          createMiravaSessionShotPlan(
            resolveMiravaSessionDirection(
              config,
            ),
          ).map(
            (shot) =>
              shot.shotIntent,
          ),
        ).toEqual([
          "HERO_FULL_BODY",
          "THREE_QUARTER",
          "CLOSE_PORTRAIT",
        ])
      },
    )

    it.each([
      2,
      4,
      7,
      9,
      10,
    ] as const)(
      "builds a curated non-legacy plan for %i photos",
      (
        shotCount,
      ) => {
        const config =
          miravaSessionBuilderReadySchema
            .parse({
              ...base,
              shotCount,
            })

        const plan =
          createMiravaSessionShotPlan(
            resolveMiravaSessionDirection(
              config,
            ),
          )

        expect(
          plan,
        ).toHaveLength(
          shotCount,
        )

        expect(
          plan.map(
            (shot) =>
              shot.shotIndex,
          ),
        ).toEqual(
          Array.from(
            {
              length:
                shotCount,
            },
            (
              _,
              index,
            ) =>
              index,
          ),
        )
      },
    )

    it(
      "extends the full plan to eight photographs without duplicating shot indexes",
      () => {
        const config =
          miravaSessionBuilderReadySchema
            .parse({
              ...base,
              shotCount: 8,
            })

        const plan =
          createMiravaSessionShotPlan(
            resolveMiravaSessionDirection(
              config,
            ),
          )

        expect(
          plan[6]
            .shotIntent,
        ).toBe(
          "ALTERNATE_ANGLE",
        )

        expect(
          plan[7]
            .shotIntent,
        ).toBe(
          "CLOSING_EDITORIAL",
        )
      },
    )

    it(
      "uses the extended closing hero for nine and ten photo sessions",
      () => {
        for (
          const shotCount
          of [
            9,
            10,
          ] as const
        ) {
          const config =
            miravaSessionBuilderReadySchema
              .parse({
                ...base,
                shotCount,
              })

          const plan =
            createMiravaSessionShotPlan(
              resolveMiravaSessionDirection(
                config,
              ),
            )

          expect(
            plan[
              plan.length - 1
            ].shotIntent,
          ).toBe(
            "FINAL_HERO",
          )
        }
      },
    )

    it(
      "keeps the historical eight-photo closing role unchanged",
      () => {
        const config =
          miravaSessionBuilderReadySchema
            .parse({
              ...base,
              shotCount: 8,
            })

        const plan =
          createMiravaSessionShotPlan(
            resolveMiravaSessionDirection(
              config,
            ),
          )

        expect(
          plan[
            plan.length - 1
          ].shotIntent,
        ).toBe(
          "CLOSING_EDITORIAL",
        )
      },
    )
  },
)
