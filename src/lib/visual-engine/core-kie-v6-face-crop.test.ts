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

describe(
  "MIRAVA Kie V6 FACE_ID crop",
  () => {
    it(
      "never crops identity from a fixed percentage of the photograph",
      () => {
        expect(core).not.toContain(
          "metadata.height * 0.62",
        )

        expect(core).not.toContain(
          "sharp.strategy.attention",
        )
      },
    )

    it(
      "uses the durable MediaPipe face geometry",
      () => {
        expect(core).toContain(
          "resolveMiravaIdentityFaceCrop",
        )

        expect(core).toMatch(
          /parseMiravaIdentityFaceGeometry\(\s*asset\.faceGeometry/,
        )
      },
    )

    it(
      "limits Kie identity references to face-capable views",
      () => {
        const start =
          core.indexOf(
            "const MIRAVA_KIE_FACE_IDENTITY_VIEW_KEYS",
          )

        const end =
          core.indexOf(
            "async function createMiravaKieIdentityCrop",
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
      },
    )

    it(
      "filters FACE_ID before limiting provider identity references",
      () => {
        const helperStart =
          core.indexOf(
            "function getMiravaKieIdentityFaceInputs(",
          )

        const helperEnd =
          core.indexOf(
            "function selectMiravaKieIdentityCropAssets(",
            helperStart,
          )

        const helper =
          core.slice(
            helperStart,
            helperEnd,
          )

        expect(helperStart).toBeGreaterThan(
          -1,
        )

        expect(helperEnd).toBeGreaterThan(
          helperStart,
        )

        expect(helper).toContain(
          "MIRAVA_KIE_FACE_IDENTITY_VIEW_KEYS",
        )

        expect(helper).toContain(
          "parseMiravaIdentityFaceGeometry(",
        )

        const selectionStart =
          core.indexOf(
            "const identityFaceInputs =",
            helperEnd,
          )

        const selectionEnd =
          core.indexOf(
            "const identityReferences:",
            selectionStart,
          )

        const selection =
          core.slice(
            selectionStart,
            selectionEnd,
          )

        const filterCallIndex =
          selection.indexOf(
            "getMiravaKieIdentityFaceInputs(",
          )

        const limitCallIndex =
          selection.indexOf(
            "selectMiravaKieRequiredIdentityFaceInputs(",
          )

        expect(filterCallIndex).toBeGreaterThan(
          -1,
        )

        expect(limitCallIndex).toBeGreaterThan(
          filterCallIndex,
        )
      },
    )

    it(
      "ignores body and tattoos instead of treating them as FACE_ID",
      () => {
        expect(core).toContain(
          "const identityProfileAssets",
        )

        expect(core).toContain(
          "const selectedIdentityFaceInputs",
        )

        expect(core).toContain(
          "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS",
        )

        expect(core).toContain(
          "!MIRAVA_KIE_FACE_IDENTITY_VIEW_KEYS",
        )
      },
    )

    it(
      "does not send legacy raw identity photos to Kie when geometry is missing",
      () => {
        expect(core).toContain(
          "Votre Profil identité doit être réenregistré afin d’activer la représentation visage haute fidélité.",
        )

        expect(core).toContain(
          '"IDENTITY_REQUIRED"',
        )
      },
    )

    it(
      "selects the three required FACE_ID views independently from storage order",
      () => {
        const helperStart =
          core.indexOf(
            "function selectMiravaKieRequiredIdentityFaceInputs(",
          )

        const helperEnd =
          core.indexOf(
            "function selectMiravaKieIdentityCropAssets(",
            helperStart,
          )

        expect(
          helperStart,
        ).toBeGreaterThan(-1)

        expect(
          helperEnd,
        ).toBeGreaterThan(
          helperStart,
        )

        const helper =
          core.slice(
            helperStart,
            helperEnd,
          )

        expect(helper).toContain(
          "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS",
        )

        expect(helper).toContain(
          "faceInputs.find(",
        )

        expect(helper).toContain(
          "asset.viewKey ===",
        )

        const kieAssetsStart =
          core.indexOf(
            "const kieIdentityAssets =",
          )

        const kieAssetsEnd =
          core.indexOf(
            "const clearKieTaskState",
            kieAssetsStart,
          )

        const kieAssetsBlock =
          core.slice(
            kieAssetsStart,
            kieAssetsEnd,
          )

        expect(
          kieAssetsBlock,
        ).not.toContain(
          "selectMiravaPrimaryIdentityAssets(",
        )

        expect(
          kieAssetsBlock,
        ).toContain(
          "const kieIdentityAssets =",
        )

        expect(
          kieAssetsBlock,
        ).toContain(
          "identityAssets",
        )

        expect(
          kieAssetsBlock,
        ).not.toContain(
          "? identityAssets",
        )

        const selectedStart =
          core.indexOf(
            "const selectedIdentityFaceInputs =",
            kieAssetsEnd,
          )

        const selectedEnd =
          core.indexOf(
            "const identityReferences:",
            selectedStart,
          )

        const selectedBlock =
          core.slice(
            selectedStart,
            selectedEnd,
          )

        expect(
          selectedBlock,
        ).toContain(
          "selectMiravaKieRequiredIdentityFaceInputs(",
        )

        expect(
          selectedBlock,
        ).not.toContain(
          "selectMiravaPrimaryIdentityAssets(",
        )
      },
    )

    it(
      "cleans partial FACE_ID crops when preparation fails",
      () => {
        expect(core).toContain(
          "identityFaceInputs",
        )

        expect(core).toContain(
          "await purgeMiravaKieIdentityCrops(",
        )
      },
    )
  },
)
