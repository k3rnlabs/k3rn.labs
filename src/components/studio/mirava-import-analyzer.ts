import type {
  MiravaVisionIssue,
  MiravaVisionMode,
  MiravaVisionResult,
  MiravaVisionStep,
  MiravaVisionWorkerResponse,
} from "./mirava-vision.types"
import {
  parseMiravaIdentityFaceGeometry,
  type MiravaIdentityFaceGeometry,
} from "@/lib/mirava/identity-face-geometry"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ANALYSIS_EDGE = 1280

/*
 * Reference localisation receives a larger browser frame.
 * Profil identité remains at 1280.
 */
const REFERENCE_FACE_ANALYSIS_EDGE =
  2048

const ANALYSIS_TIMEOUT_MS = 20_000

/*
 * MediaPipe may require more than 20 seconds for the first
 * artistic-reference cold start on some browsers/devices.
 *
 * Profil identité keeps its existing 20-second boundary.
 */
const REFERENCE_FACE_TIMEOUT_MS =
  60_000

type ImportCandidate = {
  file: File
  stepId: MiravaVisionStep
  result: MiravaVisionResult
}

export type MiravaImportRejection = {
  fileName: string
  issue: MiravaVisionIssue | "invalid-file" | "duplicate"
}

export type MiravaImportClassification = {
  accepted: Array<{ file: File; stepId: MiravaVisionStep }>
  rejected: MiravaImportRejection[]
}

type PendingAnalysis = {
  resolve: (result: MiravaVisionResult) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

type ImportAnalyzer = {
  analyze: (file: File, step: MiravaVisionStep) => Promise<MiravaVisionResult>
  close: () => void
}

export function classifyMiravaFaceYaw(yaw: number | null): "front" | "left" | "right" | null {
  if (yaw === null) return null
  if (Math.abs(yaw) <= 0.13) return "front"
  if (yaw <= -0.16 && yaw >= -0.48) return "left"
  if (yaw >= 0.16 && yaw <= 0.48) return "right"
  return null
}

function qualityScore(result: MiravaVisionResult) {
  const sharpness = result.sharpness ?? 0
  const exposurePenalty = Math.abs((result.luminance ?? 140) - 140) * 0.025
  return sharpness - exposurePenalty
}

function fileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function validFile(file: File) {
  return ALLOWED_IMAGE_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_IMAGE_BYTES
}

async function createAnalysisBitmap(
  file: File,
  maxEdge =
    ANALYSIS_EDGE,
) {
  /*
   * Keep MediaPipe coordinates in exactly the same
   * visual pixel coordinate system as the durable
   * identity/reference master.
   *
   * EXIF orientation is applied before analysis.
   */
  const source =
    await createImageBitmap(
      file,
      {
        imageOrientation:
          "from-image",
      } as ImageBitmapOptions,
    )

  const longestEdge =
    Math.max(
      source.width,
      source.height,
    )

  if (longestEdge <= maxEdge) {
    return source
  }

  const scale =
    maxEdge /
    longestEdge

  const canvas =
    document.createElement(
      "canvas",
    )

  canvas.width =
    Math.max(
      1,
      Math.round(
        source.width *
          scale,
      ),
    )

  canvas.height =
    Math.max(
      1,
      Math.round(
        source.height *
          scale,
      ),
    )

  const context =
    canvas.getContext(
      "2d",
    )

  if (!context) {
    source.close()

    throw new Error(
      "MIRAVA_IMPORT_CANVAS_UNAVAILABLE",
    )
  }

  context.drawImage(
    source,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  source.close()

  return createImageBitmap(
    canvas,
  )
}

async function createImportAnalyzer(mode: MiravaVisionMode): Promise<ImportAnalyzer> {
  // The vision worker is emitted as a standalone module. Next's app runtime cannot
  // safely execute its webpack entry inside a browser Worker (it references the
  // page-only `_N_E` runtime), so this path deliberately bypasses that runtime.
  const worker = new Worker("/visual-engine/vision/mirava-vision.worker.js", { type: "module" })
  const pending = new Map<number, PendingAnalysis>()
  let requestId = 0

  const timeoutMs =
    mode === "reference-face"
      ? REFERENCE_FACE_TIMEOUT_MS
      : ANALYSIS_TIMEOUT_MS

  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            "MIRAVA_IMPORT_VISION_TIMEOUT",
          ),
        ),
      timeoutMs,
    )
    worker.onmessage = (event: MessageEvent<MiravaVisionWorkerResponse>) => {
      const message = event.data
      if (message.kind === "ready") {
        clearTimeout(timeout)
        resolve()
        return
      }
      if (message.kind === "error") {
        clearTimeout(timeout)
        const error = new Error(message.message)
        pending.forEach((entry) => { clearTimeout(entry.timeout); entry.reject(error) })
        pending.clear()
        reject(error)
        return
      }
      const entry = pending.get(message.requestId)
      if (!entry) return
      clearTimeout(entry.timeout)
      pending.delete(message.requestId)
      entry.resolve(message)
    }
    worker.onerror = () => {
      clearTimeout(timeout)
      const error = new Error("MIRAVA_IMPORT_VISION_FAILED")
      pending.forEach((entry) => { clearTimeout(entry.timeout); entry.reject(error) })
      pending.clear()
      reject(error)
    }
  })

  worker.postMessage({ kind: "init", mode, origin: window.location.origin })
  try {
    await ready
  } catch (error) {
    worker.terminate()
    throw error
  }

  return {
    analyze: async (file, step) => {
      const frame =
        await createAnalysisBitmap(
          file,
          mode === "reference-face"
            ? REFERENCE_FACE_ANALYSIS_EDGE
            : ANALYSIS_EDGE,
        )
      const currentId = ++requestId
      return new Promise<MiravaVisionResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(currentId)
          reject(new Error("MIRAVA_IMPORT_ANALYSIS_TIMEOUT"))
        }, timeoutMs)
        pending.set(currentId, { resolve, reject, timeout })
        worker.postMessage({ kind: "analyze", requestId: currentId, step, timestamp: performance.now(), frame }, [frame])
      })
    },
    close: () => {
      pending.forEach((entry) => { clearTimeout(entry.timeout); entry.reject(new Error("MIRAVA_IMPORT_ANALYSIS_CANCELLED")) })
      pending.clear()
      worker.postMessage({ kind: "close" })
      worker.terminate()
    },
  }
}

async function evaluateFaceCandidate(analyzer: ImportAnalyzer, file: File): Promise<ImportCandidate | MiravaImportRejection> {
  const initial = await analyzer.analyze(file, "front")
  const stepId = initial.ready ? "front" : classifyMiravaFaceYaw(initial.yaw)
  if (!stepId) return { fileName: file.name, issue: initial.issue }
  if (stepId === "front" && initial.ready) return { file, stepId, result: initial }
  const confirmed = await analyzer.analyze(file, stepId)
  return confirmed.ready ? { file, stepId, result: confirmed } : { fileName: file.name, issue: confirmed.issue }
}

function unavailableVisionResult(
  diagnostic?: string,
): MiravaVisionResult {
  return {
    kind: "result",
    requestId: 0,
    issue: "unavailable",
    issues: ["unavailable"],
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
    diagnostic: diagnostic ?? null,
  }
}

/**
 * Locate the single visible face in an artistic reference.
 *
 * This deliberately does NOT require result.ready.
 * Identity-photo readiness also evaluates frontal pose,
 * expression, lighting and other capture constraints that
 * are irrelevant to an artistic reference.
 *
 * We need only a trustworthy normalized MediaPipe face box.
 */
export async function analyzeMiravaReferenceFaceGeometry(
  file: File,
): Promise<MiravaIdentityFaceGeometry | null> {
  if (!validFile(file)) {
    return null
  }

  let analyzer:
    ImportAnalyzer |
    null =
    null

  try {
    analyzer =
      await createImportAnalyzer(
        "reference-face",
      )

    const result =
      await analyzer.analyze(
        file,
        "front",
      )

    /*
     * result.ready is intentionally irrelevant here.
     *
     * The reference may have:
     * - closed eyes;
     * - strong expression;
     * - head tilt;
     * - non-frontal gaze;
     * - dramatic lighting.
     *
     * We only need exactly one detected face and
     * a trustworthy normalized geometry.
     */
    return parseMiravaIdentityFaceGeometry({
      version: 1,
      centerX:
        result.centerX,
      centerY:
        result.centerY,
      boxWidth:
        result.boxWidth,
      boxHeight:
        result.boxHeight,
    })
  } catch {
    return null
  } finally {
    analyzer?.close()
  }
}

export async function analyzeMiravaIdentityPhoto(
  file: File,
  step: MiravaVisionStep,
): Promise<MiravaVisionResult> {
  if (!validFile(file)) return unavailableVisionResult()

  const mode: MiravaVisionMode =
    step === "traits"
      ? "quality"
      : step.startsWith("body-")
      ? "pose"
      : "face"

  let analyzer: ImportAnalyzer | null = null

  try {
    analyzer = await createImportAnalyzer(mode)
    return await analyzer.analyze(file, step)
  } catch (error) {
    const diagnostic =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error)

    console.error(
      `[MIRAVA Vision] ${mode}/${step} analysis failed`,
      error,
    )

    return unavailableVisionResult(diagnostic)
  } finally {
    analyzer?.close()
  }
}

export async function validateMiravaImportedFileForStep(file: File, step: MiravaVisionStep) {
  if (!validFile(file)) return { valid: false as const, issue: "invalid-file" as const }
  const analyzer = await createImportAnalyzer(step.startsWith("body-") || step === "traits" ? "pose" : "face")
  try {
    const result = await analyzer.analyze(file, step)
    return result.ready ? { valid: true as const } : { valid: false as const, issue: result.issue }
  } finally {
    analyzer.close()
  }
}

export async function classifyMiravaIdentityImports(files: File[]): Promise<MiravaImportClassification> {
  const uniqueFiles: File[] = []
  const rejected: MiravaImportRejection[] = []
  const fingerprints = new Set<string>()
  for (const file of files) {
    if (!validFile(file)) { rejected.push({ fileName: file.name, issue: "invalid-file" }); continue }
    const fingerprint = fileFingerprint(file)
    if (fingerprints.has(fingerprint)) { rejected.push({ fileName: file.name, issue: "duplicate" }); continue }
    fingerprints.add(fingerprint)
    uniqueFiles.push(file)
  }

  const faceAnalyzer = await createImportAnalyzer("face")
  const faceCandidates: ImportCandidate[] = []
  const poseCandidates: File[] = []
  try {
    for (const file of uniqueFiles) {
      const evaluated = await evaluateFaceCandidate(faceAnalyzer, file)
      if ("file" in evaluated) faceCandidates.push(evaluated)
      else if (["move-closer", "no-face"].includes(evaluated.issue)) poseCandidates.push(file)
      else rejected.push(evaluated)
    }
  } finally {
    faceAnalyzer.close()
  }

  const accepted: Array<{ file: File; stepId: MiravaVisionStep }> = []
  const used = new Set<File>()
  for (const stepId of ["front", "left", "right"] as const) {
    const candidate = faceCandidates.filter((item) => item.stepId === stepId).sort((a, b) => qualityScore(b.result) - qualityScore(a.result))[0]
    if (candidate) { accepted.push({ file: candidate.file, stepId }); used.add(candidate.file) }
  }
  const extraFront = faceCandidates.filter((item) => item.stepId === "front" && !used.has(item.file)).sort((a, b) => qualityScore(b.result) - qualityScore(a.result))[0]
  if (extraFront) { accepted.push({ file: extraFront.file, stepId: "hair" }); used.add(extraFront.file) }
  faceCandidates.filter((item) => !used.has(item.file)).forEach((item) => rejected.push({ fileName: item.file.name, issue: "duplicate" }))

  if (poseCandidates.length) {
    const poseAnalyzer = await createImportAnalyzer("pose")
    try {
      for (const file of poseCandidates) {
        if (accepted.some((item) => item.stepId === "body-front") && accepted.some((item) => item.stepId === "body-angle")) {
          rejected.push({ fileName: file.name, issue: "duplicate" })
          continue
        }
        const front = await poseAnalyzer.analyze(file, "body-front")
        if (front.ready && !accepted.some((item) => item.stepId === "body-front")) {
          accepted.push({ file, stepId: "body-front" })
          continue
        }
        if (front.issue === "body-front" && !accepted.some((item) => item.stepId === "body-angle")) {
          const angle = await poseAnalyzer.analyze(file, "body-angle")
          if (angle.ready) { accepted.push({ file, stepId: "body-angle" }); continue }
          rejected.push({ fileName: file.name, issue: angle.issue })
          continue
        }
        rejected.push({ fileName: file.name, issue: front.issue })
      }
    } finally {
      poseAnalyzer.close()
    }
  }

  return { accepted: accepted.slice(0, 6), rejected }
}
