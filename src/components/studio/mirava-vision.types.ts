export type MiravaVisionMode = "face" | "pose" | "quality"

export type MiravaVisionIssue =
  | "loading"
  | "no-face"
  | "multiple-faces"
  | "no-pose"
  | "multiple-poses"
  | "move-closer"
  | "move-back"
  | "center"
  | "turn-left"
  | "turn-right"
  | "face-camera"
  | "tilt"
  | "expression-not-neutral"
  | "smile-required"
  | "eyes-closed"
  | "red-eye"
  | "body-in-frame"
  | "body-front"
  | "body-angle"
  | "dark"
  | "bright"
  | "uneven-light"
  | "backlit"
  | "blurry"
  | "hold-still"
  | "ready"
  | "unavailable"

export type MiravaVisionStep =
  | "front"
  | "left"
  | "right"
  | "smile"
  | "hair"
  | "body-front"
  | "body-angle"
  | "traits"

export type MiravaVisionResult = {
  kind: "result"
  requestId: number
  issue: MiravaVisionIssue
  issues: MiravaVisionIssue[]
  ready: boolean
  centerX: number | null
  centerY: number | null
  boxWidth: number | null
  boxHeight: number | null
  yaw: number | null
  roll: number | null
  luminance: number | null
  backgroundLuminance: number | null
  backgroundP90: number | null
  backgroundHighlightRatio: number | null
  faceMedianLuminance: number | null
  backlightDifference: number | null
  lightDifference: number | null
  shadowRatio: number | null
  highlightRatio: number | null
  sharpness: number | null
  smileScore: number | null
  eyeBlinkLeft: number | null
  eyeBlinkRight: number | null
  redEyeLeft: number | null
  redEyeRight: number | null
  redEyeScore: number | null
  diagnostic?: string | null
}

export type MiravaVisionWorkerResponse =
  | { kind: "ready"; mode: MiravaVisionMode }
  | { kind: "error"; message: string }
  | MiravaVisionResult

