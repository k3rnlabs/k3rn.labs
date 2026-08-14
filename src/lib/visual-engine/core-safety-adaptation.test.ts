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
    "utf8",
  )

function generationFunction():
  string {
  const start =
    core.indexOf(
      "async function generateStudioImageCandidate(",
    )

  const end =
    core.indexOf(
      "\nasync function generateStudioImage(",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "generateStudioImageCandidate boundary not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA generation safety adaptation contracts",
  () => {
    it(
      "adapts high-risk campaign directions before the first KIE provider call",
      () => {
        const generation =
          generationFunction()

        const primaryStart =
          generation.indexOf(
            "const primaryPrompt",
          )

        const executeStart =
          generation.indexOf(
            "const executeKieCall",
            primaryStart,
          )

        expect(primaryStart).toBeGreaterThan(
          -1,
        )

        expect(executeStart).toBeGreaterThan(
          primaryStart,
        )

        const primarySection =
          generation.slice(
            primaryStart,
            executeStart,
          )

        expect(primarySection).toContain(
          "detectMiravaCampaignRisk(",
        )

        expect(primarySection).toContain(
          "const resolvedPrimaryPrompt",
        )

        expect(primarySection).toContain(
          "requiresCampaignSafeTransfer",
        )

        expect(primarySection).toContain(
          "buildMiravaCampaignSafeTransferPrompt(",
        )
      },
    )

    it(
      "uses KIE primary and conservative fallback variants",
      () => {
        const generation =
          generationFunction()

        expect(generation).toContain(
          '"campaign-safe-kie-primary"',
        )

        expect(generation).toContain(
          '"campaign-safe-kie-fallback"',
        )

        expect(generation).toMatch(
          /buildMiravaCampaignSafeTransferPrompt\([\s\S]*?primaryPrompt,[\s\S]*?"conservative"/,
        )

        expect(generation).toContain(
          "await clearKieTaskState()",
        )
      },
    )

    it(
      "keeps the safety retry entirely inside KIE",
      () => {
        const generation =
          generationFunction()

        expect(generation).toContain(
          '"SAFETY_REFUSAL"',
        )

        expect(generation).toContain(
          "return await executeKieCall(",
        )

        expect(generation).not.toContain(
          "return await executeCall(",
        )

        expect(generation).not.toContain(
          "complianceNeutralRewrite(",
        )

        expect(generation).not.toContain(
          '"semantic-fallback"',
        )
      },
    )

    it(
      "maps KIE provider safety errors to SAFETY_REFUSAL",
      () => {
        const generation =
          generationFunction()

        const providerStart =
          generation.indexOf(
            "const executeKieCall =",
          )

        const passAStart =
          generation.indexOf(
            "MIRAVA V6.9",
            providerStart,
          )

        expect(providerStart).toBeGreaterThan(
          -1,
        )

        expect(passAStart).toBeGreaterThan(
          providerStart,
        )

        const provider =
          generation.slice(
            providerStart,
            passAStart,
          )

        expect(provider).toMatch(
          /error\.kind\s*===\s*"safety"/,
        )

        expect(provider).toContain(
          '"SAFETY_REFUSAL"',
        )

        expect(provider).toContain(
          "KieProviderError",
        )
      },
    )

    it(
      "logs provider diagnostics without exposing the prompt body",
      () => {
        const generation =
          generationFunction()

        const logStart =
          generation.indexOf(
            '"[mirava-kie-image-attempt]"',
          )

        const callStart =
          generation.indexOf(
            "runKieImageGeneration({",
            logStart,
          )

        expect(logStart).toBeGreaterThan(
          -1,
        )

        expect(callStart).toBeGreaterThan(
          logStart,
        )

        const logSection =
          generation.slice(
            logStart,
            callStart,
          )

        expect(logSection).toContain(
          "variant",
        )

        expect(logSection).toContain(
          "promptHash",
        )

        expect(logSection).toContain(
          "promptLength",
        )

        expect(logSection).toContain(
          "referenceRoles",
        )

        expect(logSection).not.toContain(
          "prompt: providerPrompt",
        )

        expect(logSection).not.toContain(
          "prompt: promptText",
        )
      },
    )

    it(
      "restores missing generation credits after a final safety refusal",
      () => {
        const compensationStart =
          core.indexOf(
            "const requiresTechnicalCompensation",
          )

        const compensationEnd =
          core.indexOf(
            "if (requiresTechnicalCompensation)",
            compensationStart,
          )

        expect(compensationStart).toBeGreaterThan(
          -1,
        )

        expect(compensationEnd).toBeGreaterThan(
          compensationStart,
        )

        const compensation =
          core.slice(
            compensationStart,
            compensationEnd,
          )

        expect(compensation).not.toContain(
          'studioError.code !== "SAFETY_REFUSAL"',
        )

        expect(core).toContain(
          "Votre crédit a été restauré.",
        )
      },
    )

    it(
      "keeps historical OpenAI moderation failures readable without using OpenAI at runtime",
      () => {
        expect(core).toContain(
          '"OPENAI_400_moderation_blocked"',
        )

        expect(core).toMatch(
          /code === "SAFETY_REFUSAL" \|\|[\s\S]*?code === "OPENAI_400_moderation_blocked"[\s\S]*?return "SAFETY_REFUSAL"/,
        )

        expect(core).not.toContain(
          "api.openai.com",
        )

        expect(core).not.toContain(
          "OPENAI_API_KEY",
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

        expect(finishStart).toBeGreaterThan(
          -1,
        )

        expect(finishEnd).toBeGreaterThan(
          finishStart,
        )

        const finish =
          core.slice(
            finishStart,
            finishEnd,
          )

        expect(finish).toContain(
          'status: "DONE"',
        )

        expect(finish).toContain(
          "failureCode: null",
        )
      },
    )
  },
)
