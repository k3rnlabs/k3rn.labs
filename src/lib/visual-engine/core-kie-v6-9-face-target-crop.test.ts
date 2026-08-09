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

function faceCropHelper(): string {
  const start =
    core.indexOf(
      "async function createMiravaKieRestorationFaceCrop(",
    )

  const end =
    core.indexOf(
      "async function purgeMiravaKieRestorationFaceCrop(",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "Face target helper not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA V6.9 local restoration target",
  () => {
    it(
      "derives the exact crop from referenceFaceGeometry",
      () => {
        const helper =
          faceCropHelper()

        expect(helper).toContain(
          "parseMiravaIdentityFaceGeometry(",
        )
        expect(helper).toContain(
          "resolveMiravaReferenceFaceRestorationCrop(",
        )
        expect(helper).toContain(
          ".extract({",
        )
      },
    )

    it(
      "does not resize the Pass-A face target before storage",
      () => {
        expect(
          faceCropHelper(),
        ).not.toContain(
          ".resize(",
        )
      },
    )

    it(
      "prepares the target only inside the initial reference-anchor route",
      () => {
        expect(core).toMatch(
          /useKieCampaignProvider\s*&&\s*kieArtisticReference\s*&&\s*isReferenceAnchor/,
        )
      },
    )

    it(
      "uses centralized terminal and frame cleanup",
      () => {
        expect(core).toContain(
          "purgeMiravaKieTemporaryAssetsForFrame(",
        )
        expect(core).toContain(
          "purgeMiravaKieTemporaryAssetsForCreation(",
        )
        expect(core).toContain(
          "purgeMiravaKieRestorationFaceCrop(",
        )
      },
    )
  },
)
