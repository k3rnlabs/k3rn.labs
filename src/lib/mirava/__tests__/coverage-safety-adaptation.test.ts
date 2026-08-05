import {
  adaptMiravaCoverageForGeneration,
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
                "2.3.0",
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
  },
)
