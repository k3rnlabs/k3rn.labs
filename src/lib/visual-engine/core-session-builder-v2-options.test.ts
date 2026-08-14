import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

describe(
  "MIRAVA Session Builder V2 launch propagation",
  () => {
    it(
      "hydrates every structured V2 option at the server launch boundary",
      () => {
        const start =
          core.indexOf(
            "const config = miravaSessionBuilderReadySchema.safeParse({",
          )

        const end =
          core.indexOf(
            "if (!config.success)",
            start,
          )

        expect(
          start,
        ).toBeGreaterThan(-1)

        expect(
          end,
        ).toBeGreaterThan(
          start,
        )

        const block =
          core.slice(
            start,
            end,
          )

        for (
          const field
          of [
            "framing",
            "pose",
            "expression",
            "gaze",
            "makeup",
            "skinFinish",
            "hair",
            "userInstruction",
          ]
        ) {
          expect(
            block,
          ).toMatch(
            new RegExp(
              `${field}:\\s*metadata\\.${field}`,
            ),
          )
        }
      },
    )
  },
)
