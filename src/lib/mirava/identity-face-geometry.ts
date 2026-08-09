export type MiravaIdentityFaceGeometry = {
  version: 1
  centerX: number
  centerY: number
  boxWidth: number
  boxHeight: number
}

function finiteNormalized(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  )
}

export function parseMiravaIdentityFaceGeometry(
  raw: unknown,
): MiravaIdentityFaceGeometry | null {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return null
  }

  const value =
    raw as Record<string, unknown>

  if (value.version !== 1) {
    return null
  }

  if (
    !finiteNormalized(
      value.centerX,
    ) ||
    !finiteNormalized(
      value.centerY,
    ) ||
    !finiteNormalized(
      value.boxWidth,
    ) ||
    !finiteNormalized(
      value.boxHeight,
    )
  ) {
    return null
  }

  if (
    value.boxWidth < 0.03 ||
    value.boxHeight < 0.03
  ) {
    return null
  }

  const left =
    value.centerX -
    value.boxWidth / 2

  const right =
    value.centerX +
    value.boxWidth / 2

  const top =
    value.centerY -
    value.boxHeight / 2

  const bottom =
    value.centerY +
    value.boxHeight / 2

  /*
   * MediaPipe landmarks originate inside the image.
   * Reject geometry that cannot represent a real
   * detected face inside the normalized source frame.
   */
  if (
    left < 0 ||
    top < 0 ||
    right > 1 ||
    bottom > 1
  ) {
    return null
  }

  return {
    version: 1,
    centerX:
      value.centerX,
    centerY:
      value.centerY,
    boxWidth:
      value.boxWidth,
    boxHeight:
      value.boxHeight,
  }
}


export type MiravaIdentityFaceCrop = {
  left: number
  top: number
  width: number
  height: number
}

export function resolveMiravaIdentityFaceCrop({
  geometry,
  imageWidth,
  imageHeight,
}: {
  geometry: unknown
  imageWidth: number
  imageHeight: number
}): MiravaIdentityFaceCrop | null {
  const parsed =
    parseMiravaIdentityFaceGeometry(
      geometry,
    )

  if (
    !parsed ||
    !Number.isInteger(imageWidth) ||
    !Number.isInteger(imageHeight) ||
    imageWidth < 128 ||
    imageHeight < 128
  ) {
    return null
  }

  const faceWidth =
    parsed.boxWidth *
    imageWidth

  const faceHeight =
    parsed.boxHeight *
    imageHeight

  /*
   * FACE_ID framing relative to the detected face,
   * never relative to the full photograph.
   *
   * Horizontal expansion:
   *   face + temples + ears + lateral hair.
   *
   * Vertical expansion:
   *   hair/hairline + full face + jaw +
   *   a limited amount of upper neck.
   *
   * Slight upward bias deliberately gives more
   * room to the hair than to clothing below.
   */
  const cropWidth =
    Math.min(
      imageWidth,
      Math.max(
        128,
        Math.round(
          faceWidth * 2.0,
        ),
      ),
    )

  const cropHeight =
    Math.min(
      imageHeight,
      Math.max(
        128,
        Math.round(
          faceHeight * 2.1,
        ),
      ),
    )

  const centerX =
    parsed.centerX *
    imageWidth

  const centerY =
    parsed.centerY *
      imageHeight -
    faceHeight * 0.05

  /*
   * Shift the crop inside the image instead of
   * shrinking it when the face is near an edge.
   */
  const left =
    Math.max(
      0,
      Math.min(
        imageWidth -
          cropWidth,
        Math.round(
          centerX -
            cropWidth / 2,
        ),
      ),
    )

  const top =
    Math.max(
      0,
      Math.min(
        imageHeight -
          cropHeight,
        Math.round(
          centerY -
            cropHeight / 2,
        ),
      ),
    )

  return {
    left,
    top,
    width:
      cropWidth,
    height:
      cropHeight,
  }
}

/**
 * Resolve the local region that Pass B may edit.
 *
 * Unlike FACE_ID crops, this rectangle is applied to the
 * generated Pass-A frame using normalized geometry detected
 * on the artistic reference.
 *
 * Important:
 * - geometry comes from a real MediaPipe face detection;
 * - dimensions are relative to that detected face, never to
 *   an arbitrary percentage of the whole photograph;
 * - the rectangle is always 2:3 so a Seedream 2:3 result can
 *   later be composited back without aspect distortion;
 * - the region deliberately includes hairline, temples,
 *   ears, jaw and limited upper neck;
 * - generous margins absorb modest structural drift between
 *   the artistic reference and Pass A.
 */
export function resolveMiravaReferenceFaceRestorationCrop({
  geometry,
  imageWidth,
  imageHeight,
}: {
  geometry: unknown
  imageWidth: number
  imageHeight: number
}): MiravaIdentityFaceCrop | null {
  const parsed =
    parseMiravaIdentityFaceGeometry(
      geometry,
    )

  if (
    !parsed ||
    !Number.isInteger(
      imageWidth,
    ) ||
    !Number.isInteger(
      imageHeight,
    ) ||
    imageWidth < 128 ||
    imageHeight < 128
  ) {
    return null
  }

  const faceWidth =
    parsed.boxWidth *
    imageWidth

  const faceHeight =
    parsed.boxHeight *
    imageHeight

  /*
   * Seedream output is 2:3.
   *
   * The target region must therefore also be 2:3.
   * Determine its width from the actual detected face,
   * then derive height from width.
   *
   * 2.4 × face width:
   *   face + temples + ears + lateral hair.
   *
   * 1.9 × face height expressed as required width:
   *   guarantees enough vertical room once the 3/2
   *   target height is derived.
   */
  const maxCropWidth =
    Math.min(
      imageWidth,
      Math.floor(
        imageHeight *
          2 /
          3,
      ),
    )

  if (maxCropWidth < 2) {
    return null
  }

  const minimumWidth =
    Math.min(
      192,
      maxCropWidth,
    )

  const desiredWidth =
    Math.max(
      minimumWidth,
      faceWidth * 2.4,
      faceHeight * 1.9,
    )

  /*
   * Keep width even so height = width * 3 / 2 is an
   * exact integer and the crop remains exactly 2:3.
   */
  let cropWidth =
    Math.min(
      maxCropWidth,
      Math.max(
        minimumWidth,
        Math.round(
          desiredWidth,
        ),
      ),
    )

  if (cropWidth % 2 !== 0) {
    cropWidth -= 1
  }

  if (cropWidth < 2) {
    return null
  }

  const cropHeight =
    cropWidth *
    3 /
    2

  const centerX =
    parsed.centerX *
    imageWidth

  /*
   * Slight upward bias gives the hair/hairline more
   * space than clothing below the neck.
   *
   * This bias is relative to the detected face height,
   * never to the full photograph height.
   */
  const centerY =
    parsed.centerY *
      imageHeight -
    faceHeight * 0.15

  const left =
    Math.max(
      0,
      Math.min(
        imageWidth -
          cropWidth,
        Math.round(
          centerX -
            cropWidth / 2,
        ),
      ),
    )

  const top =
    Math.max(
      0,
      Math.min(
        imageHeight -
          cropHeight,
        Math.round(
          centerY -
            cropHeight / 2,
        ),
      ),
    )

  return {
    left,
    top,
    width:
      cropWidth,
    height:
      cropHeight,
  }
}
