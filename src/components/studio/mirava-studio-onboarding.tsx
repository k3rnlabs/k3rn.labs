"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { GlassSurface } from "@/components/ui/glass-surface"
import { ArrowLeft, ArrowRight, Check, Clock3, Loader2, LockKeyhole, ShieldCheck, Sparkles, Upload, UserCheck } from "lucide-react"
import { captureMiravaAnalytics } from "@/lib/mirava/analytics-consent.client"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import {
  MIRAVA_ONBOARDING_STEPS,
  MIRAVA_ONBOARDING_VERSION,
  onboardingStepIndex,
  type MiravaOnboardingDirection,
  type MiravaOnboardingFormat,
  type MiravaOnboardingGoal,
  type MiravaOnboardingSessionType,
  type MiravaOnboardingState,
  type MiravaOnboardingStepId,
} from "@/lib/mirava/onboarding"
import { MIRAVA_UNIVERSES, getMiravaUniverse } from "@/lib/mirava/universes"
import {
  MIRAVA_MAX_IDENTITY_PHOTOS,
  MIRAVA_MIN_IDENTITY_PHOTOS,
} from "@/lib/mirava/identity-profile"
import { uploadMiravaIdentityProfile } from "@/lib/mirava/identity-profile-upload.client"
import { cn } from "@/lib/utils"
import {
  MiravaMobileShell,
  MobileProgressHeader,
  MiravaSelectionCard,
  MiravaCustomCheckbox,
  UniverseCard,
  UniverseGrid,
} from "./mirava-mobile-primitives"
import MiravaIdentityCapture, { type CaptureActionState } from "./mirava-identity-capture"
import { OnboardingPipelineDemo } from "./mirava-pipeline-demo"

type Locale = "fr" | "es"

type IdentityProfileReceipt = {
  id: string
  assetCount: number
  updatedAt: string
}

type IdentityProfileApiResponse = {
  profile?: IdentityProfileReceipt
  error?: string
  message?: string
}

function isIdentityProfileReceipt(
  value: unknown,
): value is IdentityProfileReceipt {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.assetCount === "number" &&
    Number.isInteger(candidate.assetCount) &&
    typeof candidate.updatedAt === "string" &&
    candidate.updatedAt.length > 0
  )
}
const GOALS: Record<Locale, Array<{ id: MiravaOnboardingGoal; title: string; session: string; reason: string }>> = {
  fr: [
    { id: "presence", title: "Développer ma présence", session: "Portrait éditorial", reason: "Une image cohérente pour votre profil et vos publications." },
    { id: "campaign", title: "Créer une campagne", session: "Série cohérente", reason: "Une direction déclinable en publication, story et bannière." },
    { id: "portfolio", title: "Construire mon portfolio", session: "Série signature", reason: "Des portraits expressifs pour votre portfolio et vos supports." },
  ],
  es: [
    { id: "presence", title: "Desarrollar mi presencia", session: "Retrato editorial", reason: "Una imagen coherente para tu perfil y tus publicaciones." },
    { id: "campaign", title: "Crear una campaña", session: "Serie coherent", reason: "Una dirección adaptable a publicación, story y banner." },
    { id: "portfolio", title: "Construir mi portfolio", session: "Serie distintiva", reason: "Retratos expressivos para tu portfolio y tus soportes." },
  ],
}

const SESSION_CHOICES: Record<
  Locale,
  Array<{
    id: MiravaOnboardingSessionType
    title: string
    reason: string
  }>
> = {
  fr: [
    {
      id: "portrait_signature",
      title: "Portrait signature",
      reason:
        "Une image éditoriale forte pour incarner votre univers.",
    },
    {
      id: "profile_premium",
      title: "Photo de profil premium",
      reason:
        "Un cadrage rapproché, lisible et magnétique.",
    },
    {
      id: "lifestyle_editorial",
      title: "Portrait lifestyle",
      reason:
        "Une présence naturelle dans une scène plus vivante.",
    },
    {
      id: "mini_campaign",
      title: "Mini-campagne",
      reason:
        "Une première image qui ouvre une série cohérente de trois créations.",
    },
  ],
  es: [
    {
      id: "portrait_signature",
      title: "Retrato distintivo",
      reason:
        "Una imagen editorial fuerte para encarnar tu universo.",
    },
    {
      id: "profile_premium",
      title: "Foto de perfil premium",
      reason:
        "Un encuadre cercano, claro y magnético.",
    },
    {
      id: "lifestyle_editorial",
      title: "Retrato lifestyle",
      reason:
        "Una presencia natural dentro de una escena más viva.",
    },
    {
      id: "mini_campaign",
      title: "Mini campaña",
      reason:
        "Una primera imagen que abre una serie coherente de tres creaciones.",
    },
  ],
}

const LEGAL_POINTS: Record<
  Locale,
  Array<{
    title: string
    body: string
  }>
> = {
  fr: [
    {
      title: "Majorité et droits",
      body:
        "Je confirme avoir au moins 18 ans, disposer des droits nécessaires sur les photos envoyées et du consentement explicite de toute personne qui y apparaît.",
    },
    {
      title: "Profil identité privé",
      body:
        "Les photos validées rejoignent mon Profil identité privé. Je peux les consulter, les remplacer ou les supprimer depuis mon compte.",
    },
    {
      title: "Traitement demandé",
      body:
        "Mes photos sont transmises à l’API OpenAI uniquement lorsque je demande personnellement une création MIRAVA.",
    },
    {
      title: "Références et retrait",
      body:
        "Les références artistiques sont supprimées après leur analyse. Mon Profil identité reste conservé jusqu’à sa suppression depuis mon compte.",
    },
  ],
  es: [
    {
      title: "Mayoría de edad y derechos",
      body:
        "Confirmo que tengo al menos 18 años, que dispongo de los derechos necesarios sobre las fotos y del consentimiento explícito de toda persona que aparezca en ellas.",
    },
    {
      title: "Perfil de identidad privado",
      body:
        "Las fotos validadas se incorporan a mi Perfil de identidad privado. Puedo consultarlas, sustituirlas o eliminarlas desde mi cuenta.",
    },
    {
      title: "Tratamiento solicitado",
      body:
        "Mis fotos se transmiten a la API de OpenAI únicamente cuando solicito personalmente una creación MIRAVA.",
    },
    {
      title: "Referencias y retirada",
      body:
        "Las referencias artísticas se eliminan después de su análisis. Mi Perfil de identidad se conserva hasta que lo elimine desde mi cuenta.",
    },
  ],
}

const COPY = {
  fr: {
    phases: [
      "Votre studio",
      "Votre objectif",
      "Vos univers",
      "Première séance",
      "Résultat",
      "Validation",
      "Votre identité",
      "Activation",
    ],
    step: "Étape",
    back: "Retour",
    saving: "Enregistrement…",
    start: "Construire mon studio",
    name:
      "Comment Mirava doit-elle vous appeler ?",
    placeholder: "Votre prénom",
    promise:
      "Votre studio photo personnel, guidé de la direction au premier résultat.",
    objective:
      "Que voulez-vous rendre visible en premier ?",
    objectiveCta:
      "Choisir mes univers",
    universes:
      "Choisissez jusqu’à trois univers qui vous ressemblent.",
    universeHint:
      "Ils personnaliseront votre Studio. Vous choisirez ensuite celui de votre première séance.",
    universeLimit:
      "Trois univers maximum. Retirez-en un pour en choisir un autre.",
    use:
      "Enregistrer mes univers",
    primary:
      "Quel univers souhaitez-vous créer en premier ?",
    primaryHint:
      "Les autres restent enregistrés dans votre Studio pour vos prochaines séances.",
    primaryCta:
      "Choisir mon résultat",
    session:
      "Que souhaitez-vous créer en premier ?",
    sessionHint:
      "MIRAVA recommande un format selon votre objectif, mais la décision reste la vôtre.",
    sessionCta:
      "Composer ma direction",
    recommended:
      "Recommandé pour votre objectif",
    direction:
      "Votre première direction",
    confirm:
      "Confirmer ma séance",
    identity:
      "Préparons les photos qui permettront à Mirava de vous ressembler.",
    photos:
      "3 vues essentielles · environ 2 minutes",
    privacy:
      "Vos photos rejoignent votre Profil Identité privé. Vous pourrez les consulter, les remplacer ou les supprimer.",
    processing:
      "Le cadrage est analysé sur votre appareil. Les photos validées sont ensuite utilisées pour vos créations Mirava.",
    consent:
      "J’ai au moins 18 ans, j’ai les droits sur ces photos et j’accepte leur conservation privée. Je comprends que les photos validées seront traitées par l’API OpenAI uniquement lorsque je demande une création MIRAVA.",
    camera:
      "Commencer mes photos",
    resume:
      "Reprendre mes photos",
    preparing:
      "Terminez votre Profil Identité pour préparer votre première séance.",
    ready:
      "Votre première séance est prête",
    open:
      "Ouvrir ma première séance",
    formats:
      "Formats recommandés",
    why:
      "Pourquoi cette direction",
    goalLabel:
      "Objectif",
    primaryDirection:
      "Univers de cette séance",
    savedUniverses:
      "Univers enregistrés",
    firstSession:
      "Résultat choisi",
    editGoal:
      "Modifier l’objectif",
    editUniverses:
      "Modifier les univers",
    editSession:
      "Modifier le résultat",
    saveError:
      "MIRAVA n’a pas pu enregistrer cette étape. Réessayez.",
  },
  es: {
    phases: [
      "Tu estudio",
      "Tu objetivo",
      "Tus universos",
      "Primera sesión",
      "Resultado",
      "Validación",
      "Tu identidad",
      "Activación",
    ],
    step: "Paso",
    back: "Volver",
    saving: "Guardando…",
    start: "Construir mi estudio",
    name:
      "¿Cómo debe llamarte Mirava?",
    placeholder: "Tu nombre",
    promise:
      "Tu estudio fotográfico personal, guiado desde la dirección hasta el primer resultado.",
    objective:
      "¿Qué quieres hacer visible primero?",
    objectiveCta:
      "Elegir mis universos",
    universes:
      "Elige hasta tres universos que te representen.",
    universeHint:
      "Personalizarán tu Studio. Después elegirás el de tu primera sesión.",
    universeLimit:
      "Máximo tres universos. Elimina uno para elegir otro.",
    use:
      "Guardar mis universos",
    primary:
      "¿En qué universo quieres crear primero?",
    primaryHint:
      "Los demás quedan guardados en tu Studio para futuras sesiones.",
    primaryCta:
      "Elegir mi resultado",
    session:
      "¿Qué quieres crear primero?",
    sessionHint:
      "MIRAVA recomienda un formato según tu objetivo, pero la decisión sigue siendo tuya.",
    sessionCta:
      "Componer mi dirección",
    recommended:
      "Recomendado para tu objetivo",
    direction:
      "Tu primera dirección",
    confirm:
      "Confirmar mi sesión",
    identity:
      "Preparemos las fotos que permitirán a Mirava parecerse a ti.",
    photos:
      "3 vistas esenciales · unos 2 minutos",
    privacy:
      "Tus fotos se incorporan a tu Perfil de Identidad privado. Podrás consultarlas, sustituirlas o eliminarlas.",
    processing:
      "El encuadre se analiza en tu dispositivo. Las fotos validadas se utilizan después para tus creaciones Mirava.",
    consent:
      "Tengo al menos 18 años, tengo los derechos sobre estas fotos y acepto su conservación privada. Entiendo que las fotos validadas serán tratadas por la API de OpenAI únicamente cuando solicite una creación MIRAVA.",
    camera:
      "Empezar mis fotos",
    resume:
      "Retomar mis fotos",
    preparing:
      "Termina tu Perfil de Identidad para preparar tu primera sesión.",
    ready:
      "Tu primera sesión está lista",
    open:
      "Abrir mi primera sesión",
    formats:
      "Formatos recomendados",
    why:
      "Por qué esta dirección",
    goalLabel:
      "Objetivo",
    primaryDirection:
      "Universo de esta sesión",
    savedUniverses:
      "Universos guardados",
    firstSession:
      "Resultado elegido",
    editGoal:
      "Modificar el objetivo",
    editUniverses:
      "Modificar los universos",
    editSession:
      "Modificar el resultado",
    saveError:
      "MIRAVA no ha podido guardar este paso. Inténtalo de nuevo.",
  },
} as const

function recommendedSessionForGoal(
  goal: MiravaOnboardingGoal,
): MiravaOnboardingSessionType {
  if (goal === "campaign") {
    return "mini_campaign"
  }

  if (goal === "portfolio") {
    return "portrait_signature"
  }

  return "profile_premium"
}

function formatsForSession(
  sessionType: MiravaOnboardingSessionType,
): MiravaOnboardingFormat[] {
  if (sessionType === "mini_campaign") {
    return [
      "publication",
      "story",
      "banner",
    ]
  }

  if (sessionType === "profile_premium") {
    return [
      "portrait",
      "profile",
    ]
  }

  if (sessionType === "lifestyle_editorial") {
    return [
      "portrait",
      "publication",
    ]
  }

  return [
    "portrait",
    "publication",
    "portfolio",
  ]
}

function directionFor(
  primaryUniverseId: string,
  sessionType: MiravaOnboardingSessionType,
): MiravaOnboardingDirection {
  return {
    primaryUniverseId,
    sessionType,
    recommendedFormats:
      formatsForSession(sessionType),
  }
}

function formatLabel(
  format: MiravaOnboardingFormat,
  locale: Locale,
): string {
  const labels = {
    fr: {
      portrait: "Portrait",
      publication: "Publication",
      profile: "Photo de profil",
      story: "Story",
      banner: "Bannière",
      portfolio: "Portfolio",
    },
    es: {
      portrait: "Retrato",
      publication: "Publicación",
      profile: "Foto de perfil",
      story: "Story",
      banner: "Banner",
      portfolio: "Portfolio",
    },
  } as const

  return labels[locale][format]
}

export function MiravaStudioOnboarding({ locale, firstName, initialUniverseId, initialState, onStartCapture, onCompleted }: { locale: Locale; firstName: string | null; initialUniverseId?: string; initialState: MiravaOnboardingState | null; onStartCapture: (state: MiravaOnboardingState) => void; onCompleted: (state: MiravaOnboardingState, firstName: string) => void }) {
  const labels = COPY[locale]
  const reducedMotion = useReducedMotion()
  const [onboardingState, setOnboardingState] = useState<MiravaOnboardingState | null>(initialState)
  const [stepId, setStepId] = useState<MiravaOnboardingStepId>(initialState?.currentStep ?? "promise_name")
  const [name, setName] = useState(firstName ?? "")
  const [goal, setGoal] =
    useState<
      MiravaOnboardingGoal |
      undefined
    >(initialState?.goal)

  const [universeIds, setUniverseIds] =
    useState<string[]>(
      initialState?.universeIds
        .length
        ? initialState.universeIds
        : initialUniverseId &&
          getMiravaUniverse(
            initialUniverseId,
          )
          ? [initialUniverseId]
          : [],
    )

  const [
    primaryUniverseId,
    setPrimaryUniverseId,
  ] = useState<
    string | undefined
  >(
    initialState
      ?.primaryUniverseId ??
      initialState
        ?.direction
        ?.primaryUniverseId,
  )

  const [
    sessionType,
    setSessionType,
  ] = useState<
    MiravaOnboardingSessionType |
    undefined
  >(
    initialState
      ?.direction
      ?.sessionType,
  )

  const [termsAccepted, setTermsAccepted] = useState(Boolean(initialState?.termsAcceptedAt))
  const [identityConsentAccepted, setIdentityConsentAccepted] = useState(Boolean(initialState?.identityConsentAt))
  const [photosUploaded, setPhotosUploaded] = useState(0)
  const [identityProfileReceipt, setIdentityProfileReceipt] =
    useState<IdentityProfileReceipt | null>(null)
  const [identityPhase, setIdentityPhase] = useState<"intro" | "capture">("intro")
  const [captureActionState, setCaptureActionState] = useState<CaptureActionState | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [universeLimitNotice, setUniverseLimitNotice] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const goalAdvanceTimerRef = useRef<number | null>(null)
  const activationRequestRef = useRef<string | null>(null)
  const step =
    onboardingStepIndex(stepId)

  const direction =
    useMemo(
      () =>
        primaryUniverseId &&
        sessionType
          ? directionFor(
              primaryUniverseId,
              sessionType,
            )
          : undefined,
      [
        primaryUniverseId,
        sessionType,
      ],
    )

  const selectedGoal =
    GOALS[locale].find(
      (item) =>
        item.id === goal,
    )

  const selectedSession =
    SESSION_CHOICES[locale]
      .find(
        (item) =>
          item.id ===
          sessionType,
      )

  const recommendedSessionType =
    goal
      ? recommendedSessionForGoal(
          goal,
        )
      : undefined

  const primaryUniverse =
    getMiravaUniverse(
      primaryUniverseId,
    )

  const selectedUniverses =
    universeIds.flatMap(
      (id) => {
        const universe =
          getMiravaUniverse(id)

        return universe
          ? [universe]
          : []
      },
    )

  const identityProfileReady = Boolean(
    identityProfileReceipt?.id &&
      identityProfileReceipt.assetCount >= MIRAVA_MIN_IDENTITY_PHOTOS &&
      identityProfileReceipt.assetCount <= MIRAVA_MAX_IDENTITY_PHOTOS,
  )

  const activationPreparing =
    stepId === "capture_activation" &&
    identityProfileReady &&
    onboardingState?.status !== "session_ready"

  useEffect(() => {
    setOnboardingState(initialState)
    if (initialState) setStepId(initialState.currentStep)
  }, [initialState])
  useEffect(() => { captureMiravaAnalytics(initialState ? "onboarding_resumed" : "onboarding_started", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: initialState?.currentStep ?? "promise_name" }) }, [initialState])
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    panelRef.current?.focus({ preventScroll: true })
    captureMiravaAnalytics("onboarding_step_viewed", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: stepId })
    if (stepId === "identity_permission") captureMiravaAnalytics("identity_explanation_viewed", { onboarding_version: MIRAVA_ONBOARDING_VERSION })
    // Reset identity phase when navigating away from identity step
    if (stepId !== "identity_permission") setIdentityPhase("intro")
  }, [stepId])
  useEffect(() => () => { if (goalAdvanceTimerRef.current !== null) window.clearTimeout(goalAdvanceTimerRef.current) }, [])

  useEffect(() => {
    if (
      stepId !== "capture_activation" ||
      identityProfileReceipt
    ) {
      return
    }

    let cancelled = false

    const verifyPersistedIdentityProfile = async () => {
      try {
        const response = await fetch(
          "/api/visual-engine/identity-profile",
          {
            method: "GET",
            cache: "no-store",
          },
        )

        const data = await response
          .json()
          .catch(() => null) as
            | IdentityProfileApiResponse
            | null

        const profile = data?.profile

        if (
          !response.ok ||
          !isIdentityProfileReceipt(profile) ||
          profile.assetCount < MIRAVA_MIN_IDENTITY_PHOTOS ||
          profile.assetCount > MIRAVA_MAX_IDENTITY_PHOTOS
        ) {
          throw new Error(
            data?.error ??
              data?.message ??
              "MIRAVA_IDENTITY_PROFILE_NOT_READY",
          )
        }

        if (cancelled) return

        setIdentityProfileReceipt(profile)
        setPhotosUploaded(profile.assetCount)
      } catch {
        if (cancelled) return

        setError(
          locale === "fr"
            ? "Le Profil Identité n’a pas pu être vérifié. Réessayez avant de créer votre séance."
            : "No se pudo verificar el Perfil de Identidad. Inténtalo de nuevo antes de crear tu sesión.",
        )
      }
    }

    void verifyPersistedIdentityProfile()

    return () => {
      cancelled = true
    }
  }, [
    identityProfileReceipt,
    locale,
    stepId,
  ])

  useEffect(() => {
    if (
      stepId !== "capture_activation" ||
      !identityProfileReady ||
      !onboardingState ||
      onboardingState.status === "session_ready"
    ) {
      return
    }

    const requestKey =
      `${onboardingState.updatedAt}:` +
      `${identityProfileReceipt?.updatedAt ?? ""}`

    if (
      activationRequestRef.current ===
      requestKey
    ) {
      return
    }

    activationRequestRef.current = requestKey
    onStartCapture(onboardingState)
  }, [
    identityProfileReady,
    identityProfileReceipt?.updatedAt,
    onStartCapture,
    onboardingState,
    stepId,
  ])

  const persist = async (
    currentStep: MiravaOnboardingStepId,
    overrides: {
      firstName?: string
      goal?: MiravaOnboardingGoal
      universeIds?: string[]
      primaryUniverseId?: string
      direction?: MiravaOnboardingDirection
      termsAccepted?: true
      identityConsentAccepted?: true
      locale?: Locale
    } = {},
  ) => {
    setPending(true)
    setError(null)

    try {
      const response = await fetch(
        "/api/visual-engine/onboarding",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "progress",
            currentStep,
            ...overrides,
          }),
        },
      )

      const data = await response
        .json()
        .catch(() => null) as
          | {
              onboarding?: MiravaOnboardingState
              error?: string
              message?: string
            }
          | null

      if (!response.ok || !data?.onboarding) {
        const reason =
          data?.error ??
          data?.message ??
          "MIRAVA_ONBOARDING_FAILED"

        console.error(
          "[mirava-onboarding] progress_failed",
          {
            currentStep,
            status: response.status,
            reason,
          },
        )

        throw new Error(reason)
      }

      setOnboardingState(data.onboarding)
      setStepId(data.onboarding.currentStep)

      return data.onboarding
    } catch (error) {
      console.error(
        "[mirava-onboarding] persist_failed",
        {
          currentStep,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      )

      setError(labels.saveError)
      return null
    } finally {
      setPending(false)
    }
  }

  const next = async () => {
    if (
      stepId === "promise_name"
    ) {
      const saved =
        await persist(
          "objective",
          {
            firstName:
              name.trim(),
          },
        )

      if (saved) {
        captureMiravaAnalytics(
          "name_saved",
          {
            onboarding_version:
              MIRAVA_ONBOARDING_VERSION,
          },
        )
      }
    } else if (
      stepId === "objective" &&
      goal
    ) {
      if (
        goalAdvanceTimerRef
          .current !== null
      ) {
        window.clearTimeout(
          goalAdvanceTimerRef
            .current,
        )
      }

      await persist(
        "visual_universes",
        {
          goal,
        },
      )
    } else if (
      stepId ===
        "visual_universes" &&
      universeIds.length > 0
    ) {
      await persist(
        "first_universe",
        {
          universeIds,
        },
      )
    } else if (
      stepId ===
        "first_universe" &&
      primaryUniverseId
    ) {
      await persist(
        "session_intent",
        {
          primaryUniverseId,
        },
      )
    } else if (
      stepId ===
        "session_intent" &&
      direction
    ) {
      await persist(
        "direction_review",
        {
          primaryUniverseId:
            direction
              .primaryUniverseId,
          direction,
        },
      )
    } else if (
      stepId ===
        "direction_review" &&
      direction
    ) {
      const saved =
        await persist(
          "identity_permission",
          {
            primaryUniverseId:
              direction
                .primaryUniverseId,
            direction,
          },
        )

      if (saved) {
        captureMiravaAnalytics(
          "direction_confirmed",
          {
            onboarding_version:
              MIRAVA_ONBOARDING_VERSION,
            objective: goal,
            primary_universe_id:
              direction
                .primaryUniverseId,
            session_type:
              direction
                .sessionType,
          },
        )
      }
    } else if (
      stepId ===
        "identity_permission" &&
      identityPhase === "intro" &&
      termsAccepted &&
      identityConsentAccepted
    ) {
      const saved =
        await persist(
          "identity_permission",
          {
            termsAccepted: true,
            identityConsentAccepted: true,
            locale,
          },
        )

      if (!saved) return

      setIdentityPhase(
        "capture",
      )

      captureMiravaAnalytics(
        "identity_consent_accepted",
        {
          onboarding_version:
            MIRAVA_ONBOARDING_VERSION,
        },
      )
    } else if (
      stepId ===
        "capture_activation" &&
      onboardingState?.status ===
        "session_ready"
    ) {
      setPending(true)
      setError(null)

      try {
        const response =
          await fetch(
            "/api/visual-engine/onboarding",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  action:
                    "activate",
                }),
            },
          )

        const data =
          await response
            .json()
            .catch(
              () => ({}),
            ) as {
              onboarding?:
                MiravaOnboardingState
            }

        if (
          !response.ok ||
          !data.onboarding
        ) {
          throw new Error(
            "MIRAVA_ONBOARDING_FAILED",
          )
        }

        captureMiravaAnalytics(
          "onboarding_activated",
          {
            onboarding_version:
              MIRAVA_ONBOARDING_VERSION,
          },
        )

        onCompleted(
          data.onboarding,
          name.trim(),
        )
      } catch {
        setError(
          labels.saveError,
        )
      } finally {
        setPending(false)
      }
    }
  }

  const chooseGoal = (choice: MiravaOnboardingGoal) => {
    setGoal(choice)
    setSessionType(undefined)
    captureMiravaAnalytics("objective_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, objective: choice })
    if (goalAdvanceTimerRef.current !== null) window.clearTimeout(goalAdvanceTimerRef.current)
    goalAdvanceTimerRef.current = window.setTimeout(() => { goalAdvanceTimerRef.current = null; void persist("visual_universes", { goal: choice }) }, 360)
  }

  const goToStep = async (target: MiravaOnboardingStepId) => {
    if (goalAdvanceTimerRef.current !== null) {
      window.clearTimeout(goalAdvanceTimerRef.current)
      goalAdvanceTimerRef.current = null
    }
    await persist(target)
  }

  const back = async () => {
    captureMiravaAnalytics("onboarding_back_clicked", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: stepId })
    // Une fois le Profil identité enregistré, l'activation devient un
    // parcours linéaire : ne jamais retourner vers une capture vide.
    if (
      stepId === "capture_activation" &&
      identityProfileReady
    ) {
      return
    }

    // On capture phase: go back to intro phase, not to previous step
    if (stepId === "identity_permission" && identityPhase === "capture") {
      setIdentityPhase("intro")
      return
    }
    const target = MIRAVA_ONBOARDING_STEPS[Math.max(0, step - 1)]
    await goToStep(target)
  }

  const toggleUniverse =
    (id: string) =>
      setUniverseIds(
        (current) => {
          if (
            current.includes(id)
          ) {
            setUniverseLimitNotice(
              null,
            )

            if (
              primaryUniverseId ===
                id
            ) {
              setPrimaryUniverseId(
                undefined,
              )
              setSessionType(
                undefined,
              )
            }

            captureMiravaAnalytics(
              "universe_selected",
              {
                onboarding_version:
                  MIRAVA_ONBOARDING_VERSION,
                universe_id: id,
                selected: false,
              },
            )

            return current
              .filter(
                (value) =>
                  value !== id,
              )
          }

          if (
            current.length >= 3
          ) {
            setUniverseLimitNotice(
              labels.universeLimit,
            )

            return current
          }

          setUniverseLimitNotice(
            null,
          )

          captureMiravaAnalytics(
            "universe_selected",
            {
              onboarding_version:
                MIRAVA_ONBOARDING_VERSION,
              universe_id: id,
              selected: true,
            },
          )

          return [
            ...current,
            id,
          ]
        },
      )

  // identity_permission intro: need consent. capture phase: dock has no CTA (capture handles it)
  const canContinue =
    stepId === "promise_name"
      ? Boolean(name.trim())
      : stepId === "objective"
      ? Boolean(goal)
      : stepId === "visual_universes"
      ? universeIds.length > 0
      : stepId === "first_universe"
      ? Boolean(primaryUniverseId)
      : stepId === "session_intent"
      ? Boolean(sessionType)
      : stepId === "direction_review"
      ? Boolean(direction)
      : stepId === "identity_permission"
      ? termsAccepted && identityConsentAccepted
      : stepId === "capture_activation"
      ? onboardingState?.status ===
        "session_ready"
      : true

  return (
    <section lang={locale} className="mirava-studio-onboarding-v3">
      <MiravaMobileShell>
        {/* Progress Header */}
        <MobileProgressHeader
          step={step}
          totalSteps={8}
          locale={locale}
          onBack={() => void back()}
          canGoBack={step > 0 && !pending}
        />

        {/* Accessibility Progress Bar Metadata Contract */}
        <div className="sr-only" role="progressbar" aria-valuemin={1} aria-valuemax={8} aria-valuenow={step + 1}>
          <motion.span animate={{ width: `${((step + 1) / 8) * 100}%` }} />
        </div>

        {/* Animated Step Panel */}
        <div className="flex-1 pb-8">
          <AnimatePresence mode="wait">
            <motion.div ref={panelRef} key={stepId} tabIndex={-1} className="mirava-onboarding-step-panel outline-none" initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              {/* STEP 1: PROMISE NAME / STUDIO PERSONNEL */}
              {stepId === "promise_name" && (
                <div className="space-y-6 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / STUDIO PERSONNEL
                    </span>
                    <h1 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl leading-[1.12]">
                      {labels.promise}
                    </h1>
                  </div>

                  {/* Input Card */}
                  <div className="rounded-[22px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                    <label className="block">
                      <span className="block font-jakarta text-xs font-semibold tracking-wider text-white/70 uppercase">
                        {labels.name}
                      </span>
                      <input
                        autoFocus autoComplete="given-name"
                        value={name}
                        maxLength={48}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={labels.placeholder}
                        className="mt-3 w-full rounded-xl border border-white/20 bg-white px-4 py-3.5 font-jakarta text-lg font-semibold text-black placeholder-neutral-400 shadow-md transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ede8df]"
                      />
                    </label>
                  </div>

                  {/* Gold Standard App-Native Animated Pipeline Demo */}
                  <div className="pt-1 sm:pt-2">
                    <OnboardingPipelineDemo locale={locale} />
                  </div>
                </div>
              )}

              {/* STEP 2: OBJECTIVE */}
              {stepId === "objective" && (
                <div className="space-y-6 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / OBJECTIF
                    </span>
                    <h1 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl leading-[1.12]">
                      {labels.objective}
                    </h1>
                  </div>

                  {/* Goal Cards */}
                  <div className="space-y-3.5">
                    {GOALS[locale].map((item) => (
                      <MiravaSelectionCard
                        key={item.id}
                        title={item.title}
                        subtitle={`${item.session} · ${item.reason}`}
                        selected={goal === item.id}
                        onClick={() => void chooseGoal(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: VISUAL UNIVERSES */}
              {stepId === "visual_universes" && (
                <div className="space-y-5 pt-2 sm:pt-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                        VOS UNIVERS
                      </span>
                      <h1 className="mt-2 font-jakarta text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                        {labels.universes}
                      </h1>
                      <p className="mt-2 max-w-md font-jakarta text-xs leading-5 text-white/55">
                        {labels.universeHint}
                      </p>
                    </div>
                    <div className="mirava-onboarding-selection rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-jakarta text-xs font-bold tabular-nums text-[#ede8df]">
                      {locale === "fr" ? `${universeIds.length} sur 3 univers` : `${universeIds.length} de 3 universos`}
                    </div>
                  </div>

                  {/* Universe Limit Notice */}
                  {universeLimitNotice && <p className="mirava-form-error rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200" role="status">{universeLimitNotice}</p>}

                  {/* Universe Cards Grid (Inner scroll container expanding to bottom dock) */}
                  <div className="max-h-[calc(100dvh-240px)] overflow-y-auto pr-1 no-scrollbar space-y-3 pb-28">
                    <UniverseGrid>
                      {MIRAVA_UNIVERSES.map((universe) => (
                        <UniverseCard
                          key={universe.id}
                          universe={universe}
                          selected={universeIds.includes(universe.id)}
                          locale={locale}
                          onToggle={() => toggleUniverse(universe.id)}
                        />
                      ))}
                    </UniverseGrid>
                  </div>
                </div>
              )}

              {/* STEP 4: FIRST SESSION UNIVERSE */}
              {stepId === "first_universe" && (
                <div className="space-y-5 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / PREMIÈRE SÉANCE
                    </span>
                    <h1 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl leading-[1.12]">
                      {labels.primary}
                    </h1>
                    <p className="mt-3 font-jakarta text-sm leading-6 text-white/58">
                      {labels.primaryHint}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedUniverses.map(
                      (universe) => (
                        <button
                          key={universe.id}
                          type="button"
                          aria-pressed={
                            primaryUniverseId ===
                            universe.id
                          }
                          onClick={() => {
                            setPrimaryUniverseId(
                              universe.id,
                            )
                            setSessionType(
                              undefined,
                            )
                            captureMiravaAnalytics(
                              "first_universe_selected",
                              {
                                onboarding_version:
                                  MIRAVA_ONBOARDING_VERSION,
                                universe_id:
                                  universe.id,
                              },
                            )
                          }}
                          className={cn(
                            "flex w-full items-center gap-4 overflow-hidden rounded-[22px] border p-3 text-left transition-all",
                            primaryUniverseId ===
                              universe.id
                              ? "border-[#ede8df]/70 bg-white/15 shadow-xl"
                              : "border-white/12 bg-white/[0.06]",
                          )}
                        >
                          <img
                            src={universe.image}
                            alt=""
                            className="h-20 w-16 shrink-0 rounded-xl object-cover"
                          />
                          <span className="min-w-0 flex-1">
                            <strong className="block font-jakarta text-base font-semibold text-white">
                              {universe.name[locale]}
                            </strong>
                            <span className="mt-1 block font-jakarta text-xs leading-5 text-white/55">
                              {universe.tagline[locale]}
                            </span>
                          </span>
                          {primaryUniverseId ===
                          universe.id ? (
                            <Check className="h-5 w-5 shrink-0 text-[#ede8df]" />
                          ) : null}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: SESSION INTENT */}
              {stepId === "session_intent" && (
                <div className="space-y-6 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / RÉSULTAT
                    </span>
                    <h1 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl leading-[1.12]">
                      {labels.session}
                    </h1>
                    <p className="mt-3 font-jakarta text-sm leading-6 text-white/58">
                      {labels.sessionHint}
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {SESSION_CHOICES[locale].map(
                      (item) => {
                        const recommended =
                          item.id ===
                          recommendedSessionType

                        return (
                          <MiravaSelectionCard
                            key={item.id}
                            title={item.title}
                            subtitle={
                              recommended
                                ? `${labels.recommended} · ${item.reason}`
                                : item.reason
                            }
                            selected={
                              sessionType ===
                              item.id
                            }
                            onClick={() => {
                              setSessionType(
                                item.id,
                              )
                              captureMiravaAnalytics(
                                "session_type_selected",
                                {
                                  onboarding_version:
                                    MIRAVA_ONBOARDING_VERSION,
                                  session_type:
                                    item.id,
                                  recommended,
                                },
                              )
                            }}
                          />
                        )
                      },
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: DIRECTION REVIEW */}
              {stepId === "direction_review" && direction && (
                <div className="space-y-6 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / DIRECTION
                    </span>
                    <h1 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl leading-[1.12]">
                      {labels.direction}, {name.trim()}.
                    </h1>
                  </div>

                  {/* Direction Hero & Summary Card */}
                  <div className="overflow-hidden rounded-[24px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
                    {/* Clean photo frame without text overlays covering the face */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                      {primaryUniverse && (
                        <img src={primaryUniverse.image} alt={primaryUniverse.name[locale]} className="h-full w-full object-cover object-top" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>

                    {/* Universe Title & Eyebrow below photo */}
                    <div className="border-b border-white/10 px-5 pt-4 pb-3 flex items-center justify-between">
                      <strong className="font-jakarta text-base font-semibold text-white">
                        {primaryUniverse?.name[locale]}
                      </strong>
                      <span className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-jakarta text-[10px] font-bold tracking-wider text-[#ede8df] uppercase">
                        {primaryUniverse?.eyebrow[locale]}
                      </span>
                    </div>

                    <div className="divide-y divide-white/10 p-5 pt-3 font-jakarta text-xs">
                      <div className="pb-3 flex justify-between items-center">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">{labels.goalLabel}</span>
                        <span className="font-semibold text-white text-sm">{selectedGoal?.title}</span>
                      </div>
                      <div className="py-3 flex justify-between items-center">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">{labels.primaryDirection}</span>
                        <span className="font-semibold text-white text-sm">{primaryUniverse?.name[locale]}</span>
                      </div>
                      <div className="py-3 flex justify-between items-center gap-5">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">
                          {labels.savedUniverses}
                        </span>
                        <span className="font-medium text-white/80 text-right">
                          {selectedUniverses
                            .map(
                              (universe) =>
                                universe.name[locale],
                            )
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="py-3 flex justify-between items-center">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">{labels.firstSession}</span>
                        <span className="font-semibold text-[#ede8df] text-sm">{selectedSession?.title}</span>
                      </div>
                      <div className="py-3 flex justify-between items-center">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">{labels.formats}</span>
                        <span className="font-medium text-white/80 text-right">{direction.recommendedFormats.map((format) => formatLabel(format, locale)).join(" · ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d5c6b0]/25 bg-[#d5c6b0]/10 p-4 font-jakarta text-xs leading-5 text-white/72">
                    {locale === "fr"
                      ? "MIRAVA crée l’aperçu personnalisé de votre première image. Après sa génération, vous pourrez débloquer le fichier haute qualité et deux créations supplémentaires pour 2,99 € TTC, paiement unique et sans abonnement."
                      : "MIRAVA crea la vista previa personalizada de tu primera imagen. Después de generarla, podrás desbloquear el archivo en alta calidad y dos creaciones adicionales por 2,99 € IVA incluido, pago único y sin suscripción."}
                  </div>

                  {/* Edit Links */}
                  <div className="flex items-center justify-center gap-6 font-jakarta text-xs font-medium text-white/60">
                    <button onClick={() => void goToStep("objective")} className="underline underline-offset-4 transition-colors hover:text-white">
                      {labels.editGoal}
                    </button>
                    <span>·</span>
                    <button onClick={() => void goToStep("visual_universes")} className="underline underline-offset-4 transition-colors hover:text-white">
                      {labels.editUniverses}
                    </button>
                    <span>·</span>
                    <button onClick={() => void goToStep("session_intent")} className="underline underline-offset-4 transition-colors hover:text-white">
                      {labels.editSession}
                    </button>
                  </div>
                </div>
              )}
              {/* STEP 7A: AGREEMENT — one validation */}
              {stepId === "identity_permission" &&
                identityPhase === "intro" && (
                <div className="space-y-5 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / ACCORD & IDENTITÉ
                    </span>

                    <h1 className="mt-3 font-jakarta text-2xl font-semibold leading-[1.15] tracking-[-0.04em] text-white sm:text-3xl">
                      {locale === "fr"
                        ? "Une seule validation, puis vous gardez le contrôle."
                        : "Una sola validación y tú mantienes el control."}
                    </h1>

                    <p className="mt-3 font-jakarta text-sm leading-6 text-white/58">
                      {locale === "fr"
                        ? "Tous les points sont regroupés ci-dessous. Vous pouvez les parcourir, puis les accepter en une seule fois."
                        : "Todos los puntos están reunidos a continuación. Puedes revisarlos y aceptarlos una sola vez."}
                    </p>
                  </div>

                  <section className="overflow-hidden rounded-[22px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                      <LockKeyhole className="h-4 w-4 shrink-0 text-[#ede8df]" />

                      <h2 className="font-jakarta text-sm font-semibold text-white">
                        {locale === "fr"
                          ? "Conditions d’utilisation de vos images"
                          : "Condiciones de uso de tus imágenes"}
                      </h2>
                    </div>

                    <div
                      tabIndex={0}
                      aria-label={
                        locale === "fr"
                          ? "Conditions d’utilisation de vos images"
                          : "Condiciones de uso de tus imágenes"
                      }
                      className="max-h-56 space-y-4 overflow-y-auto px-4 py-4 pr-3"
                    >
                      {LEGAL_POINTS[locale].map(
                        (item, index) => (
                          <article
                            key={item.title}
                            className="border-b border-white/8 pb-4 last:border-b-0 last:pb-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 font-jakarta text-[10px] font-semibold text-white/60">
                                {index + 1}
                              </span>

                              <h3 className="font-jakarta text-xs font-semibold text-white">
                                {item.title}
                              </h3>
                            </div>

                            <p className="mt-2 pl-8 font-jakarta text-xs leading-5 text-white/62">
                              {item.body}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                  </section>

                  <div className="space-y-3">
                    <MiravaCustomCheckbox
                      checked={termsAccepted}
                      onChange={setTermsAccepted}
                      label={
                        locale === "fr"
                          ? "J’accepte les Conditions d’utilisation de MIRAVA et je confirme être majeure ainsi que disposer des droits nécessaires sur les images envoyées."
                          : "Acepto las Condiciones de uso de MIRAVA y confirmo ser mayor de edad y disponer de los derechos necesarios sobre las imágenes enviadas."
                      }
                    />

                    <MiravaCustomCheckbox
                      checked={identityConsentAccepted}
                      onChange={setIdentityConsentAccepted}
                      label={
                        locale === "fr"
                          ? "Je consens explicitement au traitement de mes photos de visage et de mon Profil identité par MIRAVA et ses prestataires techniques, dont OpenAI, uniquement pour les créations que je demande."
                          : "Consiento explícitamente el tratamiento de mis fotos faciales y de mi Perfil de identidad por MIRAVA y sus proveedores técnicos, incluido OpenAI, únicamente para las creaciones que solicito."
                      }
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

                    <p className="font-jakarta text-xs leading-5 text-white/68">
                      {locale === "fr"
                        ? "Cet accord est enregistré avec votre onboarding. Il ne sera pas redemandé avant chaque création."
                        : "Este acuerdo queda registrado con tu onboarding. No volverá a solicitarse antes de cada creación."}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 7B: IDENTITY CAPTURE — photo slots only (identityPhase = "capture") */}
              {stepId === "identity_permission" && identityPhase === "capture" && (
                <div className="pt-2 sm:pt-3">
                  <MiravaIdentityCapture
                    inline={true}
                    locale={locale}
                    initialConsentAccepted={identityConsentAccepted}
                    onClose={() => {}}
                    onActionStateChange={setCaptureActionState}
                    onComplete={async (files, consent) => {
                      if (
                        files.length < MIRAVA_MIN_IDENTITY_PHOTOS ||
                        files.length > MIRAVA_MAX_IDENTITY_PHOTOS
                      ) {
                        throw new Error(
                          locale === "fr"
                            ? "Entre trois et dix photos validées sont nécessaires pour enregistrer le Profil Identité."
                            : "Se necesitan entre tres y diez fotos validadas para guardar el Perfil de Identidad.",
                        )
                      }

                      setPending(true)

                      try {
                        const profile =
                          await uploadMiravaIdentityProfile({
                            files,
                            consent,
                            locale,
                          })

                        if (
                          !isIdentityProfileReceipt(profile) ||
                          profile.assetCount !== files.length ||
                          profile.assetCount < MIRAVA_MIN_IDENTITY_PHOTOS ||
                          profile.assetCount > MIRAVA_MAX_IDENTITY_PHOTOS
                        ) {
                          throw new Error(
                            locale === "fr"
                              ? "Le Profil Identité n’a pas été enregistré complètement. Aucune séance n’a été lancée."
                              : "El Perfil de Identidad no se guardó completamente. No se inició ninguna sesión.",
                          )
                        }

                        if (
                          !goal ||
                          universeIds.length === 0 ||
                          !direction
                        ) {
                          throw new Error(
                            locale === "fr"
                              ? "Vos choix d’onboarding sont incomplets. Revenez à l’étape précédente avant de finaliser votre Profil Identité."
                              : "Tus elecciones de onboarding están incompletas. Vuelve al paso anterior antes de finalizar tu Perfil de Identidad.",
                          )
                        }

                        const saved = await persist(
                          "capture_activation",
                          {
                            goal,
                            universeIds,
                            primaryUniverseId:
                              direction.primaryUniverseId,
                            direction,
                            identityConsentAccepted: true,
                          },
                        )

                        if (!saved) {
                          throw new Error(
                            locale === "fr"
                              ? "Vos photos ont été enregistrées, mais MIRAVA n’a pas pu finaliser l’onboarding. Réessayez."
                              : "Tus fotos se guardaron, pero MIRAVA no pudo finalizar el onboarding. Inténtalo de nuevo.",
                          )
                        }

                        setIdentityProfileReceipt(profile)
                        setPhotosUploaded(profile.assetCount)

                        captureMiravaAnalytics(
                          "identity_profile_persisted",
                          {
                            onboarding_version:
                              MIRAVA_ONBOARDING_VERSION,
                            identity_profile_id: profile.id,
                            asset_count: profile.assetCount,
                          },
                        )

                        // La préparation de la séance est déclenchée
                        // automatiquement par l'effet d'activation.
                      } finally {
                        setPending(false)
                      }
                    }}
                  />
                </div>
              )}

              {/* STEP 6: CAPTURE ACTIVATION */}
              {stepId === "capture_activation" && (
                <div className="space-y-5 pt-3">
                  <div className="text-center">
                    <div
                      className={cn(
                        "mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border bg-white/10 shadow-xl backdrop-blur-xl",
                        onboardingState?.status === "session_ready"
                          ? "border-emerald-400/40"
                          : "border-[#ede8df]/25",
                      )}
                    >
                      <Sparkles
                        className={cn(
                          "h-7 w-7 text-[#ede8df]",
                          activationPreparing &&
                            "animate-pulse",
                        )}
                      />
                    </div>

                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / ACTIVATION
                    </span>

                    <h1 className="mt-3 font-jakarta text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-3xl">
                      {onboardingState?.status ===
                      "session_ready"
                        ? `${labels.ready}, ${name.trim()}.`
                        : identityProfileReady
                        ? locale === "fr"
                          ? "Votre identité est enregistrée."
                          : "Tu identidad está guardada."
                        : locale === "fr"
                        ? "Vérification de votre identité…"
                        : "Verificando tu identidad…"}
                    </h1>

                    <p className="mx-auto mt-3 max-w-sm font-jakarta text-sm leading-relaxed text-white/60">
                      {onboardingState?.status ===
                      "session_ready"
                        ? locale === "fr"
                          ? "Votre Profil Identité et votre direction sont prêts. Ouvrez maintenant votre première séance."
                          : "Tu Perfil de Identidad y tu dirección están listos. Abre ahora tu primera sesión."
                        : identityProfileReady
                        ? locale === "fr"
                          ? "MIRAVA prépare votre première séance à partir de votre direction et de vos références privées."
                          : "MIRAVA prepara tu primera sesión a partir de tu dirección y de tus referencias privadas."
                        : locale === "fr"
                        ? "Confirmation de l’enregistrement privé en cours."
                        : "Confirmando el almacenamiento privado."}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/15 bg-black/20 p-5 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                        <Check className="h-4 w-4 stroke-[3] text-emerald-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <strong className="block font-jakarta text-sm font-semibold text-white">
                          {identityProfileReady
                            ? locale === "fr"
                              ? `${photosUploaded} photo${photosUploaded > 1 ? "s" : ""} privée${photosUploaded > 1 ? "s" : ""} enregistrée${photosUploaded > 1 ? "s" : ""}`
                              : `${photosUploaded} foto${photosUploaded > 1 ? "s" : ""} privada${photosUploaded > 1 ? "s" : ""} guardada${photosUploaded > 1 ? "s" : ""}`
                            : locale === "fr"
                            ? "Profil Identité privé"
                            : "Perfil de Identidad privado"}
                        </strong>

                        <span className="mt-1 block font-jakarta text-xs leading-relaxed text-white/50">
                          {locale === "fr"
                            ? "Aucune vue n’est déduite ou inventée : seules les photos réellement enregistrées sont utilisées."
                            : "No se deduce ni se inventa ninguna vista: solo se utilizan las fotos realmente guardadas."}
                        </span>
                      </div>

                      <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-jakarta text-[9px] font-bold tracking-wider text-white/60">
                        PRIVÉ
                      </span>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-white/10 pt-4 font-jakarta text-xs">
                      <div className="flex items-center gap-2.5 text-white/75">
                        <Check className="h-4 w-4 stroke-[3] text-emerald-400" />
                        <span>
                          {locale === "fr"
                            ? "Direction artistique confirmée"
                            : "Dirección artística confirmada"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-white/75">
                        {onboardingState?.status ===
                        "session_ready" ? (
                          <Check className="h-4 w-4 stroke-[3] text-emerald-400" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-[#d5c6b0]" />
                        )}

                        <span>
                          {onboardingState?.status ===
                          "session_ready"
                            ? locale === "fr"
                              ? "Première séance prête"
                              : "Primera sesión lista"
                            : locale === "fr"
                            ? "Préparation de la première séance"
                            : "Preparando la primera sesión"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {onboardingState?.status ===
                    "session_ready" &&
                    direction && (
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left font-jakarta text-xs backdrop-blur-xl">
                        <span className="block text-[10px] font-semibold tracking-wider text-[#d5c6b0] uppercase">
                          {locale === "fr"
                            ? "Première séance configurée"
                            : "Primera sesión configurada"}
                        </span>

                        <strong className="mt-1 block text-sm font-semibold text-white">
                          {selectedSession?.title} —{" "}
                          {primaryUniverse?.name[locale]}
                        </strong>
                      </div>
                    )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Error Notification */}
        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Action Bar — always visible. Pinned to bottom with safe area insets */}
        <footer className="mirava-floating-action-frame fixed bottom-0 left-0 right-0 z-40 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={24}
            brightness={45}
            opacity={0.95}
            blur={14}
            backgroundOpacity={0.15}
            className="mirava-floating-action-glass mirava-onboarding-v3-actions mx-auto w-full min-w-0 max-w-md overflow-hidden px-1.5 py-1 shadow-[0_12px_30px_rgba(0,0,0,0.48)] sm:max-w-xl pointer-events-auto"
          >
            <div className="flex w-full min-w-0 items-center gap-3">
              <button
                onClick={() => void back()}
                disabled={
                  step === 0 ||
                  pending ||
                  stepId === "capture_activation"
                }
                aria-label={labels.back}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">{labels.back}</span>
              </button>

              {/* Action Button: uses captureActionState during capture phase, otherwise standard next step button */}
              {stepId === "identity_permission" && identityPhase === "capture" && captureActionState ? (
                <div className="min-w-0 flex-1 space-y-1.5">
                  <button
                    type="button"
                    onClick={captureActionState.onClick}
                    disabled={captureActionState.disabled || pending}
                    className="group flex min-h-[52px] w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#ede8df] px-4 font-jakarta text-sm font-semibold text-[#0d0e0e] shadow-[0_4px_20px_rgba(237,232,223,0.15)] transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#2c2d2e] disabled:text-white/30 disabled:shadow-none is-primary"
                  >
                    {captureActionState.icon === "upload" && (
                      <Upload className="h-4 w-4 shrink-0" />
                    )}

                    {captureActionState.icon === "loading" && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    )}

                    <span className="min-w-0 truncate text-center">
                      {captureActionState.label}
                    </span>

                    {captureActionState.icon === "next" && (
                      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>

                  {captureActionState.secondaryAction && (
                    <button
                      type="button"
                      onClick={captureActionState.secondaryAction.onClick}
                      disabled={pending}
                      className="flex min-h-[34px] w-full min-w-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 font-jakarta text-[11px] font-semibold text-white/75 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <span className="min-w-0 truncate">
                        {captureActionState.secondaryAction.label}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => void next()}
                  disabled={!canContinue || pending}
                  className="group flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#ede8df] px-4 font-jakarta text-sm font-semibold text-[#0d0e0e] shadow-[0_4px_20px_rgba(237,232,223,0.15)] transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#2c2d2e] disabled:text-white/30 disabled:shadow-none is-primary"
                >
                  <span className="min-w-0 truncate">
                    {pending
                      ? labels.saving
                      : stepId === "promise_name"
                      ? labels.start
                      : stepId === "objective"
                      ? labels.objectiveCta
                      : stepId === "visual_universes"
                      ? labels.use
                      : stepId === "first_universe"
                      ? labels.primaryCta
                      : stepId === "session_intent"
                      ? labels.sessionCta
                      : stepId === "direction_review"
                      ? labels.confirm
                      : stepId === "identity_permission" &&
                        identityPhase === "intro"
                      ? labels.camera
                      : stepId === "capture_activation" &&
                        onboardingState?.status !==
                          "session_ready"
                      ? locale === "fr"
                        ? "Préparation de ma séance…"
                        : "Preparando mi sesión…"
                      : onboardingState?.status ===
                        "session_ready"
                      ? labels.open
                      : labels.resume}
                  </span>
                  {stepId === "capture_activation" &&
                  onboardingState?.status !==
                    "session_ready" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              )}
            </div>
          </GlassSurface>
        </footer>
      </MiravaMobileShell>
    </section>
  )
}
