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

const start =
  core.indexOf(
    "async function generateStudioImageCandidate(",
  )

const end =
  core.indexOf(
    "\nasync function generateStudioImage(",
    start,
  )

const generation =
  core.slice(
    start,
    end,
  )

describe(
  "MIRAVA KIE primary runtime",
  () => {
    it(
      "contains no direct OpenAI image runtime",
      () => {
        expect(core).not.toContain(
          "OPENAI_API_KEY",
        )

        expect(core).not.toContain(
          "api.openai.com",
        )

        expect(generation).not.toContain(
          "const executeCall = async",
        )
      },
    )

    it(
      "requires KIE configuration and external consent",
      () => {
        expect(generation).toContain(
          "!isMiravaKieImageProviderEnabled()",
        )

        expect(generation).toContain(
          "externalGenerationConsent",
        )

        expect(generation).toContain(
          "hasMiravaExternalImageGenerationConsent(",
        )
      },
    )

    it(
      "contains no hybrid image-provider route",
      () => {
        expect(generation).not.toContain(
          "useKieCampaignProvider",
        )

        expect(generation).not.toContain(
          "useKieProviderRecovery",
        )

        expect(generation).not.toContain(
          "provider-recovery-kie",
        )
      },
    )

    it(
      "routes generation through KIE",
      () => {
        expect(generation).toContain(
          "runKieImageGeneration({",
        )

        expect(generation).toContain(
          '"campaign-safe-kie-primary"',
        )

        expect(generation).toContain(
          '"campaign-safe-kie-fallback"',
        )
      },
    )

    it(
      "preserves FACE_ID BODY_ID and artistic reference inputs",
      () => {
        expect(generation).toMatch(
          /const kieIdentityAssets\s*=\s*identityAssets/,
        )

        expect(generation).toContain(
          "bodyIdentityPrompt",
        )

        expect(generation).toMatch(
          /const kieArtisticReference\s*=\s*!isContinuation/,
        )

        expect(generation).toContain(
          "MIRAVA_KIE_REFERENCE_LIMIT",
        )
      },
    )

    it(
      "preserves V6.9 Pass A and KIE cost telemetry",
      () => {
        expect(generation).toContain(
          "MIRAVA V6.9",
        )

        expect(generation).toMatch(
          /kieArtisticReference\s*&&\s*isReferenceAnchor/,
        )

        expect(generation).toMatch(
          /\[mirava-kie-image-success\][\s\S]*?creditsConsumed:\s*result\.creditsConsumed/,
        )
      },
    )
  },
)
