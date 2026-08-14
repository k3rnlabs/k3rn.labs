import {
  readFileSync,
} from "node:fs"
import path from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

import {
  canStartMiravaSessionReview,
} from "./session-review-step"

const flow =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-builder-flow.tsx",
    ),
    "utf8",
  )

const studio =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/visual-engine-studio.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA Session Builder dynamic credit cost",
  () => {
    it(
      "derives Review cost from the current persisted Builder session",
      () => {
        expect(
          flow,
        ).toContain(
          `creditCost={
            session.config
              .shotCount
          }`,
        )

        expect(
          flow,
        ).not.toContain(
          "  creditCost: number",
        )

        expect(
          studio,
        ).not.toContain(
          `creditCost={
                sessionBuilderSession
                  .config
                  .shotCount
              }`,
        )
      },
    )

    it(
      "requires ten available credits for a ten-credit session",
      () => {
        expect(
          canStartMiravaSessionReview({
            configurationReady:
              true,
            creditCost:
              10,
            availableCredits:
              9,
          }),
        ).toBe(
          false,
        )

        expect(
          canStartMiravaSessionReview({
            configurationReady:
              true,
            creditCost:
              10,
            availableCredits:
              10,
          }),
        ).toBe(
          true,
        )
      },
    )
  },
)
