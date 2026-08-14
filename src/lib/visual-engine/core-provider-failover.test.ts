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

describe(
  "MIRAVA KIE-only provider recovery contract",
  () => {
    it(
      "contains no legacy OpenAI to KIE failover route",
      () => {
        expect(
          core,
        ).not.toContain(
          "useKieProviderRecovery",
        )

        expect(
          core,
        ).not.toContain(
          '"provider-recovery-kie"',
        )

        expect(
          core,
        ).not.toContain(
          "[mirava-image-provider-failover]",
        )

        expect(
          core,
        ).not.toContain(
          "return await executeCall(",
        )
      },
    )

    it(
      "requires KIE before any active image generation",
      () => {
        expect(
          core,
        ).toContain(
          "!isMiravaKieImageProviderEnabled()",
        )

        expect(
          core,
        ).toContain(
          "hasMiravaExternalImageGenerationConsent(",
        )

        expect(
          core,
        ).toContain(
          "runKieImageGeneration({",
        )
      },
    )

    it(
      "keeps the safety fallback inside KIE",
      () => {
        expect(
          core,
        ).toContain(
          '"campaign-safe-kie-primary"',
        )

        expect(
          core,
        ).toContain(
          '"campaign-safe-kie-fallback"',
        )

        expect(
          core,
        ).toContain(
          "buildMiravaCampaignSafeTransferPrompt(",
        )

        expect(
          core,
        ).toContain(
          "await clearKieTaskState()",
        )
      },
    )

    it(
      "does not retain a hidden OpenAI image fallback",
      () => {
        expect(
          core,
        ).not.toContain(
          "MIRAVA_IMAGE_MODEL",
        )

        expect(
          core,
        ).not.toContain(
          "images/generations",
        )

        expect(
          core,
        ).not.toContain(
          "images/edits",
        )
      },
    )
  },
)
