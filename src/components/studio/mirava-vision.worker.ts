/// <reference lib="webworker" />

import type {
  MiravaVisionIssue,
  MiravaVisionMode,
  MiravaVisionResult,
  MiravaVisionStep,
  MiravaVisionWorkerResponse,
} from "./mirava-vision.types"
import {
  isMiravaBacklit,
} from "./mirava-vision-quality"
import {
  isMiravaBodyTooClose,
  isMiravaBodyTooFar,
} from "./mirava-pose-quality"

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

async function initialise(
  mode: MiravaVisionMode,
  origin: string,
) {
  allowedOrigin = origin
  closeTasks()

  if (mode === "quality") {
    currentMode = mode
    scope.postMessage({
      kind: "ready",
      mode,
    } satisfies MiravaVisionWorkerResponse)
    return
  }

  try {
    if (mode === "face") {
      faceLandmarker = await createFaceLandmarker("GPU")
    } else {
      poseLandmarker = await createPoseLandmarker("GPU")
    }
  } catch {
    closeTasks()

    if (mode === "face") {
      faceLandmarker = await createFaceLandmarker("CPU")
    } else {
      poseLandmarker = await createPoseLandmarker("CPU")
    }
  }

  currentMode = mode

  scope.postMessage({
    kind: "ready",
    mode,
  } satisfies MiravaVisionWorkerResponse)
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

function percentile(
  histogram: Uint32Array,
  total: number,
  ratio: number,
) {
  if (total <= 0) return 0

  const target = total * ratio
  let cumulative = 0

  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value]
    if (cumulative >= target) return value
  }

  return 255
}

function imageQuality(
  frame: ImageBitmap,
  box: ReturnType<typeof bounds>,
) {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("MIRAVA_OFFSCREEN_CANVAS_UNAVAILABLE")
  }

  const width = 256
  const height = Math.max(
    160,
    Math.round(width * frame.height / frame.width),
  )

  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  })

  if (!context) {
    throw new Error("MIRAVA_VISION_CANVAS_UNAVAILABLE")
  }

  context.drawImage(frame, 0, 0, width, height)

  const faceLeft = Math.max(0, Math.floor(box.minX * width))
  const faceTop = Math.max(0, Math.floor(box.minY * height))
  const faceRight = Math.min(width, Math.ceil(box.maxX * width))
  const faceBottom = Math.min(height, Math.ceil(box.maxY * height))

  const faceWidth = Math.max(2, faceRight - faceLeft)
  const faceHeight = Math.max(2, faceBottom - faceTop)

  const environmentPadding = 0.22

  const environmentLeft = Math.max(
    0,
    Math.floor((box.minX - environmentPadding) * width),
  )
  const environmentTop = Math.max(
    0,
    Math.floor((box.minY - environmentPadding) * height),
  )
  const environmentRight = Math.min(
    width,
    Math.ceil((box.maxX + environmentPadding) * width),
  )
  const environmentBottom = Math.min(
    height,
    Math.ceil((box.maxY + environmentPadding) * height),
  )

  const image = context.getImageData(
    environmentLeft,
    environmentTop,
    Math.max(2, environmentRight - environmentLeft),
    Math.max(2, environmentBottom - environmentTop),
  )

  const regionWidth = image.width
  const regionHeight = image.height
  const data = image.data

  const faceHistogram = new Uint32Array(256)
  const backgroundHistogram = new Uint32Array(256)

  let faceTotal = 0
  let faceCount = 0
  let backgroundTotal = 0
  let backgroundCount = 0
  let brightBackgroundCount = 0

  let leftTotal = 0
  let rightTotal = 0
  let leftCount = 0
  let rightCount = 0

  let shadowPixels = 0
  let highlightPixels = 0
  let gradients = 0
  let gradientCount = 0

  const previousRow = new Float32Array(regionWidth)

  for (let y = 0; y < regionHeight; y += 1) {
    let previous = 0

    for (let x = 0; x < regionWidth; x += 1) {
      const absoluteX = environmentLeft + x
      const absoluteY = environmentTop + y
      const index = (y * regionWidth + x) * 4

      const luminance =
        0.2126 * data[index] +
        0.7152 * data[index + 1] +
        0.0722 * data[index + 2]

      const rounded = Math.max(
        0,
        Math.min(255, Math.round(luminance)),
      )

      const normalizedX =
        (absoluteX - faceLeft) / faceWidth

      const normalizedY =
        (absoluteY - faceTop) / faceHeight

      // Ellipse interne : évite que les coins du cadre facial,
      // les rideaux et la fenêtre soient comptés comme peau.
      const ellipseX = (normalizedX - 0.5) / 0.46
      const ellipseY = (normalizedY - 0.54) / 0.52
      const insideFace = ellipseX ** 2 + ellipseY ** 2 <= 1

      if (insideFace) {
        faceHistogram[rounded] += 1
        faceTotal += luminance
        faceCount += 1

        if (absoluteX < (faceLeft + faceRight) / 2) {
          leftTotal += luminance
          leftCount += 1
        } else {
          rightTotal += luminance
          rightCount += 1
        }

        if (luminance < 48) shadowPixels += 1
        if (luminance > 235) highlightPixels += 1

        if (x > 0) {
          gradients += Math.abs(luminance - previous)
          gradientCount += 1
        }

        if (y > 0) {
          gradients += Math.abs(
            luminance - previousRow[x],
          )
          gradientCount += 1
        }
      } else {
        backgroundHistogram[rounded] += 1
        backgroundTotal += luminance
        backgroundCount += 1

        if (luminance > 200) {
          brightBackgroundCount += 1
        }
      }

      previous = luminance
      previousRow[x] = luminance
    }
  }

  const luminance =
    faceTotal / Math.max(1, faceCount)

  const faceMedianLuminance = percentile(
    faceHistogram,
    faceCount,
    0.5,
  )

  const backgroundLuminance =
    backgroundTotal / Math.max(1, backgroundCount)

  const backgroundP90 = percentile(
    backgroundHistogram,
    backgroundCount,
    0.9,
  )

  return {
    luminance,
    faceMedianLuminance,
    backgroundLuminance,
    backgroundP90,
    backgroundHighlightRatio:
      brightBackgroundCount / Math.max(1, backgroundCount),
    backlightDifference:
      backgroundP90 - faceMedianLuminance,
    lightDifference: Math.abs(
      leftTotal / Math.max(1, leftCount) -
      rightTotal / Math.max(1, rightCount),
    ),
    shadowRatio:
      shadowPixels / Math.max(1, faceCount),
    highlightRatio:
      highlightPixels / Math.max(1, faceCount),
    sharpness:
      gradients / Math.max(1, gradientCount),
  }
}



type RedEyeMeasurement = {
  left: number | null
  right: number | null
  score: number | null
}

function measureRedEye(
  frame: ImageBitmap,
  points: NormalizedLandmark[],
): RedEyeMeasurement {
  const unavailable: RedEyeMeasurement = {
    left: null,
    right: null,
    score: null,
  }

  if (
    points.length < 478 ||
    typeof OffscreenCanvas === "undefined"
  ) {
    return unavailable
  }

  const width = 768
  const height = Math.max(
    480,
    Math.round(width * frame.height / frame.width),
  )

  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  })

  if (!context) return unavailable

  context.drawImage(frame, 0, 0, width, height)

  const scoreIris = (
    centerIndex: number,
    boundaryIndices: number[],
  ): number | null => {
    const center = points[centerIndex]
    const boundary = boundaryIndices
      .map((index) => points[index])
      .filter(Boolean)

    if (!center || boundary.length !== 4) {
      return null
    }

    const centerX = center.x * width
    const centerY = center.y * height

    const irisRadiusX = Math.max(
      ...boundary.map((point) =>
        Math.abs(point.x * width - centerX),
      ),
    )

    const irisRadiusY = Math.max(
      ...boundary.map((point) =>
        Math.abs(point.y * height - centerY),
      ),
    )

    if (
      !Number.isFinite(irisRadiusX) ||
      !Number.isFinite(irisRadiusY) ||
      irisRadiusX < 1 ||
      irisRadiusY < 1
    ) {
      return null
    }

    // Sample only the inner central area of the iris/pupil.
    const sampleRadiusX = Math.max(
      1.25,
      irisRadiusX * 0.48,
    )
    const sampleRadiusY = Math.max(
      1.25,
      irisRadiusY * 0.48,
    )

    const left = Math.max(
      0,
      Math.floor(centerX - sampleRadiusX),
    )
    const top = Math.max(
      0,
      Math.floor(centerY - sampleRadiusY),
    )
    const right = Math.min(
      width,
      Math.ceil(centerX + sampleRadiusX),
    )
    const bottom = Math.min(
      height,
      Math.ceil(centerY + sampleRadiusY),
    )

    const image = context.getImageData(
      left,
      top,
      Math.max(1, right - left),
      Math.max(1, bottom - top),
    )

    let sampledPixels = 0
    let redPixels = 0

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const normalizedX =
          (x + 0.5 - image.width / 2) /
          Math.max(1, image.width / 2)

        const normalizedY =
          (y + 0.5 - image.height / 2) /
          Math.max(1, image.height / 2)

        if (
          normalizedX ** 2 +
            normalizedY ** 2 >
          1
        ) {
          continue
        }

        const index = (y * image.width + x) * 4
        const red = image.data[index]
        const green = image.data[index + 1]
        const blue = image.data[index + 2]
        const alpha = image.data[index + 3]

        if (alpha < 128) continue

        const luminance =
          0.2126 * red +
          0.7152 * green +
          0.0722 * blue

        if (luminance < 15) continue

        sampledPixels += 1

        const strongestOther = Math.max(green, blue)
        const averageOther = (green + blue) / 2
        const redDominance = red - strongestOther
        const redRatio =
          red / Math.max(1, averageOther)

        if (
          red >= 45 &&
          redDominance >= 18 &&
          redRatio >= 1.22
        ) {
          redPixels += 1
        }
      }
    }

    if (sampledPixels < 6) return null

    return redPixels / sampledPixels
  }

  // MediaPipe anatomical iris indices:
  // right iris 468-472, left iris 473-477.
  const right = scoreIris(
    468,
    [469, 470, 471, 472],
  )

  const left = scoreIris(
    473,
    [474, 475, 476, 477],
  )

  // Bilateral diagnostic strength. It is not a verdict.
  const score =
    left !== null && right !== null
      ? Math.min(left, right)
      : null

  return {
    left,
    right,
    score,
  }
}


type FaceExpressionMetrics = {
  smileScore: number | null
  eyeBlinkLeft: number | null
  eyeBlinkRight: number | null
}

function faceIssues(
  step: MiravaVisionStep,
  points: NormalizedLandmark[],
  quality: ReturnType<typeof imageQuality>,
  expression: FaceExpressionMetrics,
): {
  issues: MiravaVisionIssue[]
  yaw: number
  roll: number
} {
  const box = bounds(points)
  const leftEye = points[33]
  const rightEye = points[263]
  const nose = points[1]

  const eyeMidX = (leftEye.x + rightEye.x) / 2
  const eyeDistance = Math.max(
    0.001,
    Math.abs(rightEye.x - leftEye.x),
  )

  const yaw = (nose.x - eyeMidX) / eyeDistance
  const roll =
    Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x,
    ) *
    180 /
    Math.PI

  const issues: MiravaVisionIssue[] = []
  const add = (issue: MiravaVisionIssue) => {
    if (!issues.includes(issue)) issues.push(issue)
  }

  if (box.width < 0.12) add("move-closer")
  if (box.width > 0.9) add("move-back")

  if (
    Math.abs(box.centerX - 0.5) > 0.28 ||
    Math.abs(box.centerY - 0.46) > 0.3
  ) {
    add("center")
  }

  if (Math.abs(roll) > 25) add("tilt")

  if (
    (step === "front" ||
      step === "smile" ||
      step === "hair") &&
    Math.abs(yaw) > 0.32
  ) {
    add("face-camera")
  }

  // L'exemple "profil gauche" présente le nez vers la gauche
  // de l'image : le yaw attendu est donc négatif.
  if (step === "left" && yaw > -0.08) {
    add("turn-left")
  }

  if (step === "right" && yaw < 0.08) {
    add("turn-right")
  }

  if (
    quality.luminance < 82 ||
    quality.shadowRatio > 0.42
  ) {
    add("dark")
  }

  if (
    quality.luminance > 220 ||
    quality.highlightRatio > 0.28
  ) {
    add("bright")
  }

  if (isMiravaBacklit(quality)) {
    add("backlit")
  }

  if (quality.lightDifference > 38) {
    add("uneven-light")
  }

  if (quality.sharpness < 2.5) {
    add("blurry")
  }

  const leftEyeClosed =
    expression.eyeBlinkLeft !== null &&
    expression.eyeBlinkLeft > 0.68

  const rightEyeClosed =
    expression.eyeBlinkRight !== null &&
    expression.eyeBlinkRight > 0.68

  if (
    step === "front" &&
    (leftEyeClosed || rightEyeClosed)
  ) {
    add("eyes-closed")
  }

  // Mesure conservée uniquement pour le diagnostic.
  // Le verdict reste désactivé jusqu’à validation bilatérale
  // sur les centres réels des deux iris.

  if (
    step === "front" &&
    expression.smileScore !== null &&
    expression.smileScore > 0.58
  ) {
    add("expression-not-neutral")
  }

  if (
    step === "smile" &&
    (
      expression.smileScore === null ||
      expression.smileScore < 0.35
    )
  ) {
    add("smile-required")
  }

  return { issues, yaw, roll }
}

function analyzeFace(
  message: AnalyzeMessage,
): MiravaVisionResult {
  if (!faceLandmarker) {
    throw new Error("MIRAVA_FACE_MODEL_NOT_READY")
  }

  const result = faceLandmarker.detectForVideo(
    message.frame,
    message.timestamp,
  )

  if (!result.faceLandmarks.length) {
    return emptyResult(message.requestId, "no-face")
  }

  if (result.faceLandmarks.length > 1) {
    return emptyResult(message.requestId, "multiple-faces")
  }

  const points = result.faceLandmarks[0]
  const box = bounds(points)
  const quality = imageQuality(message.frame, box)

  const categories =
    result.faceBlendshapes[0]?.categories ?? []

  const blendshape = (name: string) =>
    categories.find(
      (category) => category.categoryName === name,
    )?.score ?? null

  const smileLeft = blendshape("mouthSmileLeft")
  const smileRight = blendshape("mouthSmileRight")

  const smileScore =
    smileLeft !== null && smileRight !== null
      ? (smileLeft + smileRight) / 2
      : null

  const eyeBlinkLeft = blendshape("eyeBlinkLeft")
  const eyeBlinkRight = blendshape("eyeBlinkRight")
  const redEyeMeasurement = measureRedEye(
    message.frame,
    points,
  )

  const evaluated = faceIssues(
    message.step,
    points,
    quality,
    {
      smileScore,
      eyeBlinkLeft,
      eyeBlinkRight,
    },
  )

  return {
    kind: "result",
    requestId: message.requestId,
    issue: evaluated.issues[0] ?? "ready",
    issues: evaluated.issues,
    ready: evaluated.issues.length === 0,
    centerX: box.centerX,
    centerY: box.centerY,
    boxWidth: box.width,
    boxHeight: box.height,
    yaw: evaluated.yaw,
    roll: evaluated.roll,
    luminance: quality.luminance,
    backgroundLuminance: quality.backgroundLuminance,
    backgroundP90: quality.backgroundP90,
    backgroundHighlightRatio: quality.backgroundHighlightRatio,
    faceMedianLuminance: quality.faceMedianLuminance,
    backlightDifference: quality.backlightDifference,
    lightDifference: quality.lightDifference,
    shadowRatio: quality.shadowRatio,
    highlightRatio: quality.highlightRatio,
    sharpness: quality.sharpness,
    smileScore,
    eyeBlinkLeft,
    eyeBlinkRight,
    redEyeLeft: redEyeMeasurement.left,
    redEyeRight: redEyeMeasurement.right,
    redEyeScore: redEyeMeasurement.score,
  }
}

function visible(point: NormalizedLandmark | undefined) {
  return Boolean(point && (point.visibility === undefined || point.visibility > 0.55))
}

function analyzePose(message: AnalyzeMessage): MiravaVisionResult {
  if (!poseLandmarker) throw new Error("MIRAVA_POSE_MODEL_NOT_READY")

  const result = poseLandmarker.detectForVideo(message.frame, message.timestamp)

  if (!result.landmarks.length) {
    return emptyResult(message.requestId, "no-pose")
  }

  if (result.landmarks.length > 1) {
    return emptyResult(message.requestId, "multiple-poses")
  }

  const points = result.landmarks[0]

  // Nez, épaules, bassin, genoux, chevilles et extrémités des pieds.
  // Les points 31/32 évitent de sous-estimer la hauteur de la silhouette.
  const required = [
    0,
    11,
    12,
    23,
    24,
    25,
    26,
    27,
    28,
    31,
    32,
  ]

  if (!required.every((index) => visible(points[index]))) {
    return emptyResult(message.requestId, "body-in-frame")
  }

  const selected = points.filter((point) => visible(point))
  const box = bounds(selected)
  const quality = imageQuality(message.frame, box)

  const poseResult = (
    issue: MiravaVisionIssue,
    ready = false,
  ): MiravaVisionResult => ({
    ...emptyResult(message.requestId, issue),
    ready,
    centerX: box.centerX,
    centerY: box.centerY,
    boxWidth: box.width,
    boxHeight: box.height,
    luminance: quality.luminance,
    backgroundLuminance: quality.backgroundLuminance,
    backgroundP90: quality.backgroundP90,
    backgroundHighlightRatio: quality.backgroundHighlightRatio,
    faceMedianLuminance: quality.faceMedianLuminance,
    backlightDifference: quality.backlightDifference,
    lightDifference: quality.lightDifference,
    shadowRatio: quality.shadowRatio,
    highlightRatio: quality.highlightRatio,
    sharpness: quality.sharpness,
  })

  if (isMiravaBodyTooFar(box.height)) {
    return poseResult("move-closer")
  }

  if (
    isMiravaBodyTooClose(box.height) ||
    box.minY < 0.01 ||
    box.maxY > 0.995
  ) {
    return poseResult("move-back")
  }

  if (Math.abs(box.centerX - 0.5) > 0.15) {
    return poseResult("center")
  }

  if (quality.luminance < 25) return poseResult("dark")
  if (quality.luminance > 245) return poseResult("bright")
  if (quality.lightDifference > 80) return poseResult("uneven-light")
  if (quality.sharpness < 2.5) return poseResult("blurry")

  const world = result.worldLandmarks[0]
  const shoulderDepth = world
    ? Math.abs((world[11]?.z ?? 0) - (world[12]?.z ?? 0))
    : 0

  if (message.step === "body-front" && shoulderDepth > 0.12) {
    return poseResult("body-front")
  }

  if (message.step === "body-angle" && shoulderDepth < 0.055) {
    return poseResult("body-angle")
  }

  return poseResult("ready", true)
}

function analyzeTraits(
  message: AnalyzeMessage,
): MiravaVisionResult {
  const fullFrame = {
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1,
    width: 1,
    height: 1,
    centerX: 0.5,
    centerY: 0.5,
  }

  const quality = imageQuality(message.frame, fullFrame)

  let issue: MiravaVisionIssue = "ready"

  if (quality.luminance < 55) {
    issue = "dark"
  } else if (quality.luminance > 238) {
    issue = "bright"
  } else if (quality.sharpness < 2.8) {
    issue = "blurry"
  }

  return {
    ...emptyResult(message.requestId, issue),
    ready: issue === "ready",
    centerX: 0.5,
    centerY: 0.5,
    boxWidth: 1,
    boxHeight: 1,
    luminance: quality.luminance,
    backgroundLuminance: quality.backgroundLuminance,
    backgroundP90: quality.backgroundP90,
    backgroundHighlightRatio: quality.backgroundHighlightRatio,
    faceMedianLuminance: quality.faceMedianLuminance,
    backlightDifference: quality.backlightDifference,
    lightDifference: quality.lightDifference,
    shadowRatio: quality.shadowRatio,
    highlightRatio: quality.highlightRatio,
    sharpness: quality.sharpness,
  }
}


function emptyResult(requestId: number, issue: MiravaVisionIssue): MiravaVisionResult {
  return {
    kind: "result",
    requestId,
    issue,
    issues: issue === "ready" ? [] : [issue],
    ready: false,
    centerX: null,
    centerY: null,
    boxWidth: null,
    boxHeight: null,
    yaw: null,
    roll: null,
    luminance: null,
    backgroundLuminance: null,
    backgroundP90: null,
    backgroundHighlightRatio: null,
    faceMedianLuminance: null,
    backlightDifference: null,
    lightDifference: null,
    shadowRatio: null,
    highlightRatio: null,
    sharpness: null,
    smileScore: null,
    eyeBlinkLeft: null,
    eyeBlinkRight: null,
    redEyeLeft: null,
    redEyeRight: null,
    redEyeScore: null,
  }
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
    let result: MiravaVisionResult

    if (currentMode === "face") {
      result = analyzeFace(message)
    } else if (currentMode === "pose") {
      result = analyzePose(message)
    } else {
      result = analyzeTraits(message)
    }

    scope.postMessage(
      result satisfies MiravaVisionWorkerResponse,
    )
  } catch (error) {
    scope.postMessage({ kind: "error", message: error instanceof Error ? error.message : "MIRAVA_VISION_FAILED" } satisfies MiravaVisionWorkerResponse)
  } finally {
    message.frame.close()
  }
}

export {}
