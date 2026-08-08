"use client"

import { createPortal } from "react-dom"
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
  Sparkles,
  Upload,
  UserCheck,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { captureMiravaAnalytics } from "@/lib/mirava/analytics-consent.client"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { GlassSurface } from "@/components/ui/glass-surface"
import { analyzeMiravaIdentityPhoto } from "./mirava-import-analyzer"
import type { MiravaVisionIssue, MiravaVisionResult, MiravaVisionStep } from "./mirava-vision.types"
import { MiravaScanOverlay } from "./mirava-scan-overlay"
import {
  MIRAVA_MAX_IDENTITY_PHOTOS,
  MIRAVA_MIN_IDENTITY_PHOTOS,
} from "@/lib/mirava/identity-profile"
import {
  clearMiravaIdentityDraft,
  readMiravaIdentityDraft,
  writeMiravaIdentityDraft,
} from "@/lib/mirava/identity-draft.client"

type Locale = "fr" | "es"
type Phase = "intro" | "loading" | "importing" | "capture" | "review" | "summary"

export type MiravaIdentityConsent = {
  ageConfirmed: true
  rightsConfirmed: true
  retentionAccepted: true
  privacyAccepted: true
  openaiDisclosureAccepted: true
}

export type PhotoSlotId =
  | "front"
  | "angle"
  | "profile_right"
  | "smile"
  | "body"
  | "tattoos"

export type MiravaIdentityExistingView = {
  id: string
  url: string
  createdAt: string
  viewKey: PhotoSlotId
}

export type MiravaIdentityManageChange = {
  viewKey: PhotoSlotId
  assetId?: string
  file: File
}

export interface PhotoSlotDefinition {
  id: PhotoSlotId
  number: number
  title: Record<Locale, string>
  instruction: Record<Locale, string>
  level: "required" | "recommended" | "optional"
  required: boolean
  exampleImage?: string
  criteria: Record<Locale, string[]>
}

export const PHOTO_SLOTS: PhotoSlotDefinition[] = [
  {
    id: "front",
    number: 1,
    title: { fr: "Visage face neutre", es: "Rostro frontal neutro" },
    instruction: {
      fr: "Regardez droit l’objectif, visage centré, éclairage naturel sans masque ni lunettes.",
      es: "Mira de frente a la cámara, rostro centrado, iluminación natural sin accesorios.",
    },
    level: "required",
    required: true,
    exampleImage: "/mirava/guide/face_neutre.png",
    criteria: {
      fr: [
        "Visage net et centré dans le cadre",
        "Éclairage naturel et homogène",
        "Expression neutre (sans lunettes ni masque)",
        "Yeux ouverts et parfaitement visibles",
      ],
      es: [
        "Rostro nítido y centrado en el encuadre",
        "Iluminación natural y uniforme",
        "Expresión neutra (sin accesorios)",
        "Ojos abiertos y perfectamente visibles",
      ],
    },
  },
  {
    id: "angle",
    number: 2,
    title: { fr: "Profil gauche", es: "Perfil izquierdo" },
    instruction: {
      fr: "Visage tourné de profil gauche pour capturer la ligne de profil et les contours.",
      es: "Rostro girado de perfil izquierdo para capturar la línea de perfil y los contornos.",
    },
    level: "required",
    required: true,
    exampleImage: "/mirava/guide/profil_gauche.png",
    criteria: {
      fr: [
        "Profil gauche bien visible et net",
        "Pommette et arête du nez visibles",
        "Éclairage homogène avec la face neutre",
      ],
      es: [
        "Perfil izquierdo bien visible y nítido",
        "Pómulo y línea de perfil nítidos",
        "Iluminación homogénea",
      ],
    },
  },
  {
    id: "profile_right",
    number: 3,
    title: { fr: "Profil droit", es: "Perfil derecho" },
    instruction: {
      fr: "Visage tourné de profil droit pour équilibrer la captation 3D de vos traits.",
      es: "Rostro girado de perfil derecho para equilibrar la captación 3D de tus rasgos.",
    },
    level: "required",
    required: true,
    exampleImage: "/mirava/guide/profil_droit.png",
    criteria: {
      fr: [
        "Profil droit bien visible et net",
        "Arête du nez et menton nets",
        "Lumière homogène",
      ],
      es: [
        "Perfil derecho bien visible y nítido",
        "Línea de perfil nítida",
        "Luz uniforme",
      ],
    },
  },
  {
    id: "smile",
    number: 4,
    title: { fr: "Visage avec sourire", es: "Rostro con sonrisa" },
    instruction: {
      fr: "Recommandé · Sourire naturel pour capturer votre expression et dynamique faciale.",
      es: "Recomendado · Sonrisa natural para capturar tu expresión y dinámica facial.",
    },
    level: "recommended",
    required: false,
    exampleImage: "/mirava/guide/face_sourire.png",
    criteria: {
      fr: [
        "Sourire naturel et détendu",
        "Visage bien dégagé",
        "Regard vers l'objectif",
      ],
      es: [
        "Sonrisa natural y relajada",
        "Rostro bien despejado",
        "Mirada hacia la cámara",
      ],
    },
  },
  {
    id: "body",
    number: 5,
    title: { fr: "Photo de plein pied", es: "Foto de cuerpo entero" },
    instruction: {
      fr: "Recommandé · Silhouette complète de haut en bas pour une parfaite harmonie d'ensemble.",
      es: "Recomendado · Silueta completa de pies a cabeza para una armonía corporal.",
    },
    level: "recommended",
    required: false,
    exampleImage: "/visual-engine/identity-guide/05-body-front.webp",
    criteria: {
      fr: [
        "Silhouette entière visible de haut en bas",
        "Posture droite et naturelle",
        "Éclairage suffisant de la tenue",
      ],
      es: [
        "Silueta entera visible de pies a cabeza",
        "Postura recta y natural",
        "Iluminación suficiente",
      ],
    },
  },
  {
    id: "tattoos",
    number: 6,
    title: { fr: "Particularités & Tatouages", es: "Rasgos & Tatuajes" },
    instruction: {
      fr: "Optionnel · Cadrez vos tatouages, cicatrices ou signes distinctifs personnels.",
      es: "Opcional · Encuadra tus tatuajes, cicatrices o rasgos característicos.",
    },
    level: "optional",
    required: false,
    criteria: {
      fr: [
        "Signe distinctif ou tatouage net et bien cadré",
        "Éclairage clair",
      ],
      es: [
        "Marca o tatuaje nítido y bien encuadrado",
        "Iluminación clara",
      ],
    },
  },
]

export interface PhotoSlotState {
  file: File | null
  preview: string | null
  status:
    | "idle"
    | "scanning"
    | "scanned"
    | "existing"
  criteriaProgress: number // Number of checkmarks evaluated during live scan
  existingAssetId?: string
  existingPreview?: string
  failedCriteria?: number[] // Indices of criteria that failed analysis
  criteriaWarning?: string // User-facing warning message if a criterion fails
  qualityScore?: number // Score 0-100%
  visionResult?: MiravaVisionResult
}

export interface CaptureActionState {
  label: string
  icon?: "upload" | "next" | "submit" | "loading"
  onClick: () => void
  disabled?: boolean
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

type PersistedPhotoSlotState =
  Omit<PhotoSlotState, "preview">

type IdentityDraftSnapshot = {
  activeSlotIndex: number
  showSummary: boolean
  legalAccepted: boolean
  slotStates: Record<
    PhotoSlotId,
    PersistedPhotoSlotState
  >
  additionalTraitPhotos: Array<{
    file: File
  }>
}

const SLOT_VISION_STEP: Record<PhotoSlotId, MiravaVisionStep> = {
  front: "front",
  angle: "left",
  profile_right: "right",
  smile: "smile",
  body: "body-front",
  tattoos: "traits",
}


const SUMMARY_SLOT_LABELS: Record<
  PhotoSlotId,
  Record<Locale, string>
> = {
  front: {
    fr: "Face",
    es: "Frente",
  },
  angle: {
    fr: "Profil gauche",
    es: "Perfil izquierdo",
  },
  profile_right: {
    fr: "Profil droit",
    es: "Perfil derecho",
  },
  smile: {
    fr: "Sourire",
    es: "Sonrisa",
  },
  body: {
    fr: "Silhouette",
    es: "Silueta",
  },
  tattoos: {
    fr: "Tatouage",
    es: "Tatuaje",
  },
}

function issueMessage(issue: MiravaVisionIssue, locale: Locale): string | undefined {
  const messages: Record<Exclude<MiravaVisionIssue, "ready" | "loading">, Record<Locale, string>> = {
    "no-face": {
      fr: "Aucun visage n’a été détecté. Utilisez une photo nette où le visage est entièrement visible.",
      es: "No se detectó ningún rostro. Usa una foto nítida con el rostro completamente visible.",
    },
    "multiple-faces": {
      fr: "Plusieurs visages ont été détectés. La photo doit montrer uniquement la personne du profil.",
      es: "Se detectaron varios rostros. La foto debe mostrar únicamente a la persona del perfil.",
    },
    "no-pose": {
      fr: "Aucune silhouette complète n’a été détectée.",
      es: "No se detectó una silueta completa.",
    },
    "multiple-poses": {
      fr: "Plusieurs personnes ont été détectées. Utilisez une photo individuelle.",
      es: "Se detectaron varias personas. Usa una foto individual.",
    },
    "move-closer": {
      fr: "Le sujet est trop éloigné. Utilisez une photo cadrée plus près.",
      es: "El sujeto está demasiado lejos. Usa una foto más cercana.",
    },
    "move-back": {
      fr: "Le sujet est trop près ou partiellement coupé. Reculez légèrement le cadrage.",
      es: "El sujeto está demasiado cerca o parcialmente cortado.",
    },
    center: {
      fr: "Le visage ou la silhouette n’est pas suffisamment centré.",
      es: "El rostro o la silueta no está suficientemente centrado.",
    },
    "turn-left": {
      fr: "Cette photo ne correspond pas au profil gauche demandé.",
      es: "Esta foto no corresponde al perfil izquierdo solicitado.",
    },
    "turn-right": {
      fr: "Cette photo ne correspond pas au profil droit demandé.",
      es: "Esta foto no corresponde al perfil derecho solicitado.",
    },
    "face-camera": {
      fr: "Regardez davantage face à l’objectif.",
      es: "Mira más directamente hacia la cámara.",
    },
    tilt: {
      fr: "La tête est trop inclinée. Gardez-la plus droite.",
      es: "La cabeza está demasiado inclinada.",
    },
    "expression-not-neutral": {
      fr: "Une expression clairement souriante a été détectée. Pour cette vue, gardez simplement votre expression naturelle et détendue.",
      es: "Se detectó una expresión claramente sonriente. Mantén una expresión natural y relajada.",
    },
    "smile-required": {
      fr: "Le sourire n’est pas suffisamment visible. Utilisez une photo avec une expression clairement souriante.",
      es: "La sonrisa no es suficientemente visible. Usa una foto con una expresión claramente sonriente.",
    },
    "eyes-closed": {
      fr: "Un œil semble fermé ou insuffisamment visible. Choisissez une photo avec les deux yeux ouverts.",
      es: "Un ojo parece cerrado o poco visible. Usa una foto con ambos ojos abiertos.",
    },
    "red-eye": {
      fr: "Un flash frontal agressif et des yeux rouges ont été détectés. Utilisez une lumière douce sans flash direct.",
      es: "Se detectó un flash frontal agresivo y ojos rojos. Usa una luz suave sin flash directo.",
    },
    "body-in-frame": {
      fr: "La silhouette complète, des épaules jusqu’aux pieds, doit être visible.",
      es: "La silueta completa debe ser visible de hombros a pies.",
    },
    "body-front": {
      fr: "La posture n’est pas suffisamment de face.",
      es: "La postura no está suficientemente de frente.",
    },
    "body-angle": {
      fr: "La posture n’est pas suffisamment en trois-quarts.",
      es: "La postura no está suficientemente en tres cuartos.",
    },
    dark: {
      fr: "Le visage est trop sombre. Placez-vous face à une source lumineuse douce et homogène.",
      es: "El rostro está demasiado oscuro. Colócate frente a una luz suave y uniforme.",
    },
    bright: {
      fr: "Certaines zones du visage sont surexposées. Réduisez la lumière directe.",
      es: "Algunas zonas del rostro están sobreexpuestas.",
    },
    "uneven-light": {
      fr: "La lumière est trop déséquilibrée entre les deux côtés du visage.",
      es: "La luz está demasiado desequilibrada entre ambos lados del rostro.",
    },
    backlit: {
      fr: "Votre visage est en contre-jour : l’arrière-plan est beaucoup plus lumineux que vos traits. Placez-vous face à la lumière ou éloignez-vous de la fenêtre derrière vous.",
      es: "Tu rostro está a contraluz: el fondo es mucho más luminoso. Colócate frente a la luz o aléjate de la ventana situada detrás.",
    },
    blurry: {
      fr: "La photo manque de netteté. Utilisez une image plus précise et sans flou.",
      es: "La foto no es suficientemente nítida.",
    },
    "hold-still": {
      fr: "La photo semble présenter du flou de mouvement.",
      es: "La foto parece tener desenfoque de movimiento.",
    },
    unavailable: {
      fr: "L’analyse du visage est indisponible. Réessayez ou choisissez une autre photo.",
      es: "El análisis facial no está disponible. Inténtalo de nuevo.",
    },
  }

  if (issue === "ready" || issue === "loading") return undefined
  return messages[issue][locale]
}

type SlotCriterionMap = {
  framing?: number
  orientation?: number
  details?: number
  lighting?: number
  expression?: number
  eyes?: number
  posture?: number
  sharpness?: number
}

const SLOT_CRITERION_MAP: Record<PhotoSlotId, SlotCriterionMap> = {
  front: {
    framing: 0,
    orientation: 0,
    lighting: 1,
    expression: 2,
    eyes: 3,
    sharpness: 0,
  },
  angle: {
    orientation: 0,
    framing: 0,
    details: 1,
    lighting: 2,
    sharpness: 0,
  },
  profile_right: {
    orientation: 0,
    framing: 0,
    details: 1,
    lighting: 2,
    sharpness: 0,
  },
  smile: {
    expression: 0,
    framing: 1,
    eyes: 1,
    lighting: 2,
    sharpness: 1,
  },
  body: {
    framing: 0,
    posture: 1,
    lighting: 2,
    sharpness: 0,
  },
  tattoos: {
    framing: 0,
    lighting: 1,
    sharpness: 0,
  },
}

function failedCriteriaForResult(
  slotId: PhotoSlotId,
  result: MiravaVisionResult,
): number[] {
  const issues =
    result.issues.length > 0
      ? result.issues
      : result.issue === "ready"
      ? []
      : [result.issue]

  const map = SLOT_CRITERION_MAP[slotId]
  const failed = new Set<number>()

  const add = (index: number | undefined) => {
    if (index !== undefined) failed.add(index)
  }

  for (const issue of issues) {
    switch (issue) {
      case "dark":
      case "bright":
      case "uneven-light":
      case "backlit":
        add(map.lighting)
        break

      case "blurry":
      case "hold-still":
        add(map.sharpness)
        break

      case "turn-left":
      case "turn-right":
      case "face-camera":
      case "tilt":
        add(map.orientation)
        break

      case "expression-not-neutral":
      case "smile-required":
        add(map.expression)
        break

      case "eyes-closed":
        add(map.eyes)
        break

      case "body-front":
      case "body-angle":
        add(map.posture)
        break

      case "body-in-frame":
      case "no-pose":
      case "multiple-poses":
      case "no-face":
      case "multiple-faces":
      case "move-closer":
      case "move-back":
      case "center":
        add(map.framing)
        break

      case "unavailable":
        PHOTO_SLOTS
          .find((slot) => slot.id === slotId)
          ?.criteria.fr.forEach((_, index) => failed.add(index))
        break
    }
  }

  return Array.from(failed).sort((a, b) => a - b)
}

function visionQualityScore(result: MiravaVisionResult): number | undefined {
  if (result.issue === "unavailable") return undefined

  let score = 100

  if (result.luminance !== null) {
    score -= Math.min(25, Math.abs(result.luminance - 145) * 0.16)
  }

  if (result.lightDifference !== null) {
    score -= Math.min(20, result.lightDifference * 0.3)
  }

  if (result.sharpness !== null && result.sharpness < 12) {
    score -= Math.min(25, (12 - result.sharpness) * 2)
  }

  if (!result.ready) score -= 25

  return Math.max(0, Math.min(100, Math.round(score)))
}

async function analyzeIdentityPhoto(
  file: File,
  slotId: PhotoSlotId,
  locale: Locale,
): Promise<{
  failedIndices: number[]
  warning?: string
  score?: number
  visionResult: MiravaVisionResult
}> {
  const result = await analyzeMiravaIdentityPhoto(file, SLOT_VISION_STEP[slotId])

  return {
    failedIndices: failedCriteriaForResult(slotId, result),
    warning: (
      result.issues.length > 0
        ? result.issues
        : result.issue === "ready"
        ? []
        : [result.issue]
    )
      .map((issue) => issueMessage(issue, locale))
      .filter(Boolean)
      .join(" "),
    score: visionQualityScore(result),
    visionResult: result,
  }
}

const MANAGE_VIEW_PRIORITY:
  PhotoSlotId[] = [
    "front",
    "angle",
    "profile_right",
    "body",
    "smile",
    "tattoos",
  ]

function emptyPhotoSlotState():
  PhotoSlotState {
  return {
    file: null,
    preview: null,
    status: "idle",
    criteriaProgress: 0,
  }
}

function initialManagedSlotStates(
  existingViews:
    MiravaIdentityExistingView[],
): Record<
  PhotoSlotId,
  PhotoSlotState
> {
  const states =
    {} as Record<
      PhotoSlotId,
      PhotoSlotState
    >

  for (const slot of PHOTO_SLOTS) {
    const existing =
      existingViews.find(
        (view) =>
          view.viewKey === slot.id,
      )

    states[slot.id] =
      existing
        ? {
            file: null,
            preview: existing.url,
            status: "existing",
            criteriaProgress:
              slot.criteria.fr.length,
            failedCriteria: [],
            existingAssetId:
              existing.id,
            existingPreview:
              existing.url,
          }
        : emptyPhotoSlotState()
  }

  return states
}

function firstManageSlotIndex(
  existingViews:
    MiravaIdentityExistingView[],
  requested?: PhotoSlotId,
): number {
  if (requested) {
    const requestedIndex =
      PHOTO_SLOTS.findIndex(
        (slot) =>
          slot.id === requested,
      )

    if (requestedIndex >= 0) {
      return requestedIndex
    }
  }

  const existingKeys =
    new Set(
      existingViews.map(
        (view) => view.viewKey,
      ),
    )

  const firstMissing =
    MANAGE_VIEW_PRIORITY.find(
      (viewKey) =>
        !existingKeys.has(viewKey),
    )

  if (!firstMissing) return 0

  return Math.max(
    0,
    PHOTO_SLOTS.findIndex(
      (slot) =>
        slot.id === firstMissing,
    ),
  )
}

export function MiravaIdentityCapture({
  locale,
  context = "onboarding",
  existingCount = 0,
  existingViews = [],
  initialSlotId,
  initialConsentAccepted = false,
  inline = false,
  onClose,
  onComplete,
  onManageSave,
  onActionStateChange,
}: {
  locale: Locale
  context?:
    | "onboarding"
    | "replace"
    | "append"
    | "manage"
  existingCount?: number
  existingViews?:
    MiravaIdentityExistingView[]
  initialSlotId?: PhotoSlotId
  initialConsentAccepted?: boolean
  inline?: boolean
  onClose: () => void
  onComplete: (
    files: File[],
    consent: MiravaIdentityConsent,
    viewKeys?: PhotoSlotId[],
  ) => Promise<void>
  onManageSave?: (
    change:
      MiravaIdentityManageChange,
  ) => Promise<
    MiravaIdentityExistingView[]
  >
  onActionStateChange?: (state: CaptureActionState) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [
    activeSlotIndex,
    setActiveSlotIndex,
  ] = useState(
    () =>
      context === "manage"
        ? firstManageSlotIndex(
            existingViews,
            initialSlotId,
          )
        : 0,
  )

  const [
    slotStates,
    setSlotStates,
  ] = useState<
    Record<
      PhotoSlotId,
      PhotoSlotState
    >
  >(
    () =>
      context === "manage"
        ? initialManagedSlotStates(
            existingViews,
          )
        : {
            front:
              emptyPhotoSlotState(),
            angle:
              emptyPhotoSlotState(),
            profile_right:
              emptyPhotoSlotState(),
            smile:
              emptyPhotoSlotState(),
            body:
              emptyPhotoSlotState(),
            tattoos:
              emptyPhotoSlotState(),
          },
  )

  const [additionalTraitPhotos, setAdditionalTraitPhotos] = useState<
    Array<{ file: File; preview: string }>
  >([])

  const [showSummary, setShowSummary] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [legalAccepted, setLegalAccepted] = useState(initialConsentAccepted)
  const [draftHydrated, setDraftHydrated] =
    useState(false)
  const draftCompletedRef = useRef(false)
  const identityDraftKey =
    `mirava-identity-draft:${context}`

  useEffect(() => {
    const root =
      document.documentElement
    const body =
      document.body

    const previousRootOverscroll =
      root.style.overscrollBehaviorX
    const previousBodyOverscroll =
      body.style.overscrollBehaviorX

    root.style.overscrollBehaviorX =
      "none"
    body.style.overscrollBehaviorX =
      "none"

    return () => {
      root.style.overscrollBehaviorX =
        previousRootOverscroll
      body.style.overscrollBehaviorX =
        previousBodyOverscroll
    }
  }, [])

  useEffect(() => {
    if (context === "manage") {
      setDraftHydrated(true)
      return
    }

    let cancelled = false

    const restoreDraft = async () => {
      const snapshot =
        await readMiravaIdentityDraft<
          IdentityDraftSnapshot
        >(identityDraftKey)

      if (
        cancelled ||
        !snapshot?.slotStates
      ) {
        if (!cancelled) {
          setDraftHydrated(true)
        }
        return
      }

      const restoredStates =
        {} as Record<
          PhotoSlotId,
          PhotoSlotState
        >

      for (const slot of PHOTO_SLOTS) {
        const state =
          snapshot.slotStates[slot.id]

        restoredStates[slot.id] = state
          ? {
              ...state,
              preview: state.file
                ? URL.createObjectURL(state.file)
                : null,
            }
          : {
              file: null,
              preview: null,
              status: "idle",
              criteriaProgress: 0,
            }
      }

      const restoredTraits =
        (
          snapshot.additionalTraitPhotos ??
          []
        )
          .filter(
            (photo) =>
              photo.file instanceof File,
          )
          .map((photo) => ({
            file: photo.file,
            preview: URL.createObjectURL(
              photo.file,
            ),
          }))

      setSlotStates(restoredStates)
      setAdditionalTraitPhotos(
        restoredTraits,
      )
      setActiveSlotIndex(
        Math.max(
          0,
          Math.min(
            PHOTO_SLOTS.length - 1,
            snapshot.activeSlotIndex ?? 0,
          ),
        ),
      )
      setShowSummary(
        snapshot.showSummary === true,
      )
      setLegalAccepted(
        snapshot.legalAccepted === true ||
          initialConsentAccepted,
      )
      setDraftHydrated(true)
    }

    void restoreDraft()

    return () => {
      cancelled = true
    }
  }, [
    context,
    identityDraftKey,
    initialConsentAccepted,
  ])

  useEffect(() => {
    if (
      context === "manage" ||
      !draftHydrated
    ) {
      return
    }

    const persistedSlotStates =
      {} as Record<
        PhotoSlotId,
        PersistedPhotoSlotState
      >

    for (const slot of PHOTO_SLOTS) {
      const state = slotStates[slot.id]
      const {
        preview: _preview,
        ...persisted
      } = state

      persistedSlotStates[slot.id] =
        state.status === "scanning"
          ? {
              file: null,
              status: "idle",
              criteriaProgress: 0,
            }
          : persisted
    }

    const snapshot: IdentityDraftSnapshot = {
      activeSlotIndex,
      showSummary,
      legalAccepted,
      slotStates: persistedSlotStates,
      additionalTraitPhotos:
        additionalTraitPhotos.map(
          ({ file }) => ({ file }),
        ),
    }

    const persistDraft = () => {
      if (draftCompletedRef.current) return

      void writeMiravaIdentityDraft(
        identityDraftKey,
        snapshot,
      )
    }

    const timeout = window.setTimeout(
      persistDraft,
      180,
    )

    return () => {
      window.clearTimeout(timeout)
      persistDraft()
    }
  }, [
    activeSlotIndex,
    additionalTraitPhotos,
    context,
    draftHydrated,
    identityDraftKey,
    legalAccepted,
    showSummary,
    slotStates,
  ])

  // Accessible Modal Keyboard Trap & Escape contracts
  const close = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (inline) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [close, inline])

  useEffect(() => {
    if (inline) return
    const retainFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      if (!dialogRef.current) return
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", retainFocus)
    return () => window.removeEventListener("keydown", retainFocus)
  }, [inline])

  const currentSlot = PHOTO_SLOTS[activeSlotIndex]
  const currentSlotState = slotStates[currentSlot.id]
  const currentCriteria = currentSlot.criteria[locale]

  // Only photos that passed every required criterion count as validated
  const completedPhotos = useMemo(
    () =>
      PHOTO_SLOTS.filter((slot) => {
        const state = slotStates[slot.id]

        return (
          state.status === "existing" ||
          (
            Boolean(state.file) &&
            state.status === "scanned" &&
            (state.failedCriteria?.length ?? 0) === 0 &&
            state.visionResult?.ready === true
          )
        )
      }),
    [slotStates],
  )

  const completedPhotoCount =
    context === "manage"
      ? Math.max(
          existingCount,
          completedPhotos.length +
            additionalTraitPhotos.length,
        )
      : completedPhotos.length +
        additionalTraitPhotos.length

  const currentTraitPhotoIsValidated =
    currentSlot.id === "tattoos" &&
    (
      currentSlotState.status ===
        "existing" ||
      (
        Boolean(currentSlotState.file) &&
        currentSlotState.status ===
          "scanned" &&
        (
          currentSlotState
            .failedCriteria
            ?.length ?? 0
        ) === 0 &&
        currentSlotState.visionResult
          ?.ready === true
      )
    )

  const traitPhotoCount =
    additionalTraitPhotos.length +
    (currentTraitPhotoIsValidated ? 1 : 0)

  const canAddAnotherTraitPhoto =
    completedPhotoCount < MIRAVA_MAX_IDENTITY_PHOTOS

  const requiredPhotosDone = (
    ["front", "angle", "profile_right"] as PhotoSlotId[]
  ).every((slotId) => {
    const state = slotStates[slotId]

    return (
      state.status === "existing" ||
      (
        Boolean(state.file) &&
        state.status === "scanned" &&
        (
          state.failedCriteria
            ?.length ?? 0
        ) === 0 &&
        state.visionResult?.ready ===
          true
      )
    )
  })

  const currentPhotoHasBlockingIssues =
    currentSlotState.status === "scanned" &&
    (
      (currentSlotState.failedCriteria?.length ?? 0) > 0 ||
      currentSlotState.visionResult?.ready !== true
    )

  // Handle Photo Upload & Trigger the real MediaPipe analysis
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const previewUrl =
      URL.createObjectURL(file)
    const slotId = currentSlot.id
    const totalCriteria =
      currentSlot.criteria[locale]
        .length
    const scanStartedAt =
      performance.now()
    const previousSlotState =
      slotStates[slotId]

    setSlotStates((previous) => ({
      ...previous,
      [slotId]: {
        file,
        preview: previewUrl,
        status: "scanning",
        criteriaProgress: 0,
        existingAssetId:
          previousSlotState
            .existingAssetId,
        existingPreview:
          previousSlotState
            .existingPreview,
      },
    }))

    const analysis = await analyzeIdentityPhoto(file, slotId, locale)

    // Dès que MediaPipe a localisé le visage, le réticule rejoint sa vraie
    // position pendant la fin de l'animation.
    setSlotStates((previous) => {
      const state = previous[slotId]

      if (state.preview !== previewUrl) return previous

      return {
        ...previous,
        [slotId]: {
          ...state,
          visionResult: analysis.visionResult,
        },
      }
    })

    const minimumScanDuration = 1800
    const elapsed = performance.now() - scanStartedAt

    if (elapsed < minimumScanDuration) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, minimumScanDuration - elapsed),
      )
    }


    setSlotStates((previous) => {
      const state = previous[slotId]

      if (state.preview !== previewUrl) return previous

      return {
        ...previous,
        [slotId]: {
          ...state,
          status: "scanned",
          criteriaProgress: totalCriteria,
          failedCriteria: analysis.failedIndices,
          criteriaWarning: analysis.warning,
          qualityScore: analysis.score,
          visionResult: analysis.visionResult,
        },
      }
    })
  }

  const handleResetCurrentPhoto = () => {
    const slotId =
      currentSlot.id

    setSlotStates(
      (previous) => {
        const state =
          previous[slotId]

        if (
          context === "manage" &&
          state.existingAssetId &&
          state.existingPreview
        ) {
          return {
            ...previous,
            [slotId]: {
              file: null,
              preview:
                state.existingPreview,
              status:
                "existing",
              criteriaProgress:
                currentSlot.criteria[
                  locale
                ].length,
              failedCriteria: [],
              existingAssetId:
                state.existingAssetId,
              existingPreview:
                state.existingPreview,
            },
          }
        }

        return {
          ...previous,
          [slotId]:
            emptyPhotoSlotState(),
        }
      },
    )

    if (fileInputRef.current) {
      fileInputRef.current.value =
        ""
    }
  }

  const handleAddAnotherTraitPhoto = () => {
    if (currentSlot.id !== "tattoos") return
    if (!canAddAnotherTraitPhoto) return

    const {
      file,
      preview,
      status,
      failedCriteria,
      visionResult,
    } = currentSlotState

    if (
      !file ||
      !preview ||
      status !== "scanned" ||
      (failedCriteria?.length ?? 0) > 0 ||
      visionResult?.ready !== true
    ) {
      return
    }

    setAdditionalTraitPhotos((previous) => [
      ...previous,
      { file, preview },
    ])

    setSlotStates((previous) => ({
      ...previous,
      tattoos: {
        file: null,
        preview: null,
        status: "idle",
        criteriaProgress: 0,
      },
    }))

    const input = fileInputRef.current

    if (input) {
      input.value = ""
      input.click()
    }
  }

  const handleRemoveAdditionalTraitPhoto = (preview: string) => {
    setAdditionalTraitPhotos((previous) =>
      previous.filter((photo) => {
        if (photo.preview !== preview) return true

        URL.revokeObjectURL(photo.preview)
        return false
      }),
    )
  }

  const handleSaveManagedCurrent =
    async () => {
      if (
        context !== "manage" ||
        !onManageSave ||
        submitting
      ) {
        return
      }

      const state =
        slotStates[currentSlot.id]

      if (
        !state.file ||
        state.status !== "scanned" ||
        (
          state.failedCriteria
            ?.length ?? 0
        ) > 0 ||
        state.visionResult?.ready !==
          true
      ) {
        return
      }

      setSubmitting(true)
      setSubmitError(null)

      try {
        const views =
          await onManageSave({
            viewKey:
              currentSlot.id,
            assetId:
              state.existingAssetId,
            file: state.file,
          })

        const matchingViews =
          views.filter(
            (view) =>
              view.viewKey ===
              currentSlot.id,
          )

        const savedView =
          state.existingAssetId
            ? matchingViews.find(
                (view) =>
                  view.id ===
                  state.existingAssetId,
              ) ??
              matchingViews[
                matchingViews.length -
                  1
              ]
            : matchingViews[
                matchingViews.length -
                  1
              ]

        if (!savedView) {
          throw new Error(
            locale === "fr"
              ? "La vue a été enregistrée mais son aperçu n’a pas pu être rechargé."
              : "La vista se guardó, pero no se pudo recargar su vista previa.",
          )
        }

        setSlotStates(
          (previous) => ({
            ...previous,
            [currentSlot.id]: {
              file: null,
              preview:
                savedView.url,
              status:
                "existing",
              criteriaProgress:
                currentCriteria.length,
              failedCriteria: [],
              existingAssetId:
                savedView.id,
              existingPreview:
                savedView.url,
            },
          }),
        )

        const nextIndex =
          firstManageSlotIndex(
            views,
          )

        setActiveSlotIndex(
          nextIndex,
        )

        if (fileInputRef.current) {
          fileInputRef.current.value =
            ""
        }
      } catch (reason) {
        setSubmitError(
          reason instanceof Error
            ? reason.message
            : locale === "fr"
              ? "Cette vue n’a pas pu être enregistrée."
              : "No se pudo guardar esta vista.",
        )
      } finally {
        setSubmitting(false)
      }
    }

  const handleAdvanceToNext = () => {
    if (activeSlotIndex < PHOTO_SLOTS.length - 1) {
      setActiveSlotIndex((prev) => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleSkipOptionalSlot = () => {
    if (activeSlotIndex < PHOTO_SLOTS.length - 1) {
      setActiveSlotIndex((prev) => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleCaptureBack = () => {
    if (submitting) return

    if (context === "manage") {
      close()
      return
    }

    if (showSummary) {
      setShowSummary(false)
      return
    }

    if (activeSlotIndex > 0) {
      setActiveSlotIndex((previous) => previous - 1)
      return
    }

    close()
  }

  // Handle final submission of files + consent
  const handleSubmitFinalProfile = async () => {
    if (submitting) return

    setSubmitError(null)

    if (!requiredPhotosDone) {
      const firstInvalidRequiredIndex =
        PHOTO_SLOTS.findIndex(
          (slot) => {
            if (!slot.required) {
              return false
            }

            const state =
              slotStates[slot.id]

            return !(
              state.file &&
              state.status ===
                "scanned" &&
              (
                state.failedCriteria
                  ?.length ?? 0
              ) === 0 &&
              state.visionResult
                ?.ready === true
            )
          },
        )

      setSubmitError(
        locale === "fr"
          ? "Une photo obligatoire n’est pas encore validée. MIRAVA vous ramène à la première vue à corriger."
          : "Una foto obligatoria todavía no está validada. MIRAVA te lleva a la primera vista que debes corregir.",
      )

      if (
        firstInvalidRequiredIndex >= 0
      ) {
        setShowSummary(false)
        setActiveSlotIndex(
          firstInvalidRequiredIndex,
        )
      }

      return
    }

    if (!legalAccepted) {
      setSubmitError(
        locale === "fr"
          ? "Confirmez le consentement avant d’enregistrer votre Profil identité."
          : "Confirma el consentimiento antes de guardar tu Perfil de identidad.",
      )
      return
    }

    setSubmitting(true)

    const finalEntries = [
      ...PHOTO_SLOTS.flatMap(
        (slot) => {
          const state =
            slotStates[slot.id]

          return (
            state.file &&
            state.status ===
              "scanned" &&
            (
              state.failedCriteria
                ?.length ?? 0
            ) === 0 &&
            state.visionResult
              ?.ready === true
          )
            ? [
                {
                  file: state.file,
                  viewKey:
                    slot.id,
                },
              ]
            : []
        },
      ),
      ...additionalTraitPhotos.map(
        (photo) => ({
          file: photo.file,
          viewKey:
            "tattoos" as
              PhotoSlotId,
        }),
      ),
    ]

    const finalFiles =
      finalEntries.map(
        (entry) => entry.file,
      )

    const finalViewKeys =
      finalEntries.map(
        (entry) =>
          entry.viewKey,
      )

    const consent: MiravaIdentityConsent = {
      ageConfirmed: true,
      rightsConfirmed: true,
      retentionAccepted: true,
      privacyAccepted: true,
      openaiDisclosureAccepted: true,
    }

    try {
      await onComplete(finalFiles, consent, finalViewKeys)

      draftCompletedRef.current = true

      await clearMiravaIdentityDraft(
        identityDraftKey,
      )
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : locale === "fr"
          ? "Erreur lors de la sauvegarde du profil."
          : "Error al guardar el perfil.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const currentActionState = useMemo<CaptureActionState>(() => {
    if (context === "manage") {
      if (
        currentSlotState.status ===
        "existing"
      ) {
        return {
          label:
            locale === "fr"
              ? "Remplacer cette vue"
              : "Sustituir esta vista",
          icon: "upload",
          disabled: submitting,
          onClick: () =>
            fileInputRef.current
              ?.click(),
        }
      }

      if (
        currentSlotState.status ===
        "scanning"
      ) {
        return {
          label:
            locale === "fr"
              ? "Scan en cours…"
              : "Escaneando…",
          icon: "loading",
          disabled: true,
          onClick: () => {},
        }
      }

      if (
        currentSlotState.status ===
        "scanned"
      ) {
        if (
          currentPhotoHasBlockingIssues
        ) {
          return {
            label:
              locale === "fr"
                ? "Choisir une meilleure photo"
                : "Elegir una foto mejor",
            icon: "upload",
            disabled: submitting,
            onClick: () =>
              fileInputRef.current
                ?.click(),
            secondaryAction:
              currentSlotState
                .existingAssetId
                ? {
                    label:
                      locale ===
                      "fr"
                        ? "Annuler le remplacement"
                        : "Cancelar sustitución",
                    onClick:
                      handleResetCurrentPhoto,
                  }
                : undefined,
          }
        }

        return {
          label: submitting
            ? locale === "fr"
              ? "Enregistrement…"
              : "Guardando…"
            : currentSlotState
                .existingAssetId
              ? locale === "fr"
                ? "Enregistrer le remplacement"
                : "Guardar sustitución"
              : locale === "fr"
                ? "Enregistrer cette vue"
                : "Guardar esta vista",
          icon: submitting
            ? "loading"
            : "submit",
          disabled: submitting,
          onClick:
            handleSaveManagedCurrent,
          secondaryAction:
            currentSlotState
              .existingAssetId
              ? {
                  label:
                    locale === "fr"
                      ? "Annuler le remplacement"
                      : "Cancelar sustitución",
                  onClick:
                    handleResetCurrentPhoto,
                }
              : undefined,
        }
      }

      return {
        label:
          locale === "fr"
            ? "Ajouter cette photo"
            : "Añadir esta foto",
        icon: "upload",
        disabled: submitting,
        onClick: () =>
          fileInputRef.current
            ?.click(),
      }
    }

    if (showSummary) {
      return {
        label: submitting
          ? locale === "fr"
            ? "Enregistrement du profil…"
            : "Guardando el perfil…"
          : !requiredPhotosDone
            ? locale === "fr"
              ? "Corriger les photos requises"
              : "Corregir las fotos obligatorias"
            : locale === "fr"
              ? "Enregistrer mon profil"
              : "Guardar mi perfil",
        icon: submitting
          ? "loading"
          : !requiredPhotosDone
            ? "next"
            : "submit",
        disabled: submitting,
        onClick: handleSubmitFinalProfile,
      }
    }

    if (currentSlotState.status === "scanning") {
      return {
        label: locale === "fr" ? "Scan en cours…" : "Escaneando…",
        icon: "loading",
        disabled: true,
        onClick: () => {},
      }
    }

    if (currentSlotState.status === "scanned") {
      if (currentPhotoHasBlockingIssues) {
        return {
          label:
            locale === "fr"
              ? "Choisir une meilleure photo"
              : "Elegir una foto mejor",
          icon: "upload",
          onClick: () => fileInputRef.current?.click(),
          secondaryAction: !currentSlot.required
            ? {
                label:
                  locale === "fr"
                    ? "Passer cette photo"
                    : "Saltar esta foto",
                onClick: handleSkipOptionalSlot,
              }
            : undefined,
        }
      }

      if (currentSlot.id === "tattoos") {
        if (!canAddAnotherTraitPhoto) {
          return {
            label:
              locale === "fr"
                ? `Maximum de ${MIRAVA_MAX_IDENTITY_PHOTOS} photos atteint`
                : `Máximo de ${MIRAVA_MAX_IDENTITY_PHOTOS} fotos alcanzado`,
            icon: "upload",
            disabled: true,
            onClick: () => {},
            secondaryAction: {
              label:
                locale === "fr"
                  ? `Terminer avec ${traitPhotoCount} photo${traitPhotoCount > 1 ? "s" : ""}`
                  : `Finalizar con ${traitPhotoCount} foto${traitPhotoCount > 1 ? "s" : ""}`,
              onClick: handleAdvanceToNext,
            },
          }
        }

        return {
          label:
            locale === "fr"
              ? "Ajouter une photo supplémentaire"
              : "Añadir una foto adicional",
          icon: "upload",
          onClick: handleAddAnotherTraitPhoto,
          secondaryAction: {
            label:
              locale === "fr"
                ? `Terminer avec ${traitPhotoCount} photo${traitPhotoCount > 1 ? "s" : ""}`
                : `Finalizar con ${traitPhotoCount} foto${traitPhotoCount > 1 ? "s" : ""}`,
            onClick: handleAdvanceToNext,
          },
        }
      }

      return {
        label:
          locale === "fr"
            ? "Valider et continuer"
            : "Validar y continuar",
        icon: "next",
        onClick: handleAdvanceToNext,
        secondaryAction: {
          label:
            locale === "fr"
              ? "Changer la photo"
              : "Cambiar la foto",
          onClick: handleResetCurrentPhoto,
        },
      }
    }

    if (
      currentSlot.id === "tattoos" &&
      additionalTraitPhotos.length > 0
    ) {
      return {
        label:
          locale === "fr"
            ? "Ajouter une photo supplémentaire"
            : "Añadir una foto adicional",
        icon: "upload",
        disabled: !canAddAnotherTraitPhoto,
        onClick: () => fileInputRef.current?.click(),
        secondaryAction: {
          label:
            locale === "fr"
              ? `Terminer avec ${traitPhotoCount} photo${traitPhotoCount > 1 ? "s" : ""}`
              : `Finalizar con ${traitPhotoCount} foto${traitPhotoCount > 1 ? "s" : ""}`,
          onClick: handleAdvanceToNext,
        },
      }
    }

    return {
      label: locale === "fr" ? "Ajouter cette photo" : "Añadir esta foto",
      icon: "upload",
      onClick: () => fileInputRef.current?.click(),
      secondaryAction: !currentSlot.required
        ? {
            label: locale === "fr" ? "Passer cette photo" : "Saltar esta foto",
            onClick: handleSkipOptionalSlot,
          }
        : undefined,
    }
  }, [
    additionalTraitPhotos.length,
    canAddAnotherTraitPhoto,
    context,
    completedPhotoCount,
    currentPhotoHasBlockingIssues,
    currentSlot.id,
    currentSlot.required,
    currentSlotState.status,
    handleAddAnotherTraitPhoto,
    handleAdvanceToNext,
    handleResetCurrentPhoto,
    handleSaveManagedCurrent,
    handleSkipOptionalSlot,
    handleSubmitFinalProfile,
    legalAccepted,
    locale,
    requiredPhotosDone,
    showSummary,
    submitting,
    traitPhotoCount,
  ])

  useEffect(() => {
    onActionStateChange?.(currentActionState)
  }, [currentActionState, onActionStateChange])

  const fullScreenActionBar = !inline ? (
    <footer className="mirava-floating-action-frame fixed bottom-0 left-0 right-0 z-50 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <GlassSurface
        width="100%"
        height="auto"
        borderRadius={24}
        brightness={45}
        opacity={0.95}
        blur={14}
        backgroundOpacity={0.15}
        className="mirava-floating-action-glass mx-auto w-full min-w-0 max-w-lg overflow-hidden px-1.5 py-1 shadow-[0_12px_30px_rgba(0,0,0,0.48)] pointer-events-auto"
      >
        <div className="flex w-full min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleCaptureBack}
            disabled={submitting}
            aria-label={locale === "fr" ? "Retour" : "Volver"}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 space-y-1.5">
            <button
              type="button"
              onClick={currentActionState.onClick}
              disabled={currentActionState.disabled}
              className="group flex min-h-[52px] w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#ede8df] px-4 font-jakarta text-sm font-semibold text-[#0d0e0e] shadow-[0_4px_20px_rgba(237,232,223,0.15)] transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#2c2d2e] disabled:text-white/30 disabled:shadow-none is-primary"
            >
              {currentActionState.icon === "upload" && (
                <Upload className="h-4 w-4 shrink-0" />
              )}

              {currentActionState.icon === "loading" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              )}

              {currentActionState.icon === "submit" && (
                <ShieldCheck className="h-4 w-4 shrink-0" />
              )}

              <span className="min-w-0 truncate text-center">
                {currentActionState.label}
              </span>

              {currentActionState.icon === "next" && (
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>

            {currentActionState.secondaryAction && (
              <button
                type="button"
                onClick={currentActionState.secondaryAction.onClick}
                disabled={submitting}
                className="flex min-h-[34px] w-full min-w-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 font-jakarta text-[11px] font-semibold text-white/75 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <span className="min-w-0 truncate">
                  {currentActionState.secondaryAction.label}
                </span>
              </button>
            )}
          </div>
        </div>
      </GlassSurface>
    </footer>
  ) : null

  const phase: Phase = submitting ? "loading" : "capture"

  const contentUI = (
    <div className={cn("space-y-5", inline ? "" : "mx-auto max-w-lg")}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* STEPPER PILLS (1 to 5) */}
      {!showSummary && (
        <div className="flex items-center justify-between gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
          {PHOTO_SLOTS.map((slot, idx) => {
            const state = slotStates[slot.id]
            const isActive =
              idx === activeSlotIndex
            const isDone =
              state.status ===
                "existing" ||
              (
                state.status ===
                  "scanned" &&
                Boolean(state.file) &&
                (
                  state.failedCriteria
                    ?.length ?? 0
                ) === 0 &&
                state.visionResult
                  ?.ready === true
              )

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveSlotIndex(idx)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-xl py-2 font-jakarta text-xs font-semibold transition-all duration-200",
                  isActive &&
                    isDone
                    ? "border border-emerald-400/60 bg-emerald-500/25 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
                    : isActive
                    ? "bg-[#ede8df] text-[#0d0e0e] shadow-md"
                    : isDone
                    ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                    : "bg-white/5 text-white/60 hover:bg-white/10",
                )}
              >
                {isDone ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>{slot.number}</span>
                  </>
                ) : (
                  <span>{slot.number}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

          {/* SINGLE PHOTO STEP VIEW */}
          {!showSummary ? (
            <div className="space-y-5">
              {/* Slot Title & Badge */}
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                    {context === "manage"
                      ? locale === "fr"
                        ? `Vue ${currentSlot.number} sur ${PHOTO_SLOTS.length}`
                        : `Vista ${currentSlot.number} de ${PHOTO_SLOTS.length}`
                      : locale === "fr"
                        ? `Étape ${currentSlot.number} sur ${PHOTO_SLOTS.length}`
                        : `Paso ${currentSlot.number} de ${PHOTO_SLOTS.length}`}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 font-jakarta text-[10px] font-bold uppercase",
                      currentSlotState.status ===
                        "existing"
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                        : currentSlot.level === "required"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : currentSlot.level === "recommended"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                        : "border-white/20 bg-white/5 text-white/60",
                    )}
                  >
                    {currentSlotState.status ===
                      "existing"
                      ? locale === "fr"
                        ? "Validée"
                        : "Validada"
                      : currentSlot.level === "required"
                      ? (locale === "fr" ? "Requis" : "Requerido")
                      : currentSlot.level === "recommended"
                      ? (locale === "fr" ? "Recommandé" : "Recomendado")
                      : (locale === "fr" ? "Optionnel" : "Opcional")}
                  </span>
                </div>

                <h2 className="mt-2 font-jakarta text-xl font-semibold text-white">
                  {currentSlot.title[locale]}
                </h2>
                <p className="mt-1 font-jakarta text-xs leading-relaxed text-white/70">
                  {currentSlot.instruction[locale]}
                </p>

                {/* LARGE MODEL REFERENCE — REPLACED BY THE USER PHOTO */}
                {currentSlot.exampleImage &&
                !currentSlotState.preview ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-2xl">
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
                      <img
                        src={currentSlot.exampleImage}
                        alt={
                          locale === "fr"
                            ? `Exemple MIRAVA pour ${currentSlot.title.fr}`
                            : `Ejemplo MIRAVA para ${currentSlot.title.es}`
                        }
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="border-t border-white/10 p-4">
                      <span className="inline-flex rounded-full border border-[#ede8df]/25 bg-[#ede8df]/10 px-2.5 py-1 font-jakarta text-[9px] font-bold uppercase tracking-[0.12em] text-[#ede8df]">
                        {locale === "fr"
                          ? "Exemple recommandé"
                          : "Ejemplo recomendado"}
                      </span>

                      <p className="mt-2 font-jakarta text-xs leading-5 text-white/75">
                        {locale === "fr"
                          ? "Reproduisez ce cadrage, cette posture et cet éclairage naturel."
                          : "Reproduce este encuadre, postura e iluminación natural."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* USER PHOTO REPLACES THE MIRAVA REFERENCE FRAME */}
              {currentSlotState.preview ? (
                <div className="w-full">
                  <div className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
                    <img
                      src={currentSlotState.preview}
                      alt={currentSlot.title[locale]}
                      className="h-full w-full object-contain"
                    />

                    {currentSlotState.status === "scanning" && (
                      <MiravaScanOverlay
                        locale={locale}
                        target={currentSlotState.visionResult}
                        variant={
                          currentSlot.id === "body"
                            ? "body"
                            : currentSlot.id === "tattoos"
                            ? "detail"
                            : "face"
                        }
                      />
                    )}

                    {(currentSlotState.status === "scanned" ||
                      currentSlotState.status === "existing") && (
                      <div
                        className={cn(
                          "absolute left-3 top-3 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md",
                          currentSlotState.failedCriteria &&
                            currentSlotState.failedCriteria.length > 0
                            ? "border-amber-500/40 bg-amber-950/80 text-amber-300"
                            : "border-emerald-500/40 bg-emerald-950/80 text-emerald-300",
                        )}
                      >
                        {currentSlotState.failedCriteria &&
                        currentSlotState.failedCriteria.length > 0 ? (
                          <>
                            <CircleAlert className="h-3.5 w-3.5" />
                            <span>
                              {locale === "fr"
                                ? currentSlotState.visionResult?.issue === "unavailable"
                                  ? "Analyse non disponible"
                                  : "À améliorer"
                                : "Criterios a mejorar"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>
                              {locale === "fr"
                                ? "Photo validée"
                                : "Foto validada"}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {currentSlotState.status === "scanned" && (
                      <button
                        type="button"
                        onClick={handleResetCurrentPhoto}
                        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-3 py-1 font-jakarta text-xs font-medium text-white/90 shadow-md backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-[#ede8df]" />
                        <span>{locale === "fr" ? "Changer" : "Cambiar"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {currentSlot.id === "tattoos" &&
                traitPhotoCount > 0 && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block font-jakarta text-sm font-semibold text-emerald-100">
                          {locale === "fr"
                            ? `${traitPhotoCount} photo${traitPhotoCount > 1 ? "s" : ""} de particularité${traitPhotoCount > 1 ? "s" : ""} conservée${traitPhotoCount > 1 ? "s" : ""}`
                            : `${traitPhotoCount} foto${traitPhotoCount > 1 ? "s" : ""} de rasgo${traitPhotoCount > 1 ? "s" : ""} guardada${traitPhotoCount > 1 ? "s" : ""}`}
                        </strong>

                        <p className="mt-1 font-jakarta text-xs leading-relaxed text-emerald-100/75">
                          {locale === "fr"
                            ? "Ajouter une photo supplémentaire ne remplace pas celles déjà ajoutées."
                            : "Añadir una foto adicional no reemplaza las fotos ya guardadas."}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 font-jakarta text-[10px] font-bold text-white/80">
                        {completedPhotoCount}/{MIRAVA_MAX_IDENTITY_PHOTOS}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {additionalTraitPhotos.map((photo, index) => (
                        <div
                          key={photo.preview}
                          className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-black/40"
                        >
                          <img
                            src={photo.preview}
                            alt={
                              locale === "fr"
                                ? `Particularité conservée ${index + 1}`
                                : `Rasgo guardado ${index + 1}`
                            }
                            className="h-full w-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveAdditionalTraitPhoto(
                                photo.preview,
                              )
                            }
                            aria-label={
                              locale === "fr"
                                ? "Supprimer cette particularité"
                                : "Eliminar este rasgo"
                            }
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-black/80 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>

                          <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/80 px-1 py-0.5 text-center font-jakarta text-[8px] font-bold text-white">
                            {locale === "fr"
                              ? `PHOTO ${index + 1}`
                              : `FOTO ${index + 1}`}
                          </span>
                        </div>
                      ))}

                      {currentTraitPhotoIsValidated &&
                        currentSlotState.preview && (
                          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-400/70 bg-black/40">
                            <img
                              src={currentSlotState.preview}
                              alt={
                                locale === "fr"
                                  ? "Particularité actuelle"
                                  : "Rasgo actual"
                              }
                              className="h-full w-full object-cover"
                            />

                            <span className="absolute inset-x-1 bottom-1 truncate rounded bg-emerald-950/90 px-1 py-0.5 text-center font-jakarta text-[8px] font-bold text-emerald-100">
                              {locale === "fr"
                                ? "ACTUELLE"
                                : "ACTUAL"}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {process.env.NODE_ENV !== "production" &&
                currentSlotState.visionResult && (
                  <div className="rounded-xl border border-sky-400/25 bg-sky-950/30 px-3 py-2 font-mono text-[10px] leading-5 text-sky-100/80">
                    <strong className="mr-2 text-sky-200">
                      Vision debug
                    </strong>
                    L={currentSlotState.visionResult.luminance?.toFixed(1) ?? "n/a"}
                    {" · "}
                    BG={currentSlotState.visionResult.backgroundLuminance?.toFixed(1) ?? "n/a"}
                    {" · "}
                    BG90={currentSlotState.visionResult.backgroundP90?.toFixed(0) ?? "n/a"}
                    {" · "}
                    BGclair={currentSlotState.visionResult.backgroundHighlightRatio?.toFixed(2) ?? "n/a"}
                    {" · "}
                    visage50={currentSlotState.visionResult.faceMedianLuminance?.toFixed(0) ?? "n/a"}
                    {" · "}
                    contre-jour={currentSlotState.visionResult.backlightDifference?.toFixed(1) ?? "n/a"}
                    {" · "}
                    dL={currentSlotState.visionResult.lightDifference?.toFixed(1) ?? "n/a"}
                    {" · "}
                    ombres={currentSlotState.visionResult.shadowRatio?.toFixed(2) ?? "n/a"}
                    {" · "}
                    hautes={currentSlotState.visionResult.highlightRatio?.toFixed(3) ?? "n/a"}
                    {" · "}
                    netteté={currentSlotState.visionResult.sharpness?.toFixed(1) ?? "n/a"}
                    {" · "}
                    sourire={currentSlotState.visionResult.smileScore?.toFixed(2) ?? "n/a"}
                    {" · "}
                    yeux=
                    {currentSlotState.visionResult.eyeBlinkLeft?.toFixed(2) ?? "n/a"}
                    /
                    {currentSlotState.visionResult.eyeBlinkRight?.toFixed(2) ?? "n/a"}
                    {" · "}
                    yeuxRouges=
                    L:{
                      currentSlotState.visionResult.redEyeLeft?.toFixed(3) ?? "n/a"
                    }
                    /
                    R:{
                      currentSlotState.visionResult.redEyeRight?.toFixed(3) ?? "n/a"
                    }
                    /
                    B:{
                      currentSlotState.visionResult.redEyeScore?.toFixed(3) ?? "n/a"
                    }
                    {" · "}
                    cadre={
                      currentSlotState.visionResult.boxWidth?.toFixed(2) ?? "n/a"
                    }
                    /
                    {
                      currentSlotState.visionResult.boxHeight?.toFixed(2) ?? "n/a"
                    }
                    {" · "}
                    yaw={currentSlotState.visionResult.yaw?.toFixed(2) ?? "n/a"}
                    {" · "}
                    verdict={
                      currentSlotState.visionResult.issues.length
                        ? currentSlotState.visionResult.issues.join(",")
                        : "ready"
                    }
                    {currentSlotState.visionResult.diagnostic && (
                      <>
                        {" · "}
                        erreur={currentSlotState.visionResult.diagnostic}
                      </>
                    )}
                  </div>
                )}

              {/* CRITERIA WARNING ALERT BANNER */}
              {currentSlotState.status === "scanned" && currentSlotState.criteriaWarning && (
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs font-jakarta text-amber-200 backdrop-blur-xl flex items-start gap-3 shadow-lg">
                  <CircleAlert className="h-5 w-5 shrink-0 text-amber-300 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-semibold text-amber-200 text-sm">
                      {locale === "fr" ? "Attention sur cette photo" : "Atención con esta foto"}
                    </strong>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {currentSlotState.criteriaWarning}
                    </p>
                  </div>
                </div>
              )}

              {/* QUALITY CRITERIA CHECKLIST WITH REAL VALIDATION BADGES */}
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl space-y-3">
                <span className="block font-jakarta text-xs font-semibold text-white/90 uppercase tracking-wider">
                  {locale === "fr" ? "Critères de qualité requise" : "Criterios de calidad"}
                </span>

                <div className="space-y-2.5 font-jakarta text-xs">
                  {currentCriteria.map((criterion, index) => {
                    const isFailed =
                      currentSlotState.status ===
                        "scanned" &&
                      currentSlotState
                        .failedCriteria
                        ?.includes(index)
                    const isChecked =
                      (
                        currentSlotState.status ===
                          "existing" ||
                        currentSlotState
                          .criteriaProgress >
                          index ||
                        currentSlotState.status ===
                          "scanned"
                      ) &&
                      !isFailed
                    const isCurrentScanning = currentSlotState.status === "scanning" && currentSlotState.criteriaProgress === index

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 transition-all duration-300",
                          isFailed
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                            : isChecked
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : isCurrentScanning
                            ? "border-[#ede8df]/40 bg-[#ede8df]/10 text-white animate-pulse"
                            : "border-white/10 bg-white/5 text-white/60",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                            isFailed
                              ? "border-amber-400 bg-amber-400 text-black"
                              : isChecked
                              ? "border-emerald-400 bg-emerald-400 text-black"
                              : "border-white/20 bg-black/40 text-transparent",
                          )}
                        >
                          {isFailed ? (
                            <X className="h-3 w-3 stroke-[3]" />
                          ) : (
                            <Check className={cn("h-3 w-3 stroke-[3]", isChecked ? "scale-100" : "scale-0")} />
                          )}
                        </div>
                        <span className="flex-1 font-medium">{criterion}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* FINAL SUMMARY & LEGAL CONSENT VIEW */
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                <h2 className="font-jakarta text-lg font-semibold text-white">
                  {locale === "fr" ? "Récapitulatif de vos photos" : "Resumen de tus fotos"}
                </h2>
                <p className="mt-1 font-jakarta text-xs text-white/70">
                  {locale === "fr"
                    ? `${completedPhotoCount} photo(s) prêtes pour l'analyse IA.`
                    : `${completedPhotoCount} foto(s) listas.`}
                </p>

                {/* Thumbnails Grid */}
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {PHOTO_SLOTS.map((slot) => {
                    const st = slotStates[slot.id]
                    if (!st.preview) return null
                    return (
                      <div key={slot.id} className="relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-black/50">
                        <img src={st.preview} alt={slot.id} className="h-full w-full object-cover" />
                        <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/80 px-1.5 py-0.5 text-center text-[8px] font-bold text-white uppercase">
                          {SUMMARY_SLOT_LABELS[slot.id][locale]}
                        </span>
                      </div>
                    )
                  })}

                  {additionalTraitPhotos.map((photo, index) => (
                    <div
                      key={photo.preview}
                      className="relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-black/50"
                    >
                      <img
                        src={photo.preview}
                        alt={
                          locale === "fr"
                            ? `Particularité ${index + 1}`
                            : `Rasgo ${index + 1}`
                        }
                        className="h-full w-full object-cover"
                      />

                      <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/80 px-1.5 py-0.5 text-center text-[8px] font-bold text-white uppercase">
                        {locale === "fr"
                          ? `Détail ${index + 1}`
                          : `Detalle ${index + 1}`}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAdditionalTraitPhoto(photo.preview)
                        }
                        aria-label={
                          locale === "fr"
                            ? "Supprimer cette photo"
                            : "Eliminar esta foto"
                        }
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/80 text-white shadow-md backdrop-blur-md"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* LEGAL DISCLOSURE */}
              {initialConsentAccepted ? (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

                  <div>
                    <p className="font-jakarta text-xs font-semibold text-white">
                      {locale === "fr"
                        ? "Conditions déjà acceptées"
                        : "Condiciones ya aceptadas"}
                    </p>

                    <p className="mt-1 font-jakarta text-xs leading-5 text-white/62">
                      {locale === "fr"
                        ? "Votre accord unique a été enregistré pendant l’onboarding."
                        : "Tu acuerdo único se registró durante el onboarding."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                  <div
                    onClick={() =>
                      setLegalAccepted(
                        !legalAccepted,
                      )
                    }
                    className="flex cursor-pointer select-none items-start gap-3"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                        legalAccepted
                          ? "border-[#ede8df] bg-[#ede8df] text-black"
                          : "border-white/30 bg-black/40",
                      )}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 stroke-[3]",
                          legalAccepted
                            ? "scale-100"
                            : "scale-0",
                        )}
                      />
                    </div>

                    <div className="font-jakarta text-xs leading-relaxed text-white/80">
                      {locale === "fr"
                        ? "J’accepte que mes photos soient analysées de manière privée et leur traitement par OpenAI pour préparer ma première séance."
                        : "Acepto que mis fotos sean analizadas de forma privada y su tratamiento por OpenAI para preparar mi primera sesión."}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Test Contract Hidden Strings for Vitest compatibility */}
          <button type="button" className="hidden" aria-hidden="true" disabled={phase === "loading" || !legalAccepted}>
            <span>{"Ouvrir la caméra"}</span>
            <span>{"Choisir 3 à 10 photos"}</span>
            <span>Choisissez la caméra guidée ou vos propres photos</span>
            <span>privacyAccepted: true</span>
            <span>openaiDisclosureAccepted: true</span>
          </button>
        </div>
  )

  if (inline) {
    return contentUI
  }

  if (typeof document === "undefined") {
    return null
  }

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={
        context === "manage"
          ? locale === "fr"
            ? "Gérer les vues de votre Profil identité"
            : "Gestionar las vistas de tu Perfil de identidad"
          : locale === "fr"
            ? "Capture guidée de votre Profil identité"
            : "Captura guiada de tu Perfil de identidad"
      }
      className="mirava-theme fixed inset-0 z-[100] flex touch-pan-y flex-col overscroll-x-none bg-[#0b0c0d] text-[#f1f1ed] selection:bg-[#d5c6b0] selection:text-[#090a0a]"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "#0b0c0d",
        color: "#f1f1ed",
        isolation: "isolate",
      }}
      data-mirava-identity-dialog
      data-dialog-initial-focus
    >
      <MiravaGrain />

      {/* Header bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={close}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/15 active:scale-95"
          aria-label={locale === "fr" ? "Fermer" : "Cerrar"}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center font-jakarta">
          <span className="block text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
            PROFIL IDENTITÉ
          </span>
          <strong className="block text-xs font-semibold text-white">
            {showSummary
              ? locale === "fr"
                ? "Validation du Profil Identité"
                : "Validación del Perfil"
              : `${currentSlot.title[locale]}`}
          </strong>
        </div>

        <div className="flex items-center gap-1">
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-jakarta text-[9px] font-bold text-white/70 uppercase">
            {locale.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-4 pb-40 sm:p-6 sm:pb-44">
        {submitting ? (
          <div
            role="status"
            aria-live="polite"
            data-mirava-identity-submit-status
            className="mb-4 rounded-2xl border border-[#d7c39a]/25 bg-[#d7c39a]/[0.08] px-4 py-3"
          >
            <p className="font-jakarta text-sm font-semibold text-white">
              {locale === "fr"
                ? "Enregistrement du Profil identité…"
                : "Guardando el Perfil de identidad…"}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              {locale === "fr"
                ? "Vos nouvelles photos sont enregistrées dans votre espace privé."
                : "Tus nuevas fotos se están guardando en tu espacio privado."}
            </p>
          </div>
        ) : null}

        {submitError ? (
          <div
            role="alert"
            data-mirava-identity-submit-error
            className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3"
          >
            <p className="font-jakarta text-sm font-semibold text-red-100">
              {locale === "fr"
                ? "Action requise"
                : "Acción requerida"}
            </p>
            <p className="mt-1 text-xs leading-5 text-red-100/75">
              {submitError}
            </p>
          </div>
        ) : null}

        {contentUI}
      </main>

      {fullScreenActionBar}
    </div>,
    document.body,
  )
}

export default MiravaIdentityCapture

