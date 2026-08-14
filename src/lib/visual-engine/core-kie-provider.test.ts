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

const schema =
  readFileSync(
    "prisma/schema.prisma",
    "utf8",
  )

describe(
  "MIRAVA KIE-only image runtime",
  () => {
    it(
      "routes active image generation through KIE",
      () => {
        expect(
          core,
        ).toContain(
          "!isMiravaKieImageProviderEnabled()",
        )

        expect(
          core,
        ).toContain(
          "runKieImageGeneration({",
        )

        expect(
          core,
        ).not.toContain(
          "useKieCampaignProvider",
        )

        expect(
          core,
        ).not.toContain(
          "useKieProviderRecovery",
        )
      },
    )

    it(
      "persists KIE task state for resumable retries",
      () => {
        expect(
          schema,
        ).toContain(
          "providerTaskId",
        )

        expect(
          schema,
        ).toContain(
          "providerFrameIndex",
        )

        expect(
          core,
        ).toContain(
          "onTaskCreated:",
        )

        expect(
          core,
        ).toContain(
          "const resumeTaskId =",
        )

        expect(
          core,
        ).toContain(
          "resumeTaskId,",
        )
      },
    )

    it(
      "retains the artistic reference for KIE and purges it after completion",
      () => {
        expect(
          core,
        ).toContain(
          "const kieArtisticReference =",
        )

        expect(
          core,
        ).toContain(
          "purgeMiravaArtisticReferenceAssets(",
        )

        expect(
          core,
        ).toContain(
          "[mirava-reference-retained-for-kie-generation]",
        )
      },
    )

    it(
      "keeps V6 Pass A immutable with no full-frame restoration provider pass",
      () => {
        expect(
          core,
        ).toContain(
          "v6-pass-a-ready",
        )

        expect(
          core,
        ).toContain(
          "Pass A is the immutable final full-frame image",
        )

        expect(
          core,
        ).not.toContain(
          '"identity-restoration"',
        )
      },
    )
  },
)
