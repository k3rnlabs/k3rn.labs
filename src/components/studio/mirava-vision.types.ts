export type MiravaVisionMode = "face" | "pose"

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
  | "body-in-frame"
  | "body-front"
  | "body-angle"
  | "dark"
  | "bright"
  | "uneven-light"
  | "blurry"
  | "hold-still"
  | "ready"
  | "unavailable"

export type MiravaVisionStep =
  | "front"
  | "left"
  | "right"
  | "hair"
  | "body-front"
  | "body-angle"
  | "traits"

export type MiravaVisionResult = {
  kind: "result"
  requestId: number
  issue: MiravaVisionIssue
  ready: boolean
  centerX: number | null
  centerY: number | null
  yaw: number | null
  roll: number | null
  luminance: number | null
  sharpness: number | null
}

export type MiravaVisionWorkerResponse =
  | { kind: "ready"; mode: MiravaVisionMode }
  | { kind: "error"; message: string }
  | MiravaVisionResult

