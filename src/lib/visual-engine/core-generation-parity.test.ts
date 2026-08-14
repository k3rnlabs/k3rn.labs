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
  "MIRAVA primary generation parity",
  () => {
    it(
      "uses the extracted master prompt unchanged for the reference anchor",
      () => {
        const generation =
          generationFunction()

        expect(core).toContain(
          "buildMiravaPrimaryGenerationPrompt",
        )

        expect(core).toContain(
          'return creation.masterPrompt?.trim() ?? ""',
        )

        expect(generation).toMatch(
          /const anchorPrompt[\s\S]*?isReferenceAnchor[\s\S]*?buildMiravaPrimaryGenerationPrompt\(/,
        )
      },
    )

    it(
      "uses the three canonical geometry-backed FACE_ID views",
      () => {
        const generation =
          generationFunction()

        expect(generation).toContain(
          "selectMiravaKieRequiredIdentityFaceInputs(",
        )

        expect(generation).toContain(
          "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS",
        )

        expect(generation).toContain(
          "createMiravaKieIdentityCrop(",
        )

        expect(generation).not.toContain(
          "selectMiravaPrimaryIdentityAssets(",
        )
      },
    )

    it(
      "does not adapt coverage before the active KIE provider call",
      () => {
        const generation =
          generationFunction()

        const primaryStart =
          generation.indexOf(
            "const primaryPrompt",
          )

        const providerStart =
          generation.indexOf(
            "const executeKieCall",
            primaryStart,
          )

        expect(primaryStart).toBeGreaterThan(
          -1,
        )

        expect(providerStart).toBeGreaterThan(
          primaryStart,
        )

        const primarySection =
          generation.slice(
            primaryStart,
            providerStart,
          )

        expect(primarySection).not.toContain(
          "adaptMiravaCoverageForGeneration",
        )
      },
    )

    it(
      "keeps one conservative KIE fallback after a provider safety refusal",
      () => {
        const generation =
          generationFunction()

        expect(generation).toContain(
          '"campaign-safe-kie-primary"',
        )

        expect(generation).toContain(
          '"campaign-safe-kie-fallback"',
        )

        expect(generation).toContain(
          'error.code !==\n        "SAFETY_REFUSAL"',
        )

        expect(generation).toContain(
          "await clearKieTaskState()",
        )

        expect(generation).toMatch(
          /buildMiravaCampaignSafeTransferPrompt\([\s\S]*?primaryPrompt,[\s\S]*?"conservative"/,
        )
      },
    )

    it(
      "logs KIE diagnostics without logging the prompt body",
      () => {
        const generation =
          generationFunction()

        const logStart =
          generation.indexOf(
            '"[mirava-kie-image-attempt]"',
          )

        const providerCallStart =
          generation.indexOf(
            "try {",
            logStart,
          )

        expect(logStart).toBeGreaterThan(
          -1,
        )

        expect(providerCallStart).toBeGreaterThan(
          logStart,
        )

        const logSection =
          generation.slice(
            logStart,
            providerCallStart,
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
          "prompt: promptText",
        )

        expect(logSection).not.toContain(
          "prompt: providerPrompt",
        )
      },
    )
  },
)
