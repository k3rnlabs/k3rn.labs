import {
  adaptMiravaCoverageForGeneration,
  buildMiravaCampaignSafeTransferPrompt,
  detectMiravaCampaignRisk,
} from "../pipeline/coverage-safety-adaptation"
import {
  complianceNeutralRewrite,
} from "../pipeline/compliance-neutral-rewrite"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA coverage safety adaptation",
  () => {
    const revealingPrompt = `
Create a realistic vertical 2:3 portrait photograph in an intimate adult boudoir-fashion style.

Dress the model in a long, sheer white lace kimono robe. The robe is gathered upward at the back by the model’s hand and remains open below the waist, reproducing the same rear-facing garment coverage without increasing exposure.

Keep the hips sharply resolved and subtly projected backward.
    `.trim()

    it(
      "changes revealing visual construction before generation",
      () => {
        const result =
          adaptMiravaCoverageForGeneration(
            revealingPrompt,
          )

        expect(result.adapted).toBe(true)
        expect(result.riskScore).toBeGreaterThanOrEqual(3)
        expect(result.prompt).toContain(
          "COVERAGE-SAFE COMMERCIAL EDITORIAL ADAPTATION",
        )
        expect(result.prompt).toContain(
          "fully opaque, high-waisted neutral underlayer",
        )
        expect(result.prompt).toContain(
          "continuously draped across the seat",
        )
        expect(result.prompt).not.toMatch(
          /\bboudoir\b/i,
        )
        expect(result.prompt).not.toContain(
          "open below the waist",
        )
        expect(result.prompt).not.toContain(
          "gathered upward at the back",
        )
        expect(result.prompt).not.toContain(
          "hips sharply resolved",
        )
        expect(result.prompt).not.toContain(
          "subtly projected backward",
        )
      },
    )

    it(
      "does not trigger from negative guardrails alone",
      () => {
        const prompt = [
          "Create a fully covered neutral commercial fashion portrait in a tailored opaque suit.",
          "Avoid: explicit nudity, erotic intensification, transparent fabric, lifted garments",
        ].join("\n\n")

        const result =
          adaptMiravaCoverageForGeneration(
            prompt,
          )

        expect(result.adapted).toBe(false)
        expect(result.prompt).toBe(prompt)
      },
    )

    it(
      "uses conservative construction after a provider safety refusal",
      () => {
        const rewritten =
          complianceNeutralRewrite({
            positivePrompt:
              revealingPrompt,
            negativeGuardrails:
              "identity drift",
            sceneProfile:
              "standard_fashion",
            metadata: {
              extractorVersion:
                "2.4.0",
              classifierVersion:
                "1.0.0",
              compilerVersion:
                "1.3.0",
              compiledAt:
                new Date().toISOString(),
            },
          })

        expect(rewritten.positivePrompt).toContain(
          "CONSERVATIVE RETRY",
        )
        expect(rewritten.positivePrompt).toContain(
          "fully opaque editorial styling",
        )
        expect(rewritten.positivePrompt).not.toMatch(
          /\bboudoir\b/i,
        )
      },
    )

    it(
      "detects and reconstructs a high-risk lingerie campaign before generation",
      () => {
        const prompt = `
TRANSFER_MODE = FIDELITY

Create a vertical Penthouse-style adult magazine lingerie portrait.

The model wears black transparent lace lingerie with unlined cups and a narrow g-string bottom.

Use frontal chest-to-pelvis framing. The chest and pelvis are the dominant visual emphasis. One fingertip rests on her lips while the back is arched and the hips are projected toward the camera.

ENVIRONMENT — Grey veined marble wall in a modern interior.

LIGHTING — Soft frontal beauty light with controlled shadows and clean skin exposure.

CAMERA — Vertical digital editorial photograph with a normal perspective lens.

COLOR AND FINISH — Neutral grey palette, polished high-contrast digital finish and sharp fabric detail.
        `.trim()

        const risk =
          detectMiravaCampaignRisk(
            prompt,
          )

        expect(
          risk.requiresCampaignSafeTransfer,
        ).toBe(true)
        expect(
          risk.riskScore,
        ).toBeGreaterThanOrEqual(10)
        expect(
          risk.reasons,
        ).toContain(
          "adult-publication-aesthetic",
        )

        const safePrompt =
          buildMiravaCampaignSafeTransferPrompt(
            prompt,
          )

        expect(safePrompt).toContain(
          "TRANSFER_MODE = CAMPAIGN_SAFE_TRANSFER",
        )
        expect(safePrompt).toContain(
          "commercial lingerie campaign",
        )
        expect(safePrompt).toContain(
          "Grey veined marble wall",
        )
        expect(safePrompt).toContain(
          "Soft frontal beauty light",
        )
        expect(safePrompt).toContain(
          "structured fully lined opaque cups",
        )
        expect(safePrompt).toContain(
          "high-waisted brief",
        )
        expect(safePrompt).toContain(
          "eye-level camera",
        )
        expect(
          safePrompt.toLowerCase(),
        ).not.toContain(
          "penthouse",
        )
        expect(
          safePrompt.toLowerCase(),
        ).not.toContain(
          "g-string",
        )
        expect(
          safePrompt.toLowerCase(),
        ).not.toContain(
          "finger",
        )
        expect(
          safePrompt.toLowerCase(),
        ).not.toContain(
          "chest-to-pelvis",
        )
        expect(
          safePrompt.toLowerCase(),
        ).not.toContain(
          "arched",
        )
      },
    )

    it(
      "does not redirect an ordinary opaque lingerie lookbook",
      () => {
        const prompt = [
          "Create a premium commercial lingerie lookbook photograph.",
          "Use a fully opaque structured bra and high-waisted brief.",
          "The model stands naturally in a balanced eye-level three-quarter composition.",
          "Use soft studio light against a neutral stone wall.",
        ].join("\n\n")

        const risk =
          detectMiravaCampaignRisk(
            prompt,
          )

        expect(
          risk.requiresCampaignSafeTransfer,
        ).toBe(false)
      },
    )

    it(
      "uses a fresh conservative retail construction for the second attempt",
      () => {
        const safePrompt =
          buildMiravaCampaignSafeTransferPrompt(
            revealingPrompt,
            "conservative",
          )

        expect(safePrompt).toContain(
          "TRANSFER_MODE = CAMPAIGN_SAFE_TRANSFER",
        )
        expect(safePrompt).toContain(
          "fully opaque black lingerie set",
        )
        expect(safePrompt).toContain(
          "full-coverage brief",
        )
        expect(safePrompt).toContain(
          "neutral balanced standing pose",
        )
      },
    )
  },
)
