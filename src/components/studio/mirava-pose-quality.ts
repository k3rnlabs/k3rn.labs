export const MIRAVA_MIN_BODY_FRAME_HEIGHT = 0.5
export const MIRAVA_MAX_BODY_FRAME_HEIGHT = 0.97

export function isMiravaBodyTooFar(boxHeight: number) {
  return boxHeight < MIRAVA_MIN_BODY_FRAME_HEIGHT
}

export function isMiravaBodyTooClose(boxHeight: number) {
  return boxHeight > MIRAVA_MAX_BODY_FRAME_HEIGHT
}
