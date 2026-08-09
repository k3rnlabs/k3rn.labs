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
  "MIRAVA localized identity restoration wiring",
  () => {
    it(
      "uses the face box detected in the generated candidate",
      () => {
        expect(core).toContain(
          "gateResult.candidateFace.box",
        )
        expect(core).toContain(
          "resolveMiravaDetectedFaceRestorationCrop({",
        )
      },
    )

    it(
      "submits only the extracted square target and canonical identity views",
      () => {
        expect(core).toContain(
          ".extract(crop)",
        )
        expect(core).toContain(
          'aspectRatio:\n                "1:1"',
        )
        expect(core).toContain(
          "buildMiravaKieIdentityRestorationPrompt({",
        )
        expect(core).toContain(
          "resolveMiravaIdentityFaceCrop({",
        )
      },
    )

    it(
      "composites locally and re-runs the identity gate before acceptance",
      () => {
        expect(core).toContain(
          "compositeMiravaIdentityRestoration({",
        )
        expect(core).toContain(
          'await evaluateCandidate(\n            restoredCandidate,\n            "pass-b"',
        )
        expect(core).toContain(
          "MIRAVA_FACE_RESTORATION_READY_STATE",
        )
      },
    )

    it(
      "keeps temporary candidate state resumable and centrally cleaned",
      () => {
        expect(core).toContain(
          "MIRAVA_FACE_RESTORATION_SUBMITTED_STATE",
        )
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
