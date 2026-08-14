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
  MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS,
} from "@/lib/mirava/session-builder/session-options"
import {
  miravaSessionBuilderPatchSchema,
} from "@/lib/mirava/session-builder/session-store"

const direction =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-direction-step.tsx",
    ),
    "utf8",
  )

const client =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/lib/mirava/session-builder/session-builder.client.ts",
    ),
    "utf8",
  )

describe(
  "MIRAVA Session Builder shot-count UI",
  () => {
    it(
      "offers every photo count from one through ten",
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
          direction,
        ).toContain(
          "data-mirava-shot-count-selector",
        )

        expect(
          direction,
        ).toContain(
          "MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS.map",
        )
      },
    )

    it(
      "persists shot count as its own Builder patch",
      () => {
        expect(
          miravaSessionBuilderPatchSchema.parse({
            shotCount:
              1,
          }),
        ).toEqual({
          shotCount:
            1,
        })

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
          direction,
        ).toContain(
          "selectShotCount",
        )

        expect(
          direction,
        ).toContain(
          "nextShotCount",
        )

        expect(
          client,
        ).toContain(
          "shotCount?:",
        )
      },
    )

    it(
      "rejects values outside the public Builder contract",
      () => {
        for (
          const invalid
          of [
            0,
            11,
            -1,
            1.5,
          ]
        ) {
          expect(
            miravaSessionBuilderPatchSchema
              .safeParse({
                shotCount:
                  invalid,
              })
              .success,
          ).toBe(
            false,
          )
        }
      },
    )
  },
)
