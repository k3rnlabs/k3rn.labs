import {
  describe,
  expect,
  it,
} from "vitest"

import {
  readFileSync,
} from "node:fs"


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

if (
  start < 0 ||
  end < 0
) {
  throw new Error(
    "generateStudioImageCandidate source block not found",
  )
}

const generation =
  core.slice(
    start,
    end,
  )


describe(
  "MIRAVA KIE-only prerequisite runtime",
  () => {
    it(
      "hard-routes active image generation through KIE",
      () => {
        expect(
          generation,
        ).toMatch(
          /const useKieCampaignProvider\s*=\s*true/,
        )

        expect(
          generation,
        ).toMatch(
          /const useKieProviderRecovery\s*=\s*false/,
        )

        expect(
          generation,
        ).not.toMatch(
          /if\s*\(\s*!apiKey\s*\)/,
        )
      },
    )

    it(
      "requires KIE configuration and external generation consent",
      () => {
        const config =
          generation.indexOf(
            "isMiravaKieImageProviderEnabled()",
          )

        const consent =
          generation.indexOf(
            "hasMiravaExternalImageGenerationConsent(",
          )

        const hardRoute =
          generation.search(
            /const useKieCampaignProvider\s*=\s*true/,
          )

        expect(config).toBeGreaterThan(-1)
        expect(consent).toBeGreaterThan(config)
        expect(hardRoute).toBeGreaterThan(consent)
      },
    )

    it(
      "makes normal artistic references and all identity assets available to KIE",
      () => {
        expect(
          generation,
        ).toMatch(
          /const kieArtisticReference\s*=\s*!isContinuation/,
        )

        expect(
          generation,
        ).toMatch(
          /const kieIdentityAssets\s*=\s*identityAssets/,
        )
      },
    )

    it(
      "keeps the legacy OpenAI executor behind the unconditional KIE branches",
      () => {
        const artKie =
          generation.search(
            /if\s*\(\s*useKieCampaignProvider\s*&&\s*kieArtisticReference/,
          )

        const singleKie =
          generation.search(
            /if\s*\(\s*useKieCampaignProvider\s*\)\s*\{/,
          )

        const recovery =
          generation.search(
            /if\s*\(\s*useKieProviderRecovery\s*\)/,
          )

        const legacyDirect =
          generation.indexOf(
            "return await executeCall(",
            recovery,
          )

        expect(artKie).toBeGreaterThan(-1)
        expect(singleKie).toBeGreaterThan(artKie)
        expect(recovery).toBeGreaterThan(singleKie)
        expect(legacyDirect).toBeGreaterThan(recovery)
      },
    )

    it(
      "reserves provider capacity before FACE_ID is appended",
      () => {
        expect(
          core,
        ).toContain(
          "const MIRAVA_KIE_REFERENCE_LIMIT = 8",
        )

        expect(
          generation,
        ).toContain(
          "kieSessionProviderInputBudget",
        )

        expect(
          generation,
        ).not.toContain(
          "references.splice(8)",
        )
      },
    )
  },
)
