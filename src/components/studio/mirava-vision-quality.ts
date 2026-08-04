export type MiravaBacklightMetrics = {
  luminance: number
  faceMedianLuminance: number
  backgroundHighlightRatio: number
  backlightDifference: number
}

export function isMiravaBacklit(
  metrics: MiravaBacklightMetrics,
): boolean {
  const faceClearlyUnderexposed =
    metrics.luminance < 118 &&
    metrics.faceMedianLuminance < 115

  return (
    metrics.backgroundHighlightRatio > 0.12 &&
    metrics.backlightDifference > 55 &&
    faceClearlyUnderexposed
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
