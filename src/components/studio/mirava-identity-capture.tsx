"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Images,
  Loader2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { MIRAVA_MIN_IDENTITY_PHOTOS } from "@/lib/mirava/identity-profile"
import type {
  MiravaVisionIssue,
  MiravaVisionMode,
  MiravaVisionResult,
  MiravaVisionStep,
  MiravaVisionWorkerResponse,
} from "./mirava-vision.types"
import {
  classifyMiravaIdentityImports,
  validateMiravaImportedFileForStep,
  type MiravaImportRejection,
} from "./mirava-import-analyzer"

type Locale = "fr" | "es"
type Phase = "intro" | "loading" | "importing" | "capture" | "review" | "summary"

type CaptureStep = {
  id: MiravaVisionStep
  title: Record<Locale, string>
  instruction: Record<Locale, string>
  optional?: boolean
  mode: MiravaVisionMode
}

const steps: CaptureStep[] = [
  {
    id: "front",
    title: { fr: "Face naturelle", es: "Rostro natural" },
    instruction: { fr: "Regardez l’objectif, visage dégagé et expression naturelle.", es: "Mira al objetivo, rostro despejado y expresión natural." },
    mode: "face",
  },
  {
    id: "left",
    title: { fr: "Trois-quarts gauche", es: "Tres cuartos izquierdo" },
    instruction: { fr: "Tournez lentement votre visage vers la flèche.", es: "Gira lentamente el rostro hacia la flecha." },
    mode: "face",
  },
  {
    id: "right",
    title: { fr: "Trois-quarts droit", es: "Tres cuartos derecho" },
    instruction: { fr: "Tournez lentement votre visage vers la flèche.", es: "Gira lentamente el rostro hacia la flecha." },
    mode: "face",
  },
  {
    id: "hair",
    title: { fr: "Cheveux naturels", es: "Cabello natural" },
    instruction: { fr: "Recommandé · Détachez vos cheveux sans couvrir vos yeux.", es: "Recomendado · Suelta tu cabello sin cubrir los ojos." },
    optional: true,
    mode: "face",
  },
  {
    id: "body-front",
    title: { fr: "Silhouette face", es: "Silueta frontal" },
    instruction: { fr: "Optionnel · Posez le téléphone et reculez jusqu’à voir vos pieds.", es: "Opcional · Apoya el teléfono y retrocede hasta ver tus pies." },
    optional: true,
    mode: "pose",
  },
  {
    id: "body-angle",
    title: { fr: "Silhouette trois-quarts", es: "Silueta tres cuartos" },
    instruction: { fr: "Optionnel · Tournez légèrement le corps, posture naturelle.", es: "Opcional · Gira ligeramente el cuerpo, postura natural." },
    optional: true,
    mode: "pose",
  },
]

type CapturedFrame = { stepId: MiravaVisionStep; file: File; preview: string }

const STABLE_CAPTURE_MS = 250

function issueCopy(issue: MiravaVisionIssue, locale: Locale, step: CaptureStep) {
  const copy: Record<MiravaVisionIssue, Record<Locale, string>> = {
    loading: { fr: "Préparation du guide…", es: "Preparando la guía…" },
    "no-face": { fr: "Placez votre visage dans le cercle.", es: "Coloca tu rostro dentro del círculo." },
    "multiple-faces": { fr: "Une seule personne dans le cadre.", es: "Solo una persona en el encuadre." },
    "no-pose": { fr: "Reculez pour apparaître entièrement.", es: "Retrocede para aparecer por completo." },
    "multiple-poses": { fr: "Une seule personne dans le cadre.", es: "Solo una persona en el encuadre." },
    "move-closer": { fr: "Approchez-vous légèrement.", es: "Acércate un poco." },
    "move-back": { fr: "Reculez légèrement.", es: "Aléjate un poco." },
    center: { fr: "Replacez-vous au centre du cercle.", es: "Vuelve al centro del círculo." },
    "turn-left": { fr: "Tournez la tête vers la gauche.", es: "Gira la cabeza hacia la izquierda." },
    "turn-right": { fr: "Tournez la tête vers la droite.", es: "Gira la cabeza hacia la derecha." },
    "face-camera": { fr: "Revenez légèrement vers l’objectif.", es: "Vuelve un poco hacia el objetivo." },
    tilt: { fr: "Gardez la tête bien droite.", es: "Mantén la cabeza recta." },
    "body-in-frame": { fr: "Gardez la tête et les pieds dans le cadre.", es: "Mantén la cabeza y los pies en el encuadre." },
    "body-front": { fr: "Replacez les épaules face à l’objectif.", es: "Coloca los hombros frente al objetivo." },
    "body-angle": { fr: "Tournez légèrement les épaules.", es: "Gira ligeramente los hombros." },
    dark: { fr: "Mettez-vous face à une fenêtre.", es: "Ponte frente a una ventana." },
    bright: { fr: "Éloignez-vous de la lumière directe.", es: "Aléjate de la luz directa." },
    "uneven-light": { fr: "Cherchez une lumière plus homogène.", es: "Busca una luz más uniforme." },
    blurry: { fr: "Stabilisez le téléphone.", es: "Estabiliza el teléfono." },
    "hold-still": { fr: "Parfait, ne bougez plus.", es: "Perfecto, no te muevas." },
    ready: { fr: "Parfait, ne bougez plus.", es: "Perfecto, no te muevas." },
    unavailable: { fr: "Guide automatique indisponible · capture manuelle possible.", es: "Guía automática no disponible · puedes hacer la foto manualmente." },
  }
  if ((step.id === "left" || step.id === "right") && issue === "face-camera") return copy[issue][locale]
  return copy[issue][locale]
}

function importIssueCopy(issue: MiravaImportRejection["issue"], locale: Locale) {
  if (issue === "invalid-file") return locale === "fr" ? "Format non accepté ou fichier supérieur à 10 Mo." : "Formato no admitido o archivo superior a 10 MB."
  if (issue === "duplicate") return locale === "fr" ? "Vue trop proche d’une photo déjà retenue." : "Vista demasiado parecida a una foto ya seleccionada."
  return issueCopy(issue, locale, steps[0])
}

export function MiravaIdentityCapture({
  locale,
  context = "onboarding",
  existingCount = 0,
  onClose,
  onComplete,
}: {
  locale: Locale
  context?: "onboarding" | "replace" | "append"
  existingCount?: number
  onClose: () => void
  onComplete: (files: File[], consent: { ageConfirmed: true; rightsConfirmed: true; retentionAccepted: true }) => Promise<void>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const workerModeRef = useRef<MiravaVisionMode | null>(null)
  const inFlightRef = useRef(false)
  const requestIdRef = useRef(0)
  const lastInferenceRef = useRef(0)
  const stableStartedRef = useRef<number | null>(null)
  const lastMetricsRef = useRef<{ centerX: number | null; centerY: number | null; yaw: number | null } | null>(null)
  const autoCaptureStepRef = useRef<MiravaVisionStep | null>(null)
  const captureRef = useRef<() => Promise<void>>(async () => undefined)
  const framesRef = useRef<CapturedFrame[]>([])
  const pendingFrameRef = useRef<CapturedFrame | null>(null)
  const importOperationRef = useRef(0)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const repairInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>("intro")
  const appendStartStep = context === "append" ? Math.min(existingCount, steps.length - 1) : 0
  const [activeStep, setActiveStep] = useState(appendStartStep)
  const [frames, setFrames] = useState<CapturedFrame[]>([])
  const [pendingFrame, setPendingFrame] = useState<CapturedFrame | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [visionIssue, setVisionIssue] = useState<MiravaVisionIssue>("loading")
  const [stableProgress, setStableProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [importRejected, setImportRejected] = useState<MiravaImportRejection[]>([])
  const [repairStep, setRepairStep] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const currentStep = steps[activeStep]
  const dialogLabel = locale === "fr" ? "Capture guidée de votre Profil identité" : "Captura guiada de tu Perfil de identidad"

  const requiredCount = useMemo(() => frames.filter((frame) => ["front", "left", "right"].includes(frame.stepId)).length, [frames])
  const identityViewsReady = context === "append"
    ? existingCount >= MIRAVA_MIN_IDENTITY_PHOTOS && frames.length > 0
    : requiredCount >= MIRAVA_MIN_IDENTITY_PHOTOS
  const missingRequiredSteps = useMemo(
    () => steps.map((step, index) => ({ step, index })).filter(({ step }) => !step.optional && !frames.some((frame) => frame.stepId === step.id)),
    [frames],
  )
  const firstMissingStep = useMemo(() => {
    const index = steps.findIndex((step, stepIndex) => stepIndex >= appendStartStep && !frames.some((frame) => frame.stepId === step.id))
    return index === -1 ? appendStartStep : index
  }, [appendStartStep, frames])

  useEffect(() => { framesRef.current = frames }, [frames])
  useEffect(() => { pendingFrameRef.current = pendingFrame }, [pendingFrame])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const stopWorker = useCallback(() => {
    workerRef.current?.postMessage({ kind: "close" })
    workerRef.current?.terminate()
    workerRef.current = null
    workerModeRef.current = null
    inFlightRef.current = false
  }, [])

  const handleVisionResult = useCallback((result: MiravaVisionResult) => {
    if (!result.ready) {
      stableStartedRef.current = null
      lastMetricsRef.current = null
      setStableProgress(0)
      setVisionIssue(result.issue)
      autoCaptureStepRef.current = null
      return
    }
    const previous = lastMetricsRef.current
    const stable = !previous || (
      Math.abs((result.centerX ?? 0) - (previous.centerX ?? 0)) < 0.05
      && Math.abs((result.centerY ?? 0) - (previous.centerY ?? 0)) < 0.05
      && Math.abs((result.yaw ?? 0) - (previous.yaw ?? 0)) < 0.08
    )
    lastMetricsRef.current = { centerX: result.centerX, centerY: result.centerY, yaw: result.yaw }
    if (!stable) {
      stableStartedRef.current = null
      setStableProgress(0)
      setVisionIssue("hold-still")
      return
    }
    const now = performance.now()
    if (stableStartedRef.current === null) stableStartedRef.current = now
    const progress = Math.min(1, (now - stableStartedRef.current) / STABLE_CAPTURE_MS)
    setStableProgress(progress)
    setVisionIssue("ready")
  }, [])

  const initialiseWorker = useCallback((mode: MiravaVisionMode) => {
    stopWorker()
    setVisionIssue("loading")
    stableStartedRef.current = null
    setStableProgress(0)
    try {
      const worker = new Worker("/visual-engine/vision/mirava-vision.worker.js", { type: "module" })
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent<MiravaVisionWorkerResponse>) => {
        const message = event.data
        if (message.kind === "ready") {
          workerModeRef.current = message.mode
          setVisionIssue(message.mode === mode ? (mode === "face" ? "no-face" : "no-pose") : "loading")
          return
        }
        if (message.kind === "error") {
          inFlightRef.current = false
          setVisionIssue("unavailable")
          return
        }
        inFlightRef.current = false
        handleVisionResult(message)
      }
      worker.onerror = () => {
        inFlightRef.current = false
        setVisionIssue("unavailable")
      }
      worker.postMessage({ kind: "init", mode, origin: window.location.origin })
    } catch {
      setVisionIssue("unavailable")
    }
  }, [handleVisionResult, stopWorker])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setPhase("loading")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      initialiseWorker(currentStep.mode)
      setPhase("capture")
    } catch {
      stopCamera()
      setCameraError(locale === "fr" ? "MIRAVA n’a pas accès à la caméra. Autorisez-la dans les réglages ou importez vos photos." : "MIRAVA no puede acceder a la cámara. Autorízala en los ajustes o sube tus fotos.")
      setPhase("intro")
    }
  }, [currentStep.mode, initialiseWorker, locale, stopCamera])

  useEffect(() => {
    if (phase !== "capture") return
    if (!streamRef.current) {
      void startCamera()
      return
    }
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      void videoRef.current.play()
    }
    if (workerModeRef.current !== currentStep.mode) initialiseWorker(currentStep.mode)
    autoCaptureStepRef.current = null
    stableStartedRef.current = null
    lastMetricsRef.current = null
    setStableProgress(0)
  }, [activeStep, currentStep.mode, initialiseWorker, phase, startCamera])

  useEffect(() => {
    if (phase !== "capture") return
    let animationFrame = 0
    let cancelled = false
    const analyze = async (now: number) => {
      if (cancelled) return
      animationFrame = window.requestAnimationFrame(analyze)
      const worker = workerRef.current
      const video = videoRef.current
      const canvas = analysisCanvasRef.current
      if (!worker || !video || !canvas || workerModeRef.current !== currentStep.mode || inFlightRef.current || now - lastInferenceRef.current < 140 || video.readyState < 2) return
      lastInferenceRef.current = now
      const width = 480
      const height = Math.max(360, Math.round(width * video.videoHeight / Math.max(1, video.videoWidth)))
      canvas.width = width
      canvas.height = height
      const context2d = canvas.getContext("2d")
      if (!context2d) return
      context2d.drawImage(video, 0, 0, width, height)
      try {
        const frame = await createImageBitmap(canvas)
        if (cancelled || !workerRef.current) { frame.close(); return }
        inFlightRef.current = true
        const requestId = ++requestIdRef.current
        worker.postMessage({ kind: "analyze", requestId, step: currentStep.id, timestamp: performance.now(), frame }, [frame])
      } catch {
        setVisionIssue("unavailable")
      }
    }
    animationFrame = window.requestAnimationFrame(analyze)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
    }
  }, [currentStep.id, currentStep.mode, phase])

  const capture = useCallback(async () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight || phase !== "capture") return
    autoCaptureStepRef.current = currentStep.id
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context2d = canvas.getContext("2d")
    if (!context2d) return
    context2d.translate(canvas.width, 0)
    context2d.scale(-1, 1)
    context2d.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
    if (!blob) return
    const file = new File([blob], `mirava-${currentStep.id}.jpg`, { type: "image/jpeg" })
    const frame = { stepId: currentStep.id, file, preview: URL.createObjectURL(file) }
    setPendingFrame(frame)
    setPhase("review")
    if (typeof navigator.vibrate === "function") navigator.vibrate(35)
  }, [currentStep.id, phase])

  useEffect(() => { captureRef.current = capture }, [capture])

  useEffect(() => {
    if (phase !== "capture" || stableProgress < 1 || autoCaptureStepRef.current === currentStep.id) return
    void captureRef.current()
  }, [currentStep.id, phase, stableProgress])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopCamera()
      else if (phase === "capture") void startCamera()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [phase, startCamera, stopCamera])

  useEffect(() => () => {
    stopCamera()
    stopWorker()
    framesRef.current.forEach((frame) => URL.revokeObjectURL(frame.preview))
    if (pendingFrameRef.current) URL.revokeObjectURL(pendingFrameRef.current.preview)
  }, [stopCamera, stopWorker])

  const keepPhoto = () => {
    if (!pendingFrame) return
    setFrames((current) => {
      const previous = current.find((frame) => frame.stepId === pendingFrame.stepId)
      if (previous) URL.revokeObjectURL(previous.preview)
      return [...current.filter((frame) => frame.stepId !== pendingFrame.stepId), pendingFrame]
    })
    setPendingFrame(null)
    if (activeStep === steps.length - 1) {
      stopCamera()
      setPhase("summary")
      return
    }
    setActiveStep((value) => value + 1)
    setPhase("capture")
  }

  const retake = () => {
    if (pendingFrame) URL.revokeObjectURL(pendingFrame.preview)
    setPendingFrame(null)
    autoCaptureStepRef.current = null
    setPhase("capture")
  }

  const skip = () => {
    if (!currentStep.optional) return
    if (activeStep === steps.length - 1) {
      stopCamera()
      setPhase("summary")
      return
    }
    setActiveStep((value) => value + 1)
  }

  const replaceFrames = useCallback((accepted: Array<{ file: File; stepId: MiravaVisionStep }>) => {
    setFrames((current) => {
      current.forEach((frame) => URL.revokeObjectURL(frame.preview))
      return accepted.map(({ file, stepId }) => ({ file, stepId, preview: URL.createObjectURL(file) }))
    })
  }, [])

  const importLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).slice(0, 6)
    event.target.value = ""
    if (!selected.length) return
    const operation = ++importOperationRef.current
    stopCamera()
    stopWorker()
    setImportError(null)
    setImportRejected([])
    setPhase("importing")
    try {
      if (context === "append") {
        const result = await validateMiravaImportedFileForStep(selected[0], currentStep.id)
        if (operation !== importOperationRef.current) return
        if (!result.valid) {
          setImportRejected([{ fileName: selected[0].name, issue: result.issue }])
          setPhase("summary")
          return
        }
        setFrames((current) => [...current.filter((frame) => frame.stepId !== currentStep.id), { file: selected[0], stepId: currentStep.id, preview: URL.createObjectURL(selected[0]) }])
      } else {
        const result = await classifyMiravaIdentityImports(selected)
        if (operation !== importOperationRef.current) return
        replaceFrames(result.accepted)
        setImportRejected(result.rejected)
      }
      setPhase("summary")
    } catch {
      if (operation !== importOperationRef.current) return
      setImportError(locale === "fr" ? "L’analyse locale n’a pas pu aboutir. Aucune photo n’a été envoyée. Réessayez ou utilisez la caméra guidée." : "El análisis local no ha podido completarse. No se ha enviado ninguna foto. Inténtalo de nuevo o usa la cámara guiada.")
      setPhase("intro")
    }
  }

  const repairFromLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || repairStep === null) return
    const step = steps[repairStep]
    const operation = ++importOperationRef.current
    setPhase("importing")
    setImportError(null)
    try {
      const result = await validateMiravaImportedFileForStep(file, step.id)
      if (operation !== importOperationRef.current) return
      if (!result.valid) {
        setImportRejected((current) => [...current, { fileName: file.name, issue: result.issue }])
        setPhase("summary")
        return
      }
      setFrames((current) => {
        const previous = current.find((frame) => frame.stepId === step.id)
        if (previous) URL.revokeObjectURL(previous.preview)
        return [...current.filter((frame) => frame.stepId !== step.id), { file, stepId: step.id, preview: URL.createObjectURL(file) }]
      })
      setImportRejected((current) => current.filter((item) => item.fileName !== file.name))
      setPhase("summary")
    } catch {
      if (operation !== importOperationRef.current) return
      setImportError(locale === "fr" ? "Cette photo n’a pas pu être vérifiée localement. Elle n’a pas été envoyée." : "Esta foto no ha podido verificarse localmente. No se ha enviado.")
      setPhase("summary")
    }
  }

  const complete = async () => {
    if (!identityViewsReady || !legalAccepted) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const ordered = steps.flatMap((step) => frames.filter((frame) => frame.stepId === step.id)).map((frame) => frame.file)
      await onComplete(ordered, { ageConfirmed: true, rightsConfirmed: true, retentionAccepted: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : (locale === "fr" ? "L’enregistrement a échoué. Veuillez réessayer." : "Error al guardar. Por favor, inténtalo de nuevo."))
    } finally {
      setSubmitting(false)
    }
  }

  const close = useCallback(() => {
    importOperationRef.current += 1
    stopCamera()
    stopWorker()
    onClose()
  }, [onClose, stopCamera, stopWorker])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [close])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const focusableSelector = 'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.hasAttribute("hidden") && element.getClientRects().length > 0)
    const initialFocus = window.setTimeout(() => {
      const target = dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]") ?? getFocusable()[0]
      target?.focus({ preventScroll: true })
    }, 0)
    const retainFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const focusable = getFocusable()
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", retainFocus)
    return () => {
      window.clearTimeout(initialFocus)
      window.removeEventListener("keydown", retainFocus)
    }
  }, [phase])

  if (phase === "importing") {
    return (
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} className="mirava-theme mirava-capture-shell fixed inset-0 z-50 bg-mirava-canvas text-mirava-ink">
        <MiravaGrain />
        <header className="mirava-capture-safe-top flex items-center justify-between px-4">
          <span className="font-jakarta text-xs font-semibold tracking-[.16em]">MIRAVA / ID</span>
          <button onClick={close} aria-label={locale === "fr" ? "Fermer" : "Cerrar"} className="mirava-button mirava-button-secondary h-12 w-12"><X className="h-4 w-4" /></button>
        </header>
        <div role="status" aria-live="polite" className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
          <div className="mirava-import-orbit" aria-hidden="true"><Loader2 className="h-7 w-7 animate-spin" /></div>
          <p className="mirava-label mt-8">{locale === "fr" ? "ANALYSE LOCALE" : "ANÁLISIS LOCAL"}</p>
          <h1 className="mt-4 font-jakarta text-3xl font-semibold tracking-[-.05em]">{locale === "fr" ? "Nous classons vos vues." : "Estamos clasificando tus vistas."}</h1>
          <p className="mirava-copy mt-4 max-w-sm text-sm leading-6">{locale === "fr" ? "Une photo à la fois, sur cet appareil. Rien n’est envoyé avant votre récapitulatif et votre consentement." : "Una foto cada vez, en este dispositivo. No se envía nada antes de tu resumen y consentimiento."}</p>
        </div>
      </div>
    )
  }

  if (phase === "intro" || phase === "loading") {
    return (
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} className="mirava-theme mirava-capture-shell fixed inset-0 z-50 bg-mirava-canvas text-mirava-ink">
        <MiravaGrain />
        <header className="mirava-capture-safe-top flex items-center justify-between px-4">
          <span className="font-jakarta text-xs font-semibold tracking-[.16em]">MIRAVA / ID</span>
          <button onClick={close} className="mirava-button mirava-button-quiet min-h-12 px-3 text-sm">{locale === "fr" ? "Plus tard" : "Más tarde"}</button>
        </header>
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mirava-capture-emblem mx-auto grid h-24 w-24 place-items-center rounded-[var(--mirava-radius)]"><Camera className="h-8 w-8" /></div>
          <p className="mirava-label mt-8 text-center">{context === "onboarding" ? (locale === "fr" ? "VOTRE ONBOARDING" : "TU BIENVENIDA") : (locale === "fr" ? "PROFIL IDENTITÉ" : "PERFIL DE IDENTIDAD")}</p>
          <h1 className="mt-4 text-center font-jakarta text-[2.4rem] font-semibold leading-[1.02] tracking-[-.055em]">
            {locale === "fr" ? "Même vous. Dans chaque univers." : "La misma tú. En cada universo."}
          </h1>
          <p className="mirava-copy mx-auto mt-5 max-w-sm text-center text-sm leading-6">
            {context === "append"
              ? (locale === "fr" ? "Ajoutez une vue à votre profil privé, par caméra guidée ou depuis votre galerie, sans recommencer les photos déjà enregistrées." : "Añade una vista a tu perfil privado, con cámara guiada o desde tu galería, sin repetir las fotos ya guardadas.")
              : (locale === "fr" ? "Trois portraits construisent votre profil privé. Choisissez la caméra guidée ou vos propres photos, puis ajoutez vos cheveux et votre silhouette si vous le souhaitez." : "Tres retratos construyen tu perfil privado. Elige la cámara guiada o tus propias fotos y añade tu cabello y silueta si lo deseas.")}
          </p>
          <div className="mirava-notice mt-7 space-y-3 p-4 text-xs leading-5">
            <p className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />{locale === "fr" ? "L’analyse reste sur cet appareil. Aucune vidéo ni mesure du visage n’est envoyée." : "El análisis permanece en este dispositivo. No se envía ningún vídeo ni medida del rostro."}</p>
            <p className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />{locale === "fr" ? "Seules les photos que vous validez rejoignent votre Profil identité privé." : "Solo las fotos que validas se añaden a tu Perfil de identidad privado."}</p>
          </div>
          {existingCount > 0 && <p className="mirava-muted mt-4 text-center text-xs">{context === "append"
            ? (locale === "fr" ? `${existingCount}/6 photos déjà enregistrées restent intactes.` : `${existingCount}/6 fotos ya guardadas permanecen intactas.`)
            : (locale === "fr" ? `${existingCount} photo${existingCount > 1 ? "s" : ""} actuelle${existingCount > 1 ? "s" : ""} seront remplacées après validation.` : `${existingCount} foto${existingCount > 1 ? "s" : ""} actual${existingCount > 1 ? "es" : ""} se sustituirán tras la validación.`)}</p>}
          {(cameraError || importError) && <p role="alert" className="mirava-alert mt-5 flex gap-3 p-4 text-sm"><CircleAlert className="h-5 w-5 shrink-0" />{cameraError || importError}</p>}
          <button data-dialog-initial-focus onClick={() => void startCamera()} disabled={phase === "loading"} className="mirava-button mirava-button-primary mt-7 min-h-14 w-full gap-2 px-6 text-sm">
            {phase === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            {phase === "loading" ? (locale === "fr" ? "Préparation du guide…" : "Preparando la guía…") : (locale === "fr" ? "Ouvrir la caméra" : "Abrir la cámara")}
          </button>
          <button onClick={() => libraryInputRef.current?.click()} disabled={phase === "loading"} className="mirava-button mirava-button-secondary mt-3 min-h-14 w-full gap-2 px-6 text-sm">
            <ImagePlus className="h-5 w-5" />
            {context === "append"
              ? (locale === "fr" ? "Choisir une photo" : "Elegir una foto")
              : (locale === "fr" ? "Choisir 3 à 6 photos" : "Elegir de 3 a 6 fotos")}
          </button>
          <input ref={libraryInputRef} hidden type="file" tabIndex={-1} aria-hidden="true" multiple={context !== "append"} accept="image/jpeg,image/png,image/webp" onChange={(event) => void importLibrary(event)} />
          <p className="mirava-muted mt-3 text-center text-[11px] leading-4">{locale === "fr" ? "JPEG, PNG ou WebP · 10 Mo maximum par photo" : "JPEG, PNG o WebP · máximo 10 MB por foto"}</p>
        </div>
        <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      </div>
    )
  }

  if (phase === "review" && pendingFrame) {
    return (
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} className="mirava-theme mirava-capture-shell fixed inset-0 z-50 bg-mirava-canvas text-mirava-ink">
        <MiravaGrain />
        <header className="mirava-capture-safe-top flex items-center justify-between px-4">
          <button onClick={retake} className="mirava-button mirava-button-quiet gap-2 px-2 text-sm"><ArrowLeft className="h-4 w-4" />{locale === "fr" ? "Refaire" : "Repetir"}</button>
          <span className="font-jakarta text-xs font-semibold tracking-[.12em]">{activeStep + 1} / {steps.length}</span>
          <button onClick={close} aria-label={locale === "fr" ? "Fermer" : "Cerrar"} className="mirava-button mirava-button-secondary h-12 w-12"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mirava-image-frame relative min-h-0 flex-1 overflow-hidden bg-mirava-canvas-raised"><img src={pendingFrame.preview} alt={currentStep.title[locale]} className="h-full w-full object-cover" /></div>
          <div className="mx-auto w-full max-w-lg pt-5 text-center">
            <p className="font-jakarta text-2xl font-semibold tracking-[-.04em]">{locale === "fr" ? "Cette photo vous convient ?" : "¿Te gusta esta foto?"}</p>
            <p className="mirava-copy mt-2 text-sm">{currentStep.title[locale]}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={retake} className="mirava-button mirava-button-secondary min-h-14 gap-2 text-sm"><RotateCcw className="h-4 w-4" />{locale === "fr" ? "Refaire" : "Repetir"}</button>
              <button onClick={keepPhoto} className="mirava-button mirava-button-primary min-h-14 gap-2 text-sm"><Check className="h-4 w-4" />{locale === "fr" ? "Garder" : "Guardar"}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "summary") {
    return (
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} className="mirava-theme mirava-capture-shell fixed inset-0 z-50 overflow-y-auto bg-mirava-canvas text-mirava-ink">
        <MiravaGrain />
        <header className="mirava-capture-safe-top sticky top-0 z-10 flex items-center justify-between bg-mirava-canvas/90 px-4 backdrop-blur-xl">
          <button onClick={() => { setActiveStep(firstMissingStep); void startCamera() }} className="mirava-button mirava-button-quiet gap-2 px-2 text-sm"><ArrowLeft className="h-4 w-4" />{locale === "fr" ? "Ajouter" : "Añadir"}</button>
          <span className="font-jakarta text-xs font-semibold tracking-[.16em]">MIRAVA / ID</span>
          <button onClick={close} aria-label={locale === "fr" ? "Fermer" : "Cerrar"} className="mirava-button mirava-button-secondary h-12 w-12"><X className="h-4 w-4" /></button>
        </header>
        <div className="mx-auto w-full max-w-lg px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
          <p className="mirava-label">{locale === "fr" ? "VOTRE PROFIL IDENTITÉ" : "TU PERFIL DE IDENTIDAD"}</p>
          <h1 className="mt-3 font-jakarta text-4xl font-semibold tracking-[-.055em]">{locale === "fr" ? "Prête à être vous, partout." : "Lista para ser tú, en todas partes."}</h1>
          <p className="mirava-copy mt-4 text-sm leading-6">{locale === "fr" ? "Vérifiez vos prises avant leur enregistrement privé." : "Revisa tus fotos antes de guardarlas de forma privada."}</p>
          <div className="mt-7 grid grid-cols-3 gap-2">
            {steps.map((step, index) => {
              const frame = frames.find((item) => item.stepId === step.id)
              const alreadyStored = context === "append" && index < existingCount
              return <button key={step.id} disabled={alreadyStored} onClick={() => { setActiveStep(index); void startCamera() }} className="mirava-image-frame relative aspect-[4/5] overflow-hidden bg-mirava-surface-raised text-left disabled:cursor-default" aria-label={alreadyStored ? `${step.title[locale]} · ${locale === "fr" ? "déjà enregistrée" : "ya guardada"}` : frame ? `${step.title[locale]} · ${locale === "fr" ? "remplacer" : "sustituir"}` : `${step.title[locale]} · ${locale === "fr" ? "ajouter" : "añadir"}`}>
                {frame ? <img src={frame.preview} alt="" className="h-full w-full object-cover" /> : <span className="mirava-muted absolute inset-0 grid place-items-center text-xs">{index + 1}</span>}
                {alreadyStored && <span className="absolute inset-0 grid place-items-center bg-mirava-surface-raised/88"><LockKeyhole className="h-5 w-5 text-mirava-accent" /></span>}
                <span className="absolute inset-x-1.5 bottom-1.5 rounded-[var(--mirava-radius)] bg-black/65 px-2 py-1 text-[9px] font-semibold leading-3 text-white backdrop-blur">{step.title[locale]}</span>
              </button>
            })}
          </div>
          {(importRejected.length > 0 || importError) && (
            <div role="alert" className="mirava-alert mt-5 p-4 text-sm">
              <p className="font-semibold">{locale === "fr" ? "Certaines photos sont à remplacer" : "Algunas fotos deben sustituirse"}</p>
              {importError && <p className="mt-2 text-xs leading-5">{importError}</p>}
              {importRejected.slice(-4).map((item, index) => <p key={`${item.fileName}-${index}`} className="mt-2 text-xs leading-5"><span className="font-semibold">{item.fileName}</span> · {importIssueCopy(item.issue, locale)}</p>)}
            </div>
          )}
          {context !== "append" && missingRequiredSteps.length > 0 && (
            <section aria-labelledby="mirava-missing-views" className="mirava-repair-list mt-6">
              <h2 id="mirava-missing-views" className="font-jakarta text-lg font-semibold">{locale === "fr" ? "Compléter les vues essentielles" : "Completar las vistas esenciales"}</h2>
              <p className="mirava-copy mt-1 text-xs leading-5">{locale === "fr" ? "Reprenez uniquement les vues manquantes, sans recommencer le reste." : "Repite solo las vistas que faltan, sin volver a empezar."}</p>
              <div className="mt-4 space-y-3">
                {missingRequiredSteps.map(({ step, index }) => (
                  <div key={step.id} className="mirava-repair-row">
                    <div><p className="text-sm font-semibold">{step.title[locale]}</p><p className="mirava-muted mt-0.5 text-[11px]">{step.instruction[locale]}</p></div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
                      <button onClick={() => { setActiveStep(index); void startCamera() }} className="mirava-button mirava-button-secondary min-h-12 gap-2 px-3 text-xs"><Camera className="h-4 w-4" />{locale === "fr" ? "Caméra" : "Cámara"}</button>
                      <button onClick={() => { setRepairStep(index); window.setTimeout(() => repairInputRef.current?.click(), 0) }} className="mirava-button mirava-button-secondary min-h-12 gap-2 px-3 text-xs"><ImagePlus className="h-4 w-4" />{locale === "fr" ? "Photothèque" : "Galería"}</button>
                    </div>
                  </div>
                ))}
              </div>
              <input ref={repairInputRef} hidden type="file" tabIndex={-1} aria-hidden="true" accept="image/jpeg,image/png,image/webp" onChange={(event) => void repairFromLibrary(event)} />
            </section>
          )}
          <label className="mirava-notice mt-7 flex cursor-pointer gap-3 p-4 text-xs leading-5">
            <input type="checkbox" checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-white" />
            <span>{locale === "fr" ? "Je confirme avoir au moins 18 ans, disposer des droits sur ces photos et accepter leur conservation privée jusqu’à leur suppression depuis mon compte." : "Confirmo que tengo al menos 18 años, dispongo de los derechos sobre estas fotos y acepto su conservación privada hasta que las elimine desde mi cuenta."}</span>
          </label>
          {!identityViewsReady && <p role="alert" className="mirava-alert mt-4 p-4 text-sm">{context === "append" ? (locale === "fr" ? "Ajoutez au moins une nouvelle vue pour continuer." : "Añade al menos una vista nueva para continuar.") : (locale === "fr" ? "Ajoutez les vues de face, 3/4 gauche et 3/4 droit pour continuer." : "Añade las vistas frontal, tres cuartos izquierdo y derecho para continuar.")}</p>}
          {submitError && (
            <div role="alert" className="mirava-alert mt-4 flex gap-3 p-4 text-sm">
              <CircleAlert className="h-5 w-5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <button onClick={() => void complete()} disabled={!identityViewsReady || !legalAccepted || submitting} className="mirava-button mirava-button-primary mt-5 min-h-14 w-full gap-2 px-6 text-sm">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {submitting ? (locale === "fr" ? "Enregistrement privé…" : "Guardando de forma privada…") : context === "append" ? (locale === "fr" ? "Ajouter à mon profil" : "Añadir a mi perfil") : (locale === "fr" ? "Enregistrer mon profil" : "Guardar mi perfil")}
          </button>
        </div>
      </div>
    )
  }

  const instruction = visionIssue === "ready" && stableProgress > 0 ? issueCopy("hold-still", locale, currentStep) : issueCopy(visionIssue, locale, currentStep)

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} className="mirava-theme mirava-capture-shell fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full scale-x-[-1] object-cover object-center max-h-[100dvh]" />
      <canvas ref={analysisCanvasRef} className="hidden" />
      <div className="mirava-camera-shade absolute inset-0" />
      <AppleFaceIdOverlay
        locale={locale}
        mode={currentStep.mode}
        visionIssue={visionIssue}
        stableProgress={stableProgress}
        stepId={currentStep.id}
      />

      <header className="mirava-capture-safe-top absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4">
        <button onClick={close} aria-label={locale === "fr" ? "Fermer" : "Cerrar"} className="mirava-capture-round-control"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-1.5" aria-label={`${activeStep + 1} / ${steps.length}`}>
          {steps.map((step, index) => <span key={step.id} className={cn("h-1.5 rounded-full transition-[width,background-color]", index === activeStep ? "w-7 bg-white" : frames.some((frame) => frame.stepId === step.id) ? "w-2 bg-mirava-success" : "w-2 bg-white/35")} />)}
        </div>
        <button onClick={() => { stopCamera(); setPhase("summary") }} disabled={!identityViewsReady} className="mirava-capture-round-control" aria-label={locale === "fr" ? "Voir le récapitulatif" : "Ver el resumen"}><Images className="h-5 w-5" /></button>
      </header>

      <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-md rounded-[var(--mirava-radius)] border border-white/15 bg-black/75 px-4 py-3 text-center shadow-2xl backdrop-blur-xl">
        <div aria-live="polite" aria-atomic="true" className={cn("mx-auto inline-flex min-h-7 items-center gap-1.5 rounded-[var(--mirava-radius)] border px-2.5 py-1 text-[11px] font-semibold transition-all duration-200", visionIssue === "ready" ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)]" : "border-white/15 bg-white/8 text-white")}>
          {visionIssue === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : visionIssue === "ready" ? <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" /> : null}
          {instruction}
        </div>
        <p className="mt-1.5 font-jakarta text-lg font-semibold tracking-[-.035em]">{currentStep.title[locale]}</p>
        <p className="mx-auto mt-0.5 max-w-xs text-[11px] leading-4 text-white/68">{currentStep.instruction[locale]}</p>
        <div className="mt-2.5 flex items-center justify-between px-2">
          {currentStep.optional ? (
            <button onClick={skip} className="w-12 text-left text-xs font-semibold text-white/72 hover:text-white">{locale === "fr" ? "Passer" : "Omitir"}</button>
          ) : (
            <span className="w-12" />
          )}
          <button onClick={() => void capture()} className="mirava-capture-shutter relative grid h-14 w-14 place-items-center rounded-full transition-transform active:scale-95" aria-label={locale === "fr" ? "Prendre la photo" : "Tomar la foto"}>
            <span className={cn("absolute inset-0 rounded-full border-[2.5px] transition-colors", visionIssue === "ready" ? "border-emerald-400/60" : "border-white/35")} />
            <span className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#10B981 ${stableProgress * 360}deg, transparent 0)` }} />
            <span className={cn("relative grid h-11 w-11 place-items-center rounded-full transition-colors", visionIssue === "ready" ? "bg-emerald-400 text-black shadow-[0_0_16px_rgba(16,185,129,0.8)]" : "bg-white text-black")}><Camera className="h-5 w-5" /></span>
          </button>
          <span className="w-12 text-right text-xs font-semibold text-white/55">{activeStep + 1}/{steps.length}</span>
        </div>
      </div>
    </div>
  )
}

function AppleFaceIdOverlay({
  locale,
  mode,
  visionIssue,
  stableProgress,
  stepId,
}: {
  locale: Locale
  mode: MiravaVisionMode
  visionIssue: MiravaVisionIssue
  stableProgress: number
  stepId: MiravaVisionStep
}) {
  const isPerfect = visionIssue === "ready"
  const isReady = visionIssue === "ready" || visionIssue === "hold-still"

  // 60 tick marks around the circle like iOS Face ID setup
  const TICK_COUNT = 60

  return (
    <div className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Circle viewport mask outline */}
        <div
          className={cn(
            "relative grid place-items-center transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]",
            mode === "pose"
              ? "h-[58vh] w-[46vw] max-w-[220px] max-h-[350px] rounded-3xl"
              : "h-[68vw] w-[68vw] max-w-[270px] max-h-[270px] rounded-full",
            isPerfect
              ? "ring-4 ring-[#30D158] shadow-[0_0_40px_rgba(48,209,88,0.5),0_0_0_9999px_rgba(0,0,0,0.85)] scale-[1.02]"
              : "ring-2 ring-white/20"
          )}
        >
          {/* Directional 3D Arrow inside circle for turn steps (Face ID Style) */}
          {stepId === "left" && !isPerfect && (
            <div className="absolute inset-0 grid place-items-center text-[#30D158] animate-pulse">
              <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-2xl backdrop-blur-md border border-[#30D158]/40 shadow-2xl">
                <span className="text-3xl font-light">←</span>
                <span className="text-xs font-bold tracking-wider uppercase">{locale === "fr" ? "Gauche" : "Izquierda"}</span>
              </div>
            </div>
          )}
          {stepId === "right" && !isPerfect && (
            <div className="absolute inset-0 grid place-items-center text-[#30D158] animate-pulse">
              <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-2xl backdrop-blur-md border border-[#30D158]/40 shadow-2xl">
                <span className="text-xs font-bold tracking-wider uppercase">{locale === "fr" ? "Droite" : "Derecha"}</span>
                <span className="text-3xl font-light">→</span>
              </div>
            </div>
          )}
        </div>

        {/* 60 Radial Ticks Ring around the Circle (Apple Face ID Ring) */}
        <svg
          className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] overflow-visible pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {Array.from({ length: TICK_COUNT }).map((_, index) => {
            const angle = (index * 360) / TICK_COUNT - 90
            const rad = (angle * Math.PI) / 180
            const tickProgress = (index + 1) / TICK_COUNT
            const isFilled = isPerfect || (stableProgress > 0 && index / TICK_COUNT <= stableProgress)

            const rxInner = 48
            const ryInner = 48
            const rxOuter = 53.5
            const ryOuter = 53.5

            const x1 = 50 + rxInner * Math.cos(rad)
            const y1 = 50 + ryInner * Math.sin(rad)
            const x2 = 50 + rxOuter * Math.cos(rad)
            const y2 = 50 + ryOuter * Math.sin(rad)

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isFilled ? "#30D158" : "rgba(255,255,255,0.25)"}
                strokeWidth={isFilled ? "3" : "2"}
                strokeLinecap="round"
                className="transition-colors duration-100"
              />
            )
          })}
        </svg>
      </div>

      {/* Main Guidance Text under Circle */}
      <div className="mt-7 px-6 text-center max-w-xs">
        <p className="text-base font-medium text-white/90 tracking-tight leading-snug">
          {stepId === "left"
            ? (locale === "fr" ? "Tournez la tête vers la gauche pour compléter le cercle." : "Gira la cabeza hacia la izquierda para completar el círculo.")
            : stepId === "right"
            ? (locale === "fr" ? "Tournez la tête vers la droite pour compléter le cercle." : "Gira la cabeza hacia la derecha para completar el círculo.")
            : (locale === "fr" ? "Placez votre visage au centre du cercle." : "Coloca tu rostro en el centro del círculo.")}
        </p>
      </div>
    </div>
  )
}
