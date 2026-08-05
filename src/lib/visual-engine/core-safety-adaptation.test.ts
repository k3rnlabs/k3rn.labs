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
  "MIRAVA generation safety adaptation contracts",
  () => {
    it(
      "keeps the first provider attempt free of preventive coverage rewriting",
      () => {
        expect(core).not.toContain(
          'import { adaptMiravaCoverageForGeneration } from "@/lib/mirava/pipeline/coverage-safety-adaptation"',
        )

        const primaryStart =
          core.indexOf(
            "const primaryPrompt",
          )

        const executeStart =
          core.indexOf(
            "const executeCall",
            primaryStart,
          )

        const primarySection =
          core.slice(
            primaryStart,
            executeStart,
          )

        expect(primarySection).not.toContain(
          "adaptMiravaCoverageForGeneration",
        )
      },
    )

    it(
      "keeps one conservative semantic retry after a safety refusal",
      () => {
        const fallbackStart =
          core.indexOf(
            "const rewritten =",
          )

        const fallbackEnd =
          core.indexOf(
            '"semantic-fallback"',
            fallbackStart,
          )

        expect(fallbackStart).toBeGreaterThan(
          -1,
        )
        expect(fallbackEnd).toBeGreaterThan(
          fallbackStart,
        )

        const fallbackSection =
          core.slice(
            fallbackStart,
            fallbackEnd + 40,
          )

        expect(fallbackSection).toContain(
          "complianceNeutralRewrite({",
        )

        expect(fallbackSection).toContain(
          "fallbackBase",
        )

        expect(fallbackSection).toContain(
          'negativeGuardrails:\n          ""',
        )
      },
    )

    it(
      "uses a dedicated safe fallback for official MIRAVA universes",
      () => {
        expect(core).toContain(
          "buildMiravaOfficialUniverseSafetyFallbackPrompt",
        )

        expect(core).toContain(
          '"official-safe-fallback"',
        )

        const officialStart =
          core.indexOf(
            "const officialBlueprint =",
          )

        const genericStart =
          core.indexOf(
            "const fallbackBase =",
            officialStart,
          )

        expect(
          officialStart,
        ).toBeGreaterThan(-1)

        expect(
          genericStart,
        ).toBeGreaterThan(
          officialStart,
        )

        const officialSection =
          core.slice(
            officialStart,
            genericStart,
          )

        expect(
          officialSection,
        ).toContain(
          "getMiravaOfficialUniverseBlueprint",
        )

        expect(
          officialSection,
        ).toContain(
          "buildMiravaOfficialUniverseSafetyFallbackPrompt",
        )

        expect(
          officialSection,
        ).toContain(
          '"official-safe-fallback"',
        )

        expect(
          officialSection,
        ).toContain(
          "null",
        )
      },
    )

    it(
      "restores missing generation credits after a final safety refusal",
      () => {
        const compensationBlock =
          core.slice(
            core.indexOf(
              "const requiresTechnicalCompensation",
            ),
            core.indexOf(
              "if (requiresTechnicalCompensation)",
            ),
          )

        expect(compensationBlock).not.toContain(
          'studioError.code !== "SAFETY_REFUSAL"',
        )

        expect(core).toContain(
          "Votre crédit a été restauré.",
        )
      },
    )

    it(
      "normalizes moderation_blocked as a non-retryable safety refusal",
      () => {
        expect(core).toContain(
          '"moderation_blocked"',
        )

        expect(core).toContain(
          '"SAFETY_REFUSAL"',
        )

        expect(core).toContain(
          'const retryable =',
        )
      },
    )

    it(
      "clears an obsolete failure code when a retried job succeeds",
      () => {
        const finishStart =
          core.indexOf(
            "async function finishJob",
          )

        const finishEnd =
          core.indexOf(
            "async function failJob",
            finishStart,
          )

        const finishSection =
          core.slice(
            finishStart,
            finishEnd,
          )

        expect(finishSection).toContain(
          'status: "DONE"',
        )

        expect(finishSection).toContain(
          "failureCode: null",
        )
      },
    )
  },
)
