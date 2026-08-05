import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf-8",
  )

describe(
  "MIRAVA core downstream fidelity precedence",
  () => {
    it(
      "passes the real series size into the prompt compiler",
      () => {
        expect(core).toContain(
          "const seriesSize =",
        )

        expect(core).toContain(
          "imageCount:",
        )

        expect(core).toContain(
          "seriesSize",
        )
      },
    )

    it(
      "places a final fidelity precedence block after client preferences",
      () => {
        const preferencesIndex =
          core.indexOf(
            "creativePreferences,",
          )

        const precedenceIndex =
          core.indexOf(
            "downstreamFidelityPrecedence,",
          )

        expect(
          precedenceIndex,
        ).toBeGreaterThan(
          preferencesIndex,
        )

        expect(core).toContain(
          "SINGLE-IMAGE SESSION",
        )

        expect(core).toContain(
          "SERIES FIDELITY ANCHOR",
        )

        expect(core).toContain(
          "When two instructions conflict",
        )
      },
    )
  },
)
