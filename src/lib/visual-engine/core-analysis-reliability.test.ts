import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const core = readFileSync(
  "src/lib/visual-engine/core.ts",
  "utf-8",
)

describe(
  "MIRAVA analysis reliability",
  () => {
    it(
      "gives high-detail reference extraction enough time",
      () => {
        expect(core).toContain(
          "MIRAVA_ANALYSIS_TIMEOUT_MS =\n  150_000",
        )

        expect(core).toContain(
          "AbortSignal.timeout(\n            MIRAVA_ANALYSIS_TIMEOUT_MS",
        )
      },
    )

    it(
      "normalizes provider timeout exceptions",
      () => {
        expect(core).toContain(
          'name === "TimeoutError"',
        )

        expect(core).toContain(
          '"ANALYSIS_TIMEOUT"',
        )

        expect(core).toContain(
          '"GENERATION_TIMEOUT"',
        )
      },
    )

    it(
      "does not automatically repeat a full analysis timeout",
      () => {
        expect(core).toContain(
          '"L’analyse de la référence a dépassé le temps disponible.",\n        "ANALYSIS_TIMEOUT",',
        )

        expect(core).not.toContain(
          '"ANALYSIS_TIMEOUT",\n        true',
        )
      },
    )

    it(
      "records safe analysis diagnostics without logging image data",
      () => {
        expect(core).toContain(
          '"[mirava-analysis-attempt]"',
        )

        expect(core).toContain(
          '"[mirava-analysis-exception]"',
        )

        expect(core).toContain(
          '"[mirava-analysis-response]"',
        )

        expect(core).toContain(
          '"[mirava-job-failure]"',
        )
      },
    )

    it(
      "returns precise public timeout messages",
      () => {
        expect(core).toContain(
          "MIRAVA n’a pas pu terminer la lecture de votre référence",
        )

        expect(core).toContain(
          "Le moteur d’image n’a pas terminé votre création",
        )
      },
    )
  },
)
