/// <reference lib="webworker" />

import type {
  MiravaVisionIssue,
  MiravaVisionMode,
  MiravaVisionResult,
  MiravaVisionStep,
  MiravaVisionWorkerResponse,
} from "./mirava-vision.types"

type VisionModule = typeof import("@mediapipe/tasks-vision")
type FaceLandmarker = import("@mediapipe/tasks-vision").FaceLandmarker
type PoseLandmarker = import("@mediapipe/tasks-vision").PoseLandmarker
type NormalizedLandmark = import("@mediapipe/tasks-vision").NormalizedLandmark

type InitMessage = { kind: "init"; mode: MiravaVisionMode; origin: string }
type AnalyzeMessage = { kind: "analyze"; requestId: number; step: MiravaVisionStep; timestamp: number; frame: ImageBitmap }
type CloseMessage = { kind: "close" }
type WorkerMessage = InitMessage | AnalyzeMessage | CloseMessage

const scope = self as unknown as DedicatedWorkerGlobalScope
let vision: VisionModule | null = null
let faceLandmarker: FaceLandmarker | null = null
let poseLandmarker: PoseLandmarker | null = null
let allowedOrigin = ""
let currentMode: MiravaVisionMode | null = null

function sameOriginUrl(input: RequestInfo | URL): URL {
  const value = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input)
  const url = new URL(value, allowedOrigin)
  if (url.origin !== allowedOrigin) throw new Error("MIRAVA_EXTERNAL_VISION_REQUEST_BLOCKED")
  return url
}

const nativeFetch = globalThis.fetch.bind(globalThis)
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => nativeFetch(sameOriginUrl(input), init)) as typeof fetch

function closeTasks() {
  faceLandmarker?.close()
  poseLandmarker?.close()
  faceLandmarker = null
  poseLandmarker = null
  currentMode = null
}

async function createFaceLandmarker(delegate: "GPU" | "CPU") {
  if (!vision) vision = await import("@mediapipe/tasks-vision")
  // The worker itself is an ES module, so MediaPipe must use its module-aware
  // WASM loader. The classic loader does not expose ModuleFactory to a module
  // worker and makes identity validation fail before any photo is analysed.
  const files = await vision.FilesetResolver.forVisionTasks("/visual-engine/vision/wasm", true)
  return vision.FaceLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: "/visual-engine/vision/models/face_landmarker.task",
      delegate,
    },
    runningMode: "VIDEO",
    numFaces: 2,
    minFaceDetectionConfidence: 0.62,
    minFacePresenceConfidence: 0.62,
    minTrackingConfidence: 0.58,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  })
}

async function createPoseLandmarker(delegate: "GPU" | "CPU") {
  if (!vision) vision = await import("@mediapipe/tasks-vision")
  const files = await vision.FilesetResolver.forVisionTasks("/visual-engine/vision/wasm", true)
  return vision.PoseLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: "/visual-engine/vision/models/pose_landmarker_lite.task",
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 2,
    minPoseDetectionConfidence: 0.58,
    minPosePresenceConfidence: 0.58,
    minTrackingConfidence: 0.55,
    outputSegmentationMasks: false,
  })
}

async function initialise(mode: MiravaVisionMode, origin: string) {
  allowedOrigin = origin
  closeTasks()
  try {
    if (mode === "face") faceLandmarker = await createFaceLandmarker("GPU")
    else poseLandmarker = await createPoseLandmarker("GPU")
  } catch {
    closeTasks()
    if (mode === "face") faceLandmarker = await createFaceLandmarker("CPU")
    else poseLandmarker = await createPoseLandmarker("CPU")
  }
  currentMode = mode
  scope.postMessage({ kind: "ready", mode } satisfies MiravaVisionWorkerResponse)
}

function bounds(points: NormalizedLandmark[]) {
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
}

function imageQuality(frame: ImageBitmap, box: ReturnType<typeof bounds>) {
  if (typeof OffscreenCanvas === "undefined") return { luminance: 128, sharpness: 20, lightDifference: 0 }
  const width = 192
  const height = Math.max(144, Math.round(width * frame.height / frame.width))
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return { luminance: 128, sharpness: 20, lightDifference: 0 }
  context.drawImage(frame, 0, 0, width, height)
  const left = Math.max(0, Math.floor((box.minX - 0.04) * width))
  const top = Math.max(0, Math.floor((box.minY - 0.04) * height))
  const right = Math.min(width, Math.ceil((box.maxX + 0.04) * width))
  const bottom = Math.min(height, Math.ceil((box.maxY + 0.04) * height))
  const regionWidth = Math.max(2, right - left)
  const regionHeight = Math.max(2, bottom - top)
  const pixels = context.getImageData(left, top, regionWidth, regionHeight).data
  let total = 0
  let leftTotal = 0
  let rightTotal = 0
  let leftCount = 0
  let rightCount = 0
  let gradients = 0
  let gradientCount = 0
  const previousRow = new Float32Array(regionWidth)
  for (let y = 0; y < regionHeight; y += 1) {
    let previous = 0
    for (let x = 0; x < regionWidth; x += 1) {
      const index = (y * regionWidth + x) * 4
      const value = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]
      total += value
      if (x < regionWidth / 2) { leftTotal += value; leftCount += 1 } else { rightTotal += value; rightCount += 1 }
      if (x > 0) { gradients += Math.abs(value - previous); gradientCount += 1 }
      if (y > 0) { gradients += Math.abs(value - previousRow[x]); gradientCount += 1 }
      previous = value
      previousRow[x] = value
    }
  }
  return {
    luminance: total / Math.max(1, regionWidth * regionHeight),
    sharpness: gradients / Math.max(1, gradientCount),
    lightDifference: Math.abs(leftTotal / Math.max(1, leftCount) - rightTotal / Math.max(1, rightCount)),
  }
}

function faceIssue(step: MiravaVisionStep, points: NormalizedLandmark[], quality: ReturnType<typeof imageQuality>): { issue: MiravaVisionIssue; yaw: number; roll: number } {
  const box = bounds(points)
  const leftEye = points[33]
  const rightEye = points[263]
  const nose = points[1]
  const eyeMidX = (leftEye.x + rightEye.x) / 2
  const eyeDistance = Math.max(0.001, Math.abs(rightEye.x - leftEye.x))
  const yaw = (nose.x - eyeMidX) / eyeDistance
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI

  if (box.width < 0.12) return { issue: "move-closer", yaw, roll }
  if (box.width > 0.90) return { issue: "move-back", yaw, roll }
  if (Math.abs(box.centerX - 0.5) > 0.28 || Math.abs(box.centerY - 0.46) > 0.30) return { issue: "center", yaw, roll }
  if (Math.abs(roll) > 25) return { issue: "tilt", yaw, roll }
  if ((step === "front" || step === "hair") && Math.abs(yaw) > 0.32) return { issue: "face-camera", yaw, roll }
  if (step === "left" && yaw < 0.05) return { issue: "turn-left", yaw, roll }
  if (step === "right" && yaw > -0.05) return { issue: "turn-right", yaw, roll }
  if (quality.luminance < 25) return { issue: "dark", yaw, roll }
  if (quality.luminance > 245) return { issue: "bright", yaw, roll }
  if (quality.lightDifference > 80) return { issue: "uneven-light", yaw, roll }
  if (quality.sharpness < 2.5) return { issue: "blurry", yaw, roll }
  return { issue: "ready", yaw, roll }
}

function analyzeFace(message: AnalyzeMessage): MiravaVisionResult {
  if (!faceLandmarker) throw new Error("MIRAVA_FACE_MODEL_NOT_READY")
  const result = faceLandmarker.detectForVideo(message.frame, message.timestamp)
  if (!result.faceLandmarks.length) return emptyResult(message.requestId, "no-face")
  if (result.faceLandmarks.length > 1) return emptyResult(message.requestId, "multiple-faces")
  const points = result.faceLandmarks[0]
  const box = bounds(points)
  const quality = imageQuality(message.frame, box)
  const evaluated = faceIssue(message.step, points, quality)
  return {
    kind: "result",
    requestId: message.requestId,
    issue: evaluated.issue,
    ready: evaluated.issue === "ready",
    centerX: box.centerX,
    centerY: box.centerY,
    yaw: evaluated.yaw,
    roll: evaluated.roll,
    luminance: quality.luminance,
    sharpness: quality.sharpness,
  }
}

function visible(point: NormalizedLandmark | undefined) {
  return Boolean(point && (point.visibility === undefined || point.visibility > 0.55))
}

function analyzePose(message: AnalyzeMessage): MiravaVisionResult {
  if (!poseLandmarker) throw new Error("MIRAVA_POSE_MODEL_NOT_READY")
  const result = poseLandmarker.detectForVideo(message.frame, message.timestamp)
  if (!result.landmarks.length) return emptyResult(message.requestId, "no-pose")
  if (result.landmarks.length > 1) return emptyResult(message.requestId, "multiple-poses")
  const points = result.landmarks[0]
  const required = [0, 11, 12, 23, 24, 25, 26, 27, 28]
  if (!required.every((index) => visible(points[index]))) return emptyResult(message.requestId, "body-in-frame")
  const selected = required.map((index) => points[index])
  const box = bounds(selected)
  if (box.height < 0.6) return { ...emptyResult(message.requestId, "move-closer"), centerX: box.centerX, centerY: box.centerY }
  if (box.height > 0.96 || box.minY < 0.015 || box.maxY > 0.985) return { ...emptyResult(message.requestId, "move-back"), centerX: box.centerX, centerY: box.centerY }
  if (Math.abs(box.centerX - 0.5) > 0.15) return { ...emptyResult(message.requestId, "center"), centerX: box.centerX, centerY: box.centerY }
  const world = result.worldLandmarks[0]
  const shoulderDepth = world ? Math.abs((world[11]?.z ?? 0) - (world[12]?.z ?? 0)) : 0
  if (message.step === "body-front" && shoulderDepth > 0.12) return { ...emptyResult(message.requestId, "body-front"), centerX: box.centerX, centerY: box.centerY }
  if (message.step === "body-angle" && shoulderDepth < 0.055) return { ...emptyResult(message.requestId, "body-angle"), centerX: box.centerX, centerY: box.centerY }
  return { ...emptyResult(message.requestId, "ready"), ready: true, centerX: box.centerX, centerY: box.centerY }
}

function emptyResult(requestId: number, issue: MiravaVisionIssue): MiravaVisionResult {
  return { kind: "result", requestId, issue, ready: false, centerX: null, centerY: null, yaw: null, roll: null, luminance: null, sharpness: null }
}

scope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data
  if (message.kind === "close") {
    closeTasks()
    scope.close()
    return
  }
  if (message.kind === "init") {
    void initialise(message.mode, message.origin).catch((error: unknown) => {
      scope.postMessage({ kind: "error", message: error instanceof Error ? error.message : "MIRAVA_VISION_INIT_FAILED" } satisfies MiravaVisionWorkerResponse)
    })
    return
  }
  if (message.kind !== "analyze" || currentMode === null) {
    message.frame?.close()
    return
  }
  try {
    const result = currentMode === "face" ? analyzeFace(message) : analyzePose(message)
    scope.postMessage(result satisfies MiravaVisionWorkerResponse)
  } catch (error) {
    scope.postMessage({ kind: "error", message: error instanceof Error ? error.message : "MIRAVA_VISION_FAILED" } satisfies MiravaVisionWorkerResponse)
  } finally {
    message.frame.close()
  }
}

export {}
