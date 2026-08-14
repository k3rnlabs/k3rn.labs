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

const route =
  readFileSync(
    "src/app/api/visual-engine/identity-profile/assets/[id]/route.ts",
    "utf8",
  )

describe(
  "MIRAVA BODY_ID external identity-analysis consent boundary",
  () => {
    it(
      "invalidates morphology before checking external-analysis consent",
      () => {
        const start =
          core.indexOf(
            "async function refreshIdentityMorphologyForProfile(",
          )

        const end =
          core.indexOf(
            "\nasync function ",
            start + 20,
          )

        const refresh =
          core.slice(
            start,
            end > start
              ? end
              : undefined,
          )

        const invalidateIndex =
          refresh.indexOf(
            "identityMorphology:",
          )

        const consentIndex =
          refresh.indexOf(
            "requireMiravaExternalIdentityAnalysisConsent(",
          )

        const assetsIndex =
          refresh.indexOf(
            "db.studioIdentityAsset.findMany",
          )

        expect(start).toBeGreaterThan(
          -1,
        )

        expect(invalidateIndex).toBeGreaterThan(
          -1,
        )

        expect(consentIndex).toBeGreaterThan(
          invalidateIndex,
        )

        expect(assetsIndex).toBeGreaterThan(
          consentIndex,
        )
      },
    )

    it(
      "returns before preparing identity derivatives when consent cannot be verified",
      () => {
        const start =
          core.indexOf(
            "async function refreshIdentityMorphologyForProfile(",
          )

        const assetsIndex =
          core.indexOf(
            "db.studioIdentityAsset.findMany",
            start,
          )

        const beforeAssets =
          core.slice(
            start,
            assetsIndex,
          )

        expect(beforeAssets).toContain(
          "[mirava-identity-morphology-skipped-consent]",
        )

        expect(beforeAssets).toMatch(
          /catch\s*\(error\)[\s\S]*?return/,
        )
      },
    )

    it(
      "keeps the external KIE request strictly downstream of the consent gate",
      () => {
        const start =
          core.indexOf(
            "async function refreshIdentityMorphologyForProfile(",
          )

        const consentIndex =
          core.indexOf(
            "requireMiravaExternalIdentityAnalysisConsent(",
            start,
          )

        const providerIndex =
          core.indexOf(
            "runKieMultimodalAnalysis({",
            start,
          )

        expect(consentIndex).toBeGreaterThan(
          start,
        )

        expect(providerIndex).toBeGreaterThan(
          consentIndex,
        )
      },
    )

    it(
      "requires general identity consent for replacement but not deletion",
      () => {
        const postStart =
          route.indexOf(
            "export async function POST(",
          )

        const deleteStart =
          route.indexOf(
            "export async function DELETE(",
          )

        const post =
          route.slice(
            postStart,
            deleteStart,
          )

        const deletion =
          route.slice(
            deleteStart,
          )

        expect(post).toContain(
          "requireMiravaIdentityConsent(",
        )

        expect(deletion).not.toContain(
          "requireMiravaIdentityConsent(",
        )
      },
    )
  },
)
