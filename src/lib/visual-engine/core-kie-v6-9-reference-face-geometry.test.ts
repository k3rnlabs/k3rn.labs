import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const analyzer =
  readFileSync(
    "src/components/studio/mirava-import-analyzer.ts",
    "utf8",
  )

const studio =
  readFileSync(
    "src/components/studio/visual-engine-studio.tsx",
    "utf8",
  )

const route =
  readFileSync(
    "src/app/api/visual-engine/creations/[id]/assets/route.ts",
    "utf8",
  )

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
  "MIRAVA V6.9 reference face geometry",
  () => {
    it(
      "uses browser MediaPipe geometry without requiring identity-photo readiness",
      () => {
        const start =
          analyzer.indexOf(
            "export async function analyzeMiravaReferenceFaceGeometry",
          )

        const end =
          analyzer.indexOf(
            "export async function analyzeMiravaIdentityPhoto",
            start + 1,
          )

        const helper =
          analyzer.slice(
            start,
            end,
          )

        /*
         * Artistic references now use their own detector
         * calibration rather than Profil identité analysis.
         */
        expect(helper).toContain(
          "createImportAnalyzer",
        )

        expect(helper).toContain(
          '"reference-face"',
        )

        expect(helper).toContain(
          "parseMiravaIdentityFaceGeometry",
        )

        expect(helper).not.toContain(
          "analyzeMiravaIdentityPhoto(",
        )

        expect(helper).toContain(
          '"front"',
        )

        expect(helper).toContain(
          "parseMiravaIdentityFaceGeometry",
        )

        /*
         * Documentation may mention result.ready.
         * The reference helper must simply never gate
         * geometry on identity-photo readiness.
         */
        expect(helper).not.toMatch(
          /if\s*\([^)]*result\.ready/,
        )

        expect(helper).not.toMatch(
          /result\.ready\s*\?/,
        )

        expect(helper).not.toMatch(
          /result\.ready\s*&&/,
        )
      },
    )

    it(
      "sends optional reference geometry through both reference upload flows",
      () => {
        expect(
          studio.match(
            /form\.set\(\s*"referenceFaceGeometry"/g,
          ),
        ).toHaveLength(2)
      },
    )

    it(
      "parses the multipart field at the server boundary",
      () => {
        expect(route).toContain(
          'form.get(\n        "referenceFaceGeometry"',
        )

        expect(route).toContain(
          "JSON.parse(",
        )

        expect(route).toContain(
          "referenceFaceGeometry,",
        )
      },
    )

    it(
      "validates untrusted geometry before persistence",
      () => {
        const start =
          core.indexOf(
            "export async function uploadStudioAsset",
          )

        const end =
          core.indexOf(
            "export async function getStudioAssets",
            start,
          )

        const upload =
          core.slice(
            start,
            end,
          )

        expect(upload).toContain(
          "parseMiravaIdentityFaceGeometry",
        )

        expect(upload).toContain(
          "referenceFaceGeometry,",
        )

        expect(upload).toContain(
          'args.kind !== "REFERENCE"',
        )
      },
    )

    it(
      "stores reference geometry explicitly rather than in generic metadata",
      () => {
        const start =
          schema.indexOf(
            "model StudioAsset {",
          )

        const end =
          schema.indexOf(
            "model StudioConsent {",
            start,
          )

        const asset =
          schema.slice(
            start,
            end,
          )

        expect(asset).toContain(
          "referenceFaceGeometry Json?",
        )

        expect(asset).not.toContain(
          "metadata",
        )
      },
    )
  },
)
