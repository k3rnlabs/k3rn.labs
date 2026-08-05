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
  "MIRAVA primary generation parity",
  () => {
    it(
      "uses the extracted master prompt unchanged for the reference anchor",
      () => {
        expect(core).toContain(
          "buildMiravaPrimaryGenerationPrompt",
        )

        expect(core).toContain(
          'return creation.masterPrompt?.trim() ?? ""',
        )

        expect(core).toContain(
          'isReferenceAnchor\n      ? buildMiravaPrimaryGenerationPrompt',
        )

        expect(core).toContain(
          '"parity-primary"',
        )
      },
    )

    it(
      "uses three deterministic identity references for the reference anchor",
      () => {
        expect(core).toContain(
          "MIRAVA_PRIMARY_IDENTITY_ASSET_COUNT = 3",
        )

        expect(core).toContain(
          "selectMiravaPrimaryIdentityAssets",
        )

        expect(core).toContain(
          "assets.slice(",
        )
      },
    )

    it(
      "does not adapt coverage before the primary provider call",
      () => {
        const primaryStart =
          core.indexOf(
            "const primaryPrompt",
          )

        const providerStart =
          core.indexOf(
            "const executeCall",
            primaryStart,
          )

        expect(primaryStart).toBeGreaterThan(
          -1,
        )
        expect(providerStart).toBeGreaterThan(
          primaryStart,
        )

        const primarySection =
          core.slice(
            primaryStart,
            providerStart,
          )

        expect(primarySection).not.toContain(
          "adaptMiravaCoverageForGeneration",
        )
      },
    )

    it(
      "keeps one semantic fallback after a provider safety refusal",
      () => {
        expect(core).toContain(
          "complianceNeutralRewrite({",
        )

        expect(core).toContain(
          '"semantic-fallback"',
        )

        expect(core).toContain(
          'error.code !==\n        "SAFETY_REFUSAL"',
        )
      },
    )

    it(
      "logs diagnostics without logging the prompt body",
      () => {
        const logStart =
          core.indexOf(
            '"[mirava-image-attempt]"',
          )

        const formStart =
          core.indexOf(
            "const form = new FormData()",
            logStart,
          )

        expect(logStart).toBeGreaterThan(
          -1,
        )
        expect(formStart).toBeGreaterThan(
          logStart,
        )

        const logSection =
          core.slice(
            logStart,
            formStart,
          )

        expect(logSection).toContain(
          "promptHash",
        )
        expect(logSection).toContain(
          "promptLength",
        )

        expect(logSection).not.toContain(
          "prompt: promptText",
        )
        expect(logSection).not.toContain(
          "promptText,",
        )
      },
    )
  },
)
