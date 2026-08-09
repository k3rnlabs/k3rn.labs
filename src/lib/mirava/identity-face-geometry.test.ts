import {
  describe,
  expect,
  it,
} from "vitest"

import {
  parseMiravaIdentityFaceGeometry,
  resolveMiravaIdentityFaceCrop,
} from "./identity-face-geometry"

describe(
  "MIRAVA identity face geometry",
  () => {
    it(
      "accepts a valid normalized MediaPipe face box",
      () => {
        expect(
          parseMiravaIdentityFaceGeometry({
            version: 1,
            centerX: 0.5,
            centerY: 0.38,
            boxWidth: 0.28,
            boxHeight: 0.34,
          }),
        ).toEqual({
          version: 1,
          centerX: 0.5,
          centerY: 0.38,
          boxWidth: 0.28,
          boxHeight: 0.34,
        })
      },
    )

    it(
      "rejects a face box escaping the source frame",
      () => {
        expect(
          parseMiravaIdentityFaceGeometry({
            version: 1,
            centerX: 0.02,
            centerY: 0.4,
            boxWidth: 0.2,
            boxHeight: 0.3,
          }),
        ).toBeNull()
      },
    )

    it(
      "rejects zero-size geometry",
      () => {
        expect(
          parseMiravaIdentityFaceGeometry({
            version: 1,
            centerX: 0.5,
            centerY: 0.5,
            boxWidth: 0,
            boxHeight: 0,
          }),
        ).toBeNull()
      },
    )

    it(
      "rejects non-normalized coordinates",
      () => {
        expect(
          parseMiravaIdentityFaceGeometry({
            version: 1,
            centerX: 1.2,
            centerY: 0.5,
            boxWidth: 0.2,
            boxHeight: 0.3,
          }),
        ).toBeNull()
      },
    )

    it(
      "rejects malformed or unsupported payloads",
      () => {
        expect(
          parseMiravaIdentityFaceGeometry(
            null,
          ),
        ).toBeNull()

        expect(
          parseMiravaIdentityFaceGeometry({
            version: 2,
            centerX: 0.5,
            centerY: 0.5,
            boxWidth: 0.2,
            boxHeight: 0.3,
          }),
        ).toBeNull()
      },
    )

    it(
      "derives the crop from the face dimensions rather than image percentages",
      () => {
        expect(
          resolveMiravaIdentityFaceCrop({
            geometry: {
              version: 1,
              centerX: 0.5,
              centerY: 0.4,
              boxWidth: 0.2,
              boxHeight: 0.2,
            },
            imageWidth: 1000,
            imageHeight: 1500,
          }),
        ).toEqual({
          left: 300,
          top: 270,
          width: 400,
          height: 630,
        })
      },
    )

    it(
      "shifts an expanded face crop inside the image at the edges",
      () => {
        const crop =
          resolveMiravaIdentityFaceCrop({
            geometry: {
              version: 1,
              centerX: 0.12,
              centerY: 0.12,
              boxWidth: 0.2,
              boxHeight: 0.2,
            },
            imageWidth: 1000,
            imageHeight: 1500,
          })

        expect(crop).not.toBeNull()
        expect(crop?.left).toBe(0)
        expect(crop?.top).toBe(0)
      },
    )

    it(
      "rejects invalid source dimensions",
      () => {
        expect(
          resolveMiravaIdentityFaceCrop({
            geometry: {
              version: 1,
              centerX: 0.5,
              centerY: 0.5,
              boxWidth: 0.2,
              boxHeight: 0.3,
            },
            imageWidth: 0,
            imageHeight: 1500,
          }),
        ).toBeNull()
      },
    )
  },
)
