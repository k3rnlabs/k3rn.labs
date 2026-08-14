import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SESSION_BUILDER_RESUME_STEPS,
  miravaSessionBuilderResumeStepSchema,
} from "./session-progress"

describe(
  "MIRAVA Session Builder durable progress",
  () => {
    it(
      "accepts only navigation state and no photographic authority",
      () => {
        expect(
          MIRAVA_SESSION_BUILDER_RESUME_STEPS,
        ).toEqual([
          "SET",
          "LIGHTING",
          "DIRECTION",
          "LOOK",
          "REVIEW",
        ])

        for (
          const step
          of MIRAVA_SESSION_BUILDER_RESUME_STEPS
        ) {
          expect(
            miravaSessionBuilderResumeStepSchema
              .safeParse(
                step,
              )
              .success,
          ).toBe(true)
        }

        expect(
          miravaSessionBuilderResumeStepSchema
            .safeParse(
              "IDENTITY",
            )
            .success,
        ).toBe(false)

        expect(
          miravaSessionBuilderResumeStepSchema
            .safeParse(
              "SHOT_COUNT",
            )
            .success,
        ).toBe(false)
      },
    )
  },
)
