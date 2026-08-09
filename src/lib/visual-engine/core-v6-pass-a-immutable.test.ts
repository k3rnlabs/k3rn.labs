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

const core = readFileSync(
  join(
    process.cwd(),
    "src/lib/visual-engine/core.ts",
  ),
  "utf8",
)

function artisticReferenceBranch(): string {
  const execute =
    core.indexOf(
      "const executeKieCall",
    )

  const start =
    core.indexOf(
      "if (\n     useKieCampaignProvider &&\n     kieArtisticReference",
      execute,
    )

  const end =
    core.indexOf(
      "Kie without an artistic reference",
      start,
    )

  if (
    execute < 0 ||
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "MIRAVA V6 artistic-reference branch not found",
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
        expect(core).toContain(
          '"v6-pass-a-ready"',
        )

        expect(
          artisticReferenceBranch(),
        ).toMatch(
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
      },
    )
  },
)
