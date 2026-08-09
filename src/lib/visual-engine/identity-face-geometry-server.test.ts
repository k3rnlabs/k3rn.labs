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

const profileRoute =
  readFileSync(
    "src/app/api/visual-engine/identity-profile/route.ts",
    "utf8",
  )

const assetRoute =
  readFileSync(
    "src/app/api/visual-engine/identity-profile/assets/[id]/route.ts",
    "utf8",
  )

describe(
  "MIRAVA server face geometry",
  () => {
    it(
      "treats browser geometry as untrusted input",
      () => {
        expect(
          profileRoute,
        ).toContain(
          "faceGeometry?: unknown",
        )

        expect(
          assetRoute,
        ).toContain(
          "faceGeometry?: unknown",
        )
      },
    )

    it(
      "binds facial geometry to face-capable identity views",
      () => {
        const start =
          core.indexOf(
            "const MIRAVA_FACE_GEOMETRY_VIEW_KEYS",
          )

        const end =
          core.indexOf(
            "function normalizeMiravaIdentityAssets",
            start,
          )

        const contract =
          core.slice(
            start,
            end,
          )

        expect(contract).toContain(
          '"front"',
        )

        expect(contract).toContain(
          '"angle"',
        )

        expect(contract).toContain(
          '"profile_right"',
        )

        expect(contract).toContain(
          '"smile"',
        )

        expect(contract).not.toContain(
          '"body"',
        )

        expect(contract).not.toContain(
          '"tattoos"',
        )

        expect(contract).toContain(
          "normalizeMiravaIdentityFaceGeometryForView",
        )

        expect(contract).toContain(
          ".has(viewKey)",
        )
      },
    )

    it(
      "uses the durable asset view when replacing one identity photo",
      () => {
        expect(core).toContain(
          "const assetViewKey",
        )

        expect(core).toContain(
          "asset.viewKey",
        )

        expect(core).toContain(
          "args.upload.faceGeometry,\n        assetViewKey,",
        )
      },
    )

    it(
      "validates geometry before durable persistence",
      () => {
        expect(core).toContain(
          "normalizeMiravaIdentityFaceGeometry",
        )

        expect(core).toContain(
          "parseMiravaIdentityFaceGeometry",
        )
      },
    )

    it(
      "persists geometry on full replacement and append",
      () => {
        expect(core).toContain(
          "faceGeometry:\n            file.faceGeometry",
        )

        expect(core).toContain(
          "faceGeometry:\n              file.faceGeometry",
        )
      },
    )

    it(
      "validates and replaces geometry with an individual identity photo",
      () => {
        expect(core).toContain(
          "const nextFaceGeometry",
        )

        expect(core).toContain(
          "faceGeometry:\n              nextFaceGeometry",
        )
      },
    )

    it(
      "does not expose face geometry through the public profile response",
      () => {
        const start =
          core.indexOf(
            "export async function getIdentityProfilePublic",
          )

        const end =
          core.indexOf(
            "export async function replaceIdentityProfile",
            start,
          )

        const publicProfile =
          core.slice(
            start,
            end,
          )

        expect(
          publicProfile,
        ).not.toContain(
          "faceGeometry",
        )
      },
    )
  },
)
