export type MiravaBacklightMetrics = {
  luminance: number
  faceMedianLuminance: number
  backgroundHighlightRatio: number
  backlightDifference: number
}

export const MIRAVA_BACKLIGHT_MIN_BACKGROUND_HIGHLIGHT_RATIO =
  0.12

export const MIRAVA_BACKLIGHT_MIN_DIFFERENCE =
  85

export const MIRAVA_BACKLIGHT_MAX_FACE_LUMINANCE =
  108

export const MIRAVA_BACKLIGHT_MAX_FACE_MEDIAN =
  105

export function isMiravaBacklit(
  metrics: MiravaBacklightMetrics,
): boolean {
  /*
   * A bright wall, white cyclorama or window area is not
   * sufficient to classify an identity photo as backlit.
   *
   * Backlight becomes destructive only when the background
   * strongly dominates AND the measured face itself is
   * genuinely underexposed.
   *
   * Requiring both face measurements avoids penalising
   * readable faces simply because their background P90 is
   * high.
   */
  const faceActuallyUnderexposed =
    metrics.luminance <
      MIRAVA_BACKLIGHT_MAX_FACE_LUMINANCE &&
    metrics.faceMedianLuminance <
      MIRAVA_BACKLIGHT_MAX_FACE_MEDIAN

  const backgroundStronglyDominates =
    metrics.backgroundHighlightRatio >
      MIRAVA_BACKLIGHT_MIN_BACKGROUND_HIGHLIGHT_RATIO &&
    metrics.backlightDifference >
      MIRAVA_BACKLIGHT_MIN_DIFFERENCE

  return (
    faceActuallyUnderexposed &&
    backgroundStronglyDominates
  )
}


export const MIRAVA_RED_EYE_THRESHOLD = 0.3

export function isMiravaRedEye(
  score: number | null | undefined,
): boolean {
  return (
    score !== null &&
    score !== undefined &&
    score >= MIRAVA_RED_EYE_THRESHOLD
  )
}
