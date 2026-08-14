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

function requiredFaceSelection():
  string {
  const start =
    core.indexOf(
      "function selectMiravaKieRequiredIdentityFaceInputs(",
    )

  const end =
    core.indexOf(
      "function selectMiravaKieIdentityCropAssets(",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "KIE FACE_ID selection boundary not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

function kieProviderFaceBlock():
  string {
  const start =
    core.indexOf(
      "const executeKieCall =",
    )

  const end =
    core.indexOf(
      "const kieNonIdentityReferenceBudget =",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "KIE FACE_ID provider boundary not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA KIE-only V6 FACE_ID boundary",
  () => {
    it(
      "selects exactly the required FACE_ID views through durable geometry",
      () => {
        const block =
          kieProviderFaceBlock()

        expect(block).toContain(
          "getMiravaKieIdentityFaceInputs(",
        )

        expect(block).toContain(
          "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS",
        )

        expect(block).toContain(
          "selectMiravaKieRequiredIdentityFaceInputs(",
        )

        expect(block).toContain(
          '"IDENTITY_REQUIRED"',
        )
      },
    )

    it(
      "creates deterministic FACE_ID crops before sending references to KIE",
      () => {
        const block =
          kieProviderFaceBlock()

        expect(block).toContain(
          "createMiravaKieIdentityCrop(",
        )

        expect(block).toContain(
          "createMiravaKieSignedInputUrl(",
        )

        expect(block).toContain(
          "`identity-face-${asset.id}.jpg`",
        )

        expect(block).not.toContain(
          "await downloadAsset(asset)",
        )
      },
    )

    it(
      "shares the deterministic MediaPipe crop implementation with KIE",
      () => {
        expect(core).toContain(
          "async function createMiravaIdentityFaceCropBuffer(",
        )

        expect(core).toContain(
          "resolveMiravaIdentityFaceCrop({",
        )

        expect(core).toMatch(
          /async function createMiravaKieIdentityCrop[\s\S]*?createMiravaIdentityFaceCropBuffer\(/,
        )
      },
    )

    it(
      "selects front angle and profile-right independently from DB storage order",
      () => {
        const block =
          requiredFaceSelection()

        expect(block).toContain(
          "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS",
        )

        expect(block).toContain(
          "requiredViewKey",
        )

        expect(block).toContain(
          "asset.viewKey ===",
        )

        expect(block).not.toContain(
          "assets.slice(",
        )
      },
    )

    it(
      "does not reintroduce body or tattoos as FACE_ID authorities",
      () => {
        const start =
          core.indexOf(
            "const MIRAVA_KIE_FACE_IDENTITY_VIEW_KEYS",
          )

        const end =
          core.indexOf(
            "type MiravaKieIdentityFaceInput",
            start,
          )

        expect(start).toBeGreaterThan(
          -1,
        )

        expect(end).toBeGreaterThan(
          start,
        )

        const authority =
          core.slice(
            start,
            end,
          )

        expect(authority).toContain(
          '"front"',
        )

        expect(authority).toContain(
          '"angle"',
        )

        expect(authority).toContain(
          '"profile_right"',
        )

        expect(authority).not.toContain(
          '"body"',
        )

        expect(authority).not.toContain(
          '"tattoos"',
        )
      },
    )

    it(
      "contains no direct OpenAI image provider boundary",
      () => {
        expect(core).not.toContain(
          "const executeCall = async",
        )

        expect(core).not.toContain(
          "api.openai.com",
        )

        expect(core).not.toContain(
          "OPENAI_API_KEY",
        )
      },
    )
  },
)
