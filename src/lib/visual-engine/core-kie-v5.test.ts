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

describe(
  "MIRAVA recovered V6 Kie architecture",
  () => {
    it(
      "contains no legacy V5 provider state or full-frame restoration state",
      () => {
        expect(core).not.toContain(
          "MIRAVA_KIE_V5_",
        )
        expect(core).not.toContain(
          '"identity-restoration"',
        )
        expect(core).not.toContain(
          "MIRAVA_KIE_V5_PASS_B",
        )
      },
    )

    it(
      "uses the V6 durable Pass-A state",
      () => {
        expect(core).toContain(
          "MIRAVA_KIE_V6_PASS_A_READY_STATE",
        )
        expect(core).toContain(
          '"v6-pass-a-ready"',
        )
        expect(core).toContain(
          "storeMiravaKieIntermediateAsset(",
        )
      },
    )

    it(
      "keeps FACE_ID private and cropped at the Kie boundary",
      () => {
        expect(core).toContain(
          "createMiravaKieIdentityCrop(",
        )
        expect(core).toContain(
          "createMiravaKieSignedInputUrl(",
        )
        expect(core).toContain(
          "getMiravaKieIdentityFaceInputs(",
        )
      },
    )

    it(
      "keeps Session Builder references and BODY_ID in Pass A",
      () => {
        expect(core).toContain(
          "sessionProviderInputs",
        )
        expect(core).toMatch(
          /role:\s*reference\.role/,
        )
        expect(core).toMatch(
          /bodyIdentity:\s*bodyIdentityPrompt/,
        )
      },
    )

    it(
      "centralizes retry-safe temporary cleanup",
      () => {
        expect(core).toContain(
          "purgeMiravaKieTemporaryAssetsForFrame(",
        )
        expect(core).toContain(
          "purgeMiravaKieTemporaryAssetsForCreation(",
        )
      },
    )
  },
)
