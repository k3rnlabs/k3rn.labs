import {
  describe,
  expect,
  it,
} from "vitest"

import {
  resolveMiravaReferenceFaceRestorationCrop,
} from "./identity-face-geometry"

describe(
  "MIRAVA V6.9 local face restoration crop",
  () => {
    it(
      "builds a face-relative exact 2:3 region",
      () => {
        const crop =
          resolveMiravaReferenceFaceRestorationCrop({
            geometry: {
              version: 1,
              centerX: 0.5,
              centerY: 0.28,
              boxWidth: 0.12,
              boxHeight: 0.14,
            },
            imageWidth:
              1024,
            imageHeight:
              1536,
          })

        expect(crop).not.toBeNull()

        expect(
          crop!.height,
        ).toBe(
          crop!.width *
            3 /
            2,
        )

        expect(
          crop!.width % 2,
        ).toBe(0)

        expect(
          crop!.left,
        ).toBeGreaterThanOrEqual(
          0,
        )

        expect(
          crop!.top,
        ).toBeGreaterThanOrEqual(
          0,
        )

        expect(
          crop!.left +
            crop!.width,
        ).toBeLessThanOrEqual(
          1024,
        )

        expect(
          crop!.top +
            crop!.height,
        ).toBeLessThanOrEqual(
          1536,
        )
      },
    )

    it(
      "shifts the region inside the frame when a face is near an edge",
      () => {
        const crop =
          resolveMiravaReferenceFaceRestorationCrop({
            geometry: {
              version: 1,
              centerX: 0.89,
              centerY: 0.16,
              boxWidth: 0.12,
              boxHeight: 0.13,
            },
            imageWidth:
              1024,
            imageHeight:
              1536,
          })

        expect(crop).not.toBeNull()

        expect(
          crop!.left +
            crop!.width,
        ).toBeLessThanOrEqual(
          1024,
        )

        expect(
          crop!.top,
        ).toBe(0)

        expect(
          crop!.height,
        ).toBe(
          crop!.width *
            3 /
            2,
        )
      },
    )

    it(
      "fails closed when no valid MediaPipe geometry exists",
      () => {
        expect(
          resolveMiravaReferenceFaceRestorationCrop({
            geometry:
              null,
            imageWidth:
              1024,
            imageHeight:
              1536,
          }),
        ).toBeNull()

        expect(
          resolveMiravaReferenceFaceRestorationCrop({
            geometry: {
              version: 1,
              centerX: 0.5,
              centerY: 0.5,
              boxWidth: 2,
              boxHeight: 0.1,
            },
            imageWidth:
              1024,
            imageHeight:
              1536,
          }),
        ).toBeNull()
      },
    )
  },
)
