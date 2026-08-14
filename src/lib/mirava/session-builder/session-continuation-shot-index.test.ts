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
  MIRAVA_SESSION_MAX_SHOT_COUNT,
  MIRAVA_SESSION_MAX_SHOT_INDEX,
  MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS,
} from "./session-options"

const route =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/app/api/visual-engine/sessions/[id]/shots/[shotIndex]/continue/route.ts",
    ),
    "utf8",
  )

describe(
  "MIRAVA Session continuation shot index",
  () => {
    it(
      "derives the maximum continuation index from the ten-shot Builder contract",
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

        expect(
          MIRAVA_SESSION_MAX_SHOT_COUNT,
        ).toBe(
          10,
        )

        expect(
          MIRAVA_SESSION_MAX_SHOT_INDEX,
        ).toBe(
          9,
        )
      },
    )

    it(
      "allows every canonical continuation index from zero through nine",
      () => {
        const isRouteIndexValid =
          (
            shotIndex: number,
          ) =>
            Number.isInteger(
              shotIndex,
            ) &&
            shotIndex >= 0 &&
            shotIndex <=
              MIRAVA_SESSION_MAX_SHOT_INDEX

        for (
          let shotIndex = 0;
          shotIndex <= 9;
          shotIndex += 1
        ) {
          expect(
            isRouteIndexValid(
              shotIndex,
            ),
          ).toBe(
            true,
          )
        }
      },
    )

    it(
      "rejects index ten and invalid numeric indexes",
      () => {
        const isRouteIndexValid =
          (
            shotIndex: number,
          ) =>
            Number.isInteger(
              shotIndex,
            ) &&
            shotIndex >= 0 &&
            shotIndex <=
              MIRAVA_SESSION_MAX_SHOT_INDEX

        expect(
          isRouteIndexValid(
            10,
          ),
        ).toBe(
          false,
        )

        expect(
          isRouteIndexValid(
            -1,
          ),
        ).toBe(
          false,
        )

        expect(
          isRouteIndexValid(
            1.5,
          ),
        ).toBe(
          false,
        )
      },
    )

    it(
      "uses the shared maximum instead of a legacy hard-coded route bound",
      () => {
        expect(
          route,
        ).toContain(
          "MIRAVA_SESSION_MAX_SHOT_INDEX",
        )

        expect(
          route,
        ).not.toContain(
          "shotIndex > 5",
        )

        expect(
          route,
        ).not.toContain(
          "shotIndex >= 6",
        )
      },
    )
  },
)
