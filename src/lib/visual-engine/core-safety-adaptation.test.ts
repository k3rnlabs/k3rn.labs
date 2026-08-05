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
      "adapts coverage before the first image-provider call",
      () => {
        expect(core).toContain(
          "adaptMiravaCoverageForGeneration",
        )
        expect(core).toContain(
          'rawPrompt,\n      "standard"',
        )
        expect(core).toContain(
          "const prompt =\n    coverageAdaptation.prompt",
        )
      },
    )

    it(
      "keeps one conservative semantic retry after a safety refusal",
      () => {
        expect(core).toContain(
          "complianceNeutralRewrite(fakeCompiled)",
        )
        expect(core).toContain(
          "return await executeCall(rewritten.positivePrompt)",
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
          'providerCode === "moderation_blocked"',
        )
        expect(core).toContain(
          'code === "OPENAI_400_moderation_blocked"',
        )
      },
    )

    it(
      "clears an obsolete failure code when a retried job succeeds",
      () => {
        expect(core).toContain(
          "failureCode: null",
        )
        expect(core).toContain(
          "async function finishJob",
        )
      },
    )

  },
)
