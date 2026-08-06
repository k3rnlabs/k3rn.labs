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
      "adapts high-risk lingerie directions before the first provider call",
      () => {
        expect(core).toContain(
          "detectMiravaCampaignRisk",
        )
        expect(core).toContain(
          "buildMiravaCampaignSafeTransferPrompt",
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

        expect(primarySection).toContain(
          "const campaignRisk",
        )
        expect(primarySection).toContain(
          "const resolvedPrimaryPrompt",
        )
        expect(primarySection).toContain(
          "requiresCampaignSafeTransfer",
        )
        expect(primarySection).toContain(
          "buildMiravaCampaignSafeTransferPrompt",
        )
      },
    )

    it(
      "uses campaign-safe variants and a fresh conservative retry",
      () => {
        expect(core).toContain(
          '"campaign-safe-primary"',
        )
        expect(core).toContain(
          '"campaign-safe-fallback"',
        )
        expect(core).toContain(
          'buildMiravaCampaignSafeTransferPrompt(\n          primaryPrompt,\n          "conservative"',
        )

        const campaignFallbackStart =
          core.indexOf(
            "if (\n      campaignRisk.requiresCampaignSafeTransfer",
          )

        const genericFallbackStart =
          core.indexOf(
            "const fallbackBase =",
            campaignFallbackStart,
          )

        expect(
          campaignFallbackStart,
        ).toBeGreaterThan(-1)
        expect(
          genericFallbackStart,
        ).toBeGreaterThan(
          campaignFallbackStart,
        )

        const campaignFallbackSection =
          core.slice(
            campaignFallbackStart,
            genericFallbackStart,
          )

        expect(
          campaignFallbackSection,
        ).not.toContain(
          "fallbackBase",
        )
        expect(
          campaignFallbackSection,
        ).not.toContain(
          "complianceNeutralRewrite",
        )
      },
    )

    it(
      "keeps one conservative semantic retry for non-campaign refusals",
      () => {
        const fallbackStart =
          core.indexOf(
            "const fallbackBase =",
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
      },
    )

    it(
      "logs campaign risk metadata without exposing prompt contents",
      () => {
        expect(core).toContain(
          "campaignSafeTransfer:",
        )
        expect(core).toContain(
          "campaignRiskScore:",
        )
        expect(core).toContain(
          "campaignRiskReasons:",
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
          "const retryable =",
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
