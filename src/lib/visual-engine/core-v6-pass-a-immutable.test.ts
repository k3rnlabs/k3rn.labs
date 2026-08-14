import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"
import {
  join,
} from "node:path"

const core =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/visual-engine/core.ts",
    ),
    "utf8",
  )

function artisticReferenceBranch():
  string {
  const execute =
    core.indexOf(
      "const executeKieCall =",
    )

  if (execute < 0) {
    throw new Error(
      "executeKieCall not found",
    )
  }

  const remaining =
    core.slice(
      execute,
    )

  const route =
    /if\s*\(\s*kieArtisticReference\s*&&\s*isReferenceAnchor\s*\)\s*\{/
      .exec(
        remaining,
      )

  if (
    !route ||
    route.index === undefined
  ) {
    throw new Error(
      "MIRAVA V6 artistic-reference branch not found",
    )
  }

  const start =
    execute +
    route.index

  const tail =
    core.indexOf(
      "Every remaining MIRAVA image path is KIE-only.",
      start,
    )

  if (tail < 0) {
    throw new Error(
      "MIRAVA V6 KIE-only tail not found",
    )
  }

  const end =
    core.lastIndexOf(
      "/*",
      tail,
    )

  if (end <= start) {
    throw new Error(
      "MIRAVA V6 artistic-reference branch end not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA V6 immutable Pass A",
  () => {
    it(
      "persists v6-pass-a-ready",
      () => {
        const branch =
          artisticReferenceBranch()

        expect(core).toContain(
          '"v6-pass-a-ready"',
        )

        expect(branch).toContain(
          "MIRAVA_KIE_V6_PASS_A_READY_STATE",
        )

        expect(branch).toMatch(
          /providerState:\s*MIRAVA_KIE_V6_PASS_A_READY_STATE/,
        )
      },
    )

    it(
      "stores and returns durable Pass A",
      () => {
        const branch =
          artisticReferenceBranch()

        expect(branch).toContain(
          "storeMiravaKieIntermediateAsset(",
        )

        expect(branch).toMatch(
          /return await downloadAsset\(\{\s*storagePath:\s*storedPassAPath/,
        )
      },
    )

    it(
      "does not derive the restoration target from the artistic reference",
      () => {
        const branch =
          artisticReferenceBranch()

        expect(branch).not.toContain(
          "referenceFaceGeometry",
        )

        expect(branch).not.toContain(
          '"identity-restoration"',
        )

        expect(branch).not.toContain(
          "buildMiravaKieIdentityRestorationPrompt",
        )
      },
    )

    it(
      "activates only for the artistic-reference anchor",
      () => {
        const branch =
          artisticReferenceBranch()

        expect(branch).toMatch(
          /kieArtisticReference\s*&&\s*isReferenceAnchor/,
        )

        expect(branch).not.toContain(
          "useKieCampaignProvider",
        )
      },
    )

    it(
      "has no legacy full-frame restoration pass",
      () => {
        expect(core).not.toContain(
          "MIRAVA_KIE_V5_",
        )

        expect(core).toContain(
          "buildMiravaKieIdentityRestorationPrompt",
        )

        expect(core).toContain(
          "resolveMiravaDetectedFaceRestorationCrop({",
        )

        expect(core).not.toContain(
          "useKieProviderRecovery",
        )
      },
    )
  },
)
