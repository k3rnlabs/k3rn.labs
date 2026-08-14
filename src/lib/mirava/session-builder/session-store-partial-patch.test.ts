import {
  describe,
  expect,
  it,
} from "vitest"

import {
  miravaSessionBuilderPatchSchema,
} from "./session-store"

describe(
  "MIRAVA Session Builder partial PATCH contract",
  () => {
    it(
      "does not inject direction defaults into a resume-only PATCH",
      () => {
        const parsed =
          miravaSessionBuilderPatchSchema.parse({
            resumeStep:
              "DIRECTION",
          })

        expect(
          parsed,
        ).toEqual({
          resumeStep:
            "DIRECTION",
        })

        expect(
          Object.keys(parsed),
        ).toEqual([
          "resumeStep",
        ])
      },
    )

    it(
      "keeps only explicitly supplied Direction values",
      () => {
        const parsed =
          miravaSessionBuilderPatchSchema.parse({
            framing:
              "FULL_BODY",
            pose:
              "MOVEMENT",
            expression:
              "CONFIDENT",
            gaze:
              "CAMERA",
            resumeStep:
              "LOOK",
          })

        expect(
          parsed,
        ).toEqual({
          framing:
            "FULL_BODY",
          pose:
            "MOVEMENT",
          expression:
            "CONFIDENT",
          gaze:
            "CAMERA",
          resumeStep:
            "LOOK",
        })

        expect(
          parsed,
        ).not.toHaveProperty(
          "makeup",
        )

        expect(
          parsed,
        ).not.toHaveProperty(
          "skinFinish",
        )

        expect(
          parsed,
        ).not.toHaveProperty(
          "hair",
        )

        expect(
          parsed,
        ).not.toHaveProperty(
          "userInstruction",
        )
      },
    )

    it(
      "accepts an explicitly supplied one-through-ten shot count without injecting other fields",
      () => {
        expect(
          miravaSessionBuilderPatchSchema.parse({
            shotCount:
              10,
          }),
        ).toEqual({
          shotCount:
            10,
        })

        expect(
          miravaSessionBuilderPatchSchema
            .safeParse({
              shotCount:
                11,
            })
            .success,
        ).toBe(
          false,
        )
      },
    )

    it(
      "still validates and normalizes explicit free text",
      () => {
        expect(
          miravaSessionBuilderPatchSchema.parse({
            userInstruction:
              "  Regard caméra.  ",
          }),
        ).toEqual({
          userInstruction:
            "Regard caméra.",
        })
      },
    )
  },
)
