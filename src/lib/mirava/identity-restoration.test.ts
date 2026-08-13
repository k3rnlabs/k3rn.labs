import sharp from "sharp"
import {
  describe,
  expect,
  it,
} from "vitest"

import {
  compositeMiravaIdentityRestoration,
  resolveMiravaDetectedFaceRestorationCrop,
} from "./identity-restoration"

describe(
  "MIRAVA detected-face restoration",
  () => {
    it(
      "derives a square local crop from the candidate face box",
      () => {
        const crop =
          resolveMiravaDetectedFaceRestorationCrop({
            face: {
              left: 420,
              top: 180,
              width: 130,
              height: 155,
            },
            imageWidth: 1024,
            imageHeight: 1536,
          })

        expect(crop).not.toBeNull()
        expect(crop!.width)
          .toBe(crop!.height)
        expect(crop!.left)
          .toBeGreaterThanOrEqual(0)
        expect(crop!.top)
          .toBeGreaterThanOrEqual(0)
        expect(crop!.left + crop!.width)
          .toBeLessThanOrEqual(1024)
        expect(crop!.top + crop!.height)
          .toBeLessThanOrEqual(1536)
      },
    )

    it(
      "fails closed for an invalid or invisible detector box",
      () => {
        expect(
          resolveMiravaDetectedFaceRestorationCrop({
            face: {
              left: 2000,
              top: 2000,
              width: 100,
              height: 100,
            },
            imageWidth: 1024,
            imageHeight: 1536,
          }),
        ).toBeNull()
      },
    )

    it(
      "preserves every decoded pixel outside the authorized crop",
      async () => {
        const width = 240
        const height = 320
        const crop = {
          left: 70,
          top: 50,
          width: 120,
          height: 120,
        }
        const passA =
          await sharp({
            create: {
              width,
              height,
              channels: 3,
              background: {
                r: 10,
                g: 20,
                b: 30,
              },
            },
          })
            .png()
            .toBuffer()
        const restoration =
          await sharp({
            create: {
              width: 64,
              height: 64,
              channels: 3,
              background: {
                r: 230,
                g: 180,
                b: 140,
              },
            },
          })
            .png()
            .toBuffer()
        const result =
          await compositeMiravaIdentityRestoration({
            passA,
            restoredCrop: restoration,
            crop,
          })
        const before =
          await sharp(passA)
            .raw()
            .toBuffer()
        const after =
          await sharp(result)
            .removeAlpha()
            .raw()
            .toBuffer()

        const beforeOutside: number[] = []
        const afterOutside: number[] = []

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const inside =
              x >= crop.left &&
              x < crop.left + crop.width &&
              y >= crop.top &&
              y < crop.top + crop.height

            if (!inside) {
              const offset =
                (y * width + x) * 3
              beforeOutside.push(
                before[offset],
                before[offset + 1],
                before[offset + 2],
              )
              afterOutside.push(
                after[offset],
                after[offset + 1],
                after[offset + 2],
              )
            }
          }
        }

        expect(afterOutside)
          .toEqual(beforeOutside)

        const centerOffset =
          (
            (
              crop.top +
              Math.floor(crop.height / 2)
            ) * width +
            crop.left +
              Math.floor(crop.width / 2)
          ) * 3

        expect(
          after.subarray(
            centerOffset,
            centerOffset + 3,
          ),
        ).not.toEqual(
          before.subarray(
            centerOffset,
            centerOffset + 3,
          ),
        )
      },
    )

    it(
      "rejects provider output with an incompatible aspect ratio",
      async () => {
        const passA =
          await sharp({
            create: {
              width: 256,
              height: 256,
              channels: 3,
              background: "black",
            },
          })
            .png()
            .toBuffer()
        const invalid =
          await sharp({
            create: {
              width: 200,
              height: 100,
              channels: 3,
              background: "white",
            },
          })
            .png()
            .toBuffer()

        await expect(
          compositeMiravaIdentityRestoration({
            passA,
            restoredCrop:
              invalid,
            crop: {
              left: 64,
              top: 64,
              width: 128,
              height: 128,
            },
          }),
        ).rejects.toThrow(
          "incompatible aspect ratio",
        )
      },
    )
  },
)
