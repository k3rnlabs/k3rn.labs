import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const provider =
  readFileSync(
    "src/lib/visual-engine/kie-provider.ts",
    "utf8",
  )

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

describe(
  "MIRAVA KIE image cost telemetry",
  () => {
    it(
      "retains creditsConsumed from KIE task details",
      () => {
        expect(provider).toContain(
          "creditsConsumed?: number | null",
        )

        expect(provider).toContain(
          "typeof info.creditsConsumed ===",
        )

        expect(provider).toContain(
          "creditsConsumed: number | null",
        )
      },
    )

    it(
      "records the real KIE image credit cost",
      () => {
        expect(core).toMatch(
          /\[mirava-kie-image-success\][\s\S]*?creditsConsumed:\s*result\.creditsConsumed/,
        )

        expect(core).toContain(
          "[mirava-kie-image-success]",
        )
      },
    )
  },
)
