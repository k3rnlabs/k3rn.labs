import sharp from "sharp"

export type MiravaDetectedFaceBox = {
  left: number
  top: number
  width: number
  height: number
}

export type MiravaIdentityRestorationCrop = {
  left: number
  top: number
  width: number
  height: number
}

export function resolveMiravaDetectedFaceRestorationCrop({
  face,
  imageWidth,
  imageHeight,
}: {
  face: MiravaDetectedFaceBox
  imageWidth: number
  imageHeight: number
}): MiravaIdentityRestorationCrop | null {
  const coordinates = [
    face.left,
    face.top,
    face.width,
    face.height,
  ]

  if (
    !Number.isInteger(imageWidth) ||
    !Number.isInteger(imageHeight) ||
    imageWidth < 128 ||
    imageHeight < 128 ||
    coordinates.some(
      (value) =>
        !Number.isFinite(value) ||
        value < 0,
    ) ||
    face.width < 8 ||
    face.height < 8
  ) {
    return null
  }

  const visibleLeft =
    Math.min(imageWidth, face.left)
  const visibleTop =
    Math.min(imageHeight, face.top)
  const visibleRight =
    Math.min(
      imageWidth,
      face.left + face.width,
    )
  const visibleBottom =
    Math.min(
      imageHeight,
      face.top + face.height,
    )

  if (
    visibleRight - visibleLeft < 8 ||
    visibleBottom - visibleTop < 8
  ) {
    return null
  }

  const maximumSize =
    Math.min(
      imageWidth,
      imageHeight,
    )
  const desiredSize =
    Math.max(
      128,
      face.width * 2.25,
      face.height * 2.15,
    )
  const size =
    Math.max(
      2,
      Math.min(
        maximumSize,
        Math.round(desiredSize),
      ),
    )

  const centerX =
    visibleLeft +
    (visibleRight - visibleLeft) / 2
  const centerY =
    visibleTop +
    (visibleBottom - visibleTop) / 2 -
    face.height * 0.12

  const left =
    Math.max(
      0,
      Math.min(
        imageWidth - size,
        Math.round(
          centerX - size / 2,
        ),
      ),
    )
  const top =
    Math.max(
      0,
      Math.min(
        imageHeight - size,
        Math.round(
          centerY - size / 2,
        ),
      ),
    )

  return {
    left,
    top,
    width: size,
    height: size,
  }
}

function featherMask(
  width: number,
  height: number,
): Buffer {
  const feather =
    Math.max(
      4,
      Math.min(
        24,
        Math.round(
          Math.min(width, height) * 0.06,
        ),
      ),
    )
  const mask =
    Buffer.alloc(
      width * height,
    )

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance =
        Math.min(
          x,
          y,
          width - 1 - x,
          height - 1 - y,
        )
      mask[y * width + x] =
        Math.round(
          255 *
          Math.min(
            1,
            distance / feather,
          ),
        )
    }
  }

  return mask
}

export async function compositeMiravaIdentityRestoration({
  passA,
  restoredCrop,
  crop,
}: {
  passA: Buffer
  restoredCrop: Buffer
  crop: MiravaIdentityRestorationCrop
}): Promise<Buffer> {
  const restorationMetadata =
    await sharp(restoredCrop)
      .metadata()

  if (
    !restorationMetadata.width ||
    !restorationMetadata.height ||
    Math.abs(
      restorationMetadata.width /
        restorationMetadata.height -
      crop.width /
        crop.height,
    ) > 0.02
  ) {
    throw new Error(
      "MIRAVA identity restoration returned an incompatible aspect ratio.",
    )
  }

  const normalizedRestoration =
    await sharp(restoredCrop)
      .resize(
        crop.width,
        crop.height,
        {
          fit: "fill",
        },
      )
      .removeAlpha()
      .joinChannel(
        featherMask(
          crop.width,
          crop.height,
        ),
        {
          raw: {
            width: crop.width,
            height: crop.height,
            channels: 1,
          },
        },
      )
      .png()
      .toBuffer()

  return sharp(passA)
    .composite([
      {
        input: normalizedRestoration,
        left: crop.left,
        top: crop.top,
        blend: "over",
      },
    ])
    .png()
    .toBuffer()
}
