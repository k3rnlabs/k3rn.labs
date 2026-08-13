import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core = readFileSync(
  "src/lib/visual-engine/core.ts",
  "utf8",
)

function artisticReferenceRoute(): string {
  const match =
    /if\s*\(\s*useKieCampaignProvider\s*&&\s*kieArtisticReference\s*&&\s*isReferenceAnchor\s*\)\s*\{/
      .exec(core)

  if (
    !match ||
    match.index === undefined
  ) {
    throw new Error(
      "Immutable artistic-reference route not found",
    )
  }

  const end =
    core.indexOf(
      "Kie without an artistic reference",
      match.index,
    )

  if (end < 0) {
    throw new Error(
      "End of immutable artistic-reference route not found",
    )
  }

  return core.slice(
    match.index,
    end,
  )
}

describe(
  "MIRAVA V6.9c immutable Pass A",
  () => {
    it(
      "activates only on the initial artistic-reference anchor",
      () => {
        const route =
          artisticReferenceRoute()

        expect(route).toContain(
          "isReferenceAnchor",
        )
      },
    )

    it(
      "stores Pass A durably and advances to v6-pass-a-ready",
      () => {
        const route =
          artisticReferenceRoute()

        expect(route).toContain(
          "storeMiravaKieIntermediateAsset(",
        )
        expect(route).toContain(
          "MIRAVA_KIE_V6_PASS_A_READY_STATE",
        )
      },
    )

    it(
      "keeps provider restoration outside the immutable full-frame route",
      () => {
        const route =
          artisticReferenceRoute()

        expect(route).not.toContain(
          "buildMiravaKieIdentityRestorationPrompt",
        )
        expect(core).toContain(
          "resolveMiravaDetectedFaceRestorationCrop({",
        )
        expect(core).toContain(
          "compositeMiravaIdentityRestoration({",
        )
      },
    )

    it(
      "returns the immutable durable Pass-A artifact",
      () => {
        const route =
          artisticReferenceRoute()

        expect(route).toMatch(
          /return await downloadAsset\(\{\s*storagePath:\s*storedPassAPath/,
        )
      },
    )

    it(
      "leaves later frames and continuations on the existing one-pass path",
      () => {
        expect(core).toContain(
          "Kie without an artistic reference remains the",
        )
        expect(core).toContain(
          "if (useKieCampaignProvider)",
        )
      },
    )
  },
)
