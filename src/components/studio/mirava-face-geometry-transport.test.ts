import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const read = (path: string) =>
  readFileSync(path, "utf8")

describe(
  "MIRAVA FACE_ID geometry transport",
  () => {
    const capture = read(
      "src/components/studio/mirava-identity-capture.tsx",
    )

    const uploader = read(
      "src/lib/mirava/identity-profile-upload.client.ts",
    )

    const studio = read(
      "src/components/studio/visual-engine-studio.tsx",
    )

    const onboarding = read(
      "src/components/studio/mirava-studio-onboarding.tsx",
    )

    it(
      "derives geometry from validated MediaPipe face results",
      () => {
        expect(capture).toContain(
          "identityFaceGeometryFromVisionResult",
        )

        expect(capture).toContain(
          "parseMiravaIdentityFaceGeometry({",
        )

        expect(capture).toContain(
          '"front",',
        )

        expect(capture).toContain(
          '"angle",',
        )

        expect(capture).toContain(
          '"profile_right",',
        )

        expect(capture).toContain(
          '"smile",',
        )
      },
    )

    it(
      "keeps geometry aligned with each uploaded identity file",
      () => {
        expect(capture).toContain(
          "const finalFaceGeometries =",
        )

        expect(uploader).toContain(
          "MIRAVA_IDENTITY_FACE_GEOMETRY_MISMATCH",
        )

        expect(uploader).toContain(
          "faceGeometries?.[index]",
        )

        expect(uploader).toContain(
          "faceGeometry,",
        )
      },
    )

    it(
      "forwards geometry through both Studio capture callbacks",
      () => {
        const occurrences =
          studio.match(
            /faceGeometries/g,
          ) ?? []

        expect(
          occurrences.length,
        ).toBeGreaterThanOrEqual(
          6,
        )

        expect(studio).toContain(
          "change.faceGeometry",
        )
      },
    )

    it(
      "forwards geometry through inline onboarding",
      () => {
        expect(onboarding).toContain(
          "faceGeometries,",
        )
      },
    )

    it(
      "never manufactures FACE_ID geometry from tattoo/detail slots",
      () => {
        expect(capture).toContain(
          '"tattoos" as',
        )

        expect(capture).toContain(
          "faceGeometry:\n            undefined",
        )
      },
    )
  },
)
