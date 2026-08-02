"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { GlassSurface } from "@/components/ui/glass-surface"
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, LockKeyhole, ShieldCheck, Sparkles, UserCheck } from "lucide-react"
import posthog from "posthog-js"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { MIRAVA_ONBOARDING_STEPS, MIRAVA_ONBOARDING_VERSION, onboardingStepIndex, type MiravaOnboardingDirection, type MiravaOnboardingGoal, type MiravaOnboardingState, type MiravaOnboardingStepId } from "@/lib/mirava/onboarding"
import { MIRAVA_UNIVERSES, getMiravaUniverse } from "@/lib/mirava/universes"
import { cn } from "@/lib/utils"
import {
  MiravaMobileShell,
  MobileProgressHeader,
  MiravaSelectionCard,
  MiravaCustomCheckbox,
  UniverseCard,
  UniverseGrid,
} from "./mirava-mobile-primitives"
import MiravaIdentityCapture, { PHOTO_SLOTS } from "./mirava-identity-capture"

type Locale = "fr" | "es"
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

const COPY = {
  fr: { phases: ["Votre studio", "Votre objectif", "Vos univers", "Votre direction", "Votre identité", "Activation"], step: "Étape", back: "Retour", saving: "Enregistrement…", start: "Construire mon studio", name: "Comment Mirava doit-elle vous appeler ?", placeholder: "Votre prénom", promise: "Votre studio photo personnel, guidé de la direction au premier résultat.", objective: "Que voulez-vous rendre visible en premier ?", objectiveCta: "Choisir mes univers", universes: "Choisissez jusqu’à trois univers.", universeLimit: "Trois univers maximum. Retirez-en un pour en choisir un autre.", use: "Utiliser ces univers", direction: "Votre première direction", confirm: "Confirmer ma direction", identity: "Préparons les photos qui permettront à Mirava de vous ressembler.", photos: "3 vues essentielles · environ 2 minutes", privacy: "Vos photos rejoignent votre Profil Identité privé. Vous pourrez les consulter, les remplacer ou les supprimer.", processing: "Le cadrage est analysé sur votre appareil. Les photos validées sont ensuite utilisées pour vos créations Mirava.", consent: "J’ai au moins 18 ans, j’ai les droits sur ces photos et j’accepte leur conservation privée. Je comprends que les photos validées seront traitées par l’API OpenAI uniquement lorsque je demande une création MIRAVA.", camera: "Commencer mes photos", resume: "Reprendre mes photos", preparing: "Terminez votre Profil Identité pour préparer votre première séance.", ready: "Votre première séance est prête", open: "Ouvrir ma première séance", formats: "Formats recommandés", why: "Pourquoi cette direction", goalLabel: "Objectif", primaryDirection: "Direction dominante", firstSession: "Première séance", editGoal: "Modifier l’objectif", editUniverses: "Modifier les univers", saveError: "MIRAVA n’a pas pu enregistrer cette étape. Réessayez." },
  es: { phases: ["Tu estudio", "Tu objetivo", "Tus universos", "Tu dirección", "Tu identidad", "Activación"], step: "Paso", back: "Volver", saving: "Guardando…", start: "Construir mi estudio", name: "¿Cómo debe llamarte Mirava?", placeholder: "Tu nombre", promise: "Tu estudio fotográfico personal, guiado desde la dirección hasta el primer resultado.", objective: "¿Qué quieres hacer visible primero?", objectiveCta: "Elegir mis universos", universes: "Elige hasta tres universos.", universeLimit: "Máximo tres universos. Elimina uno para elegir otro.", use: "Usar estos universos", direction: "Tu primera dirección", confirm: "Confirmar mi dirección", identity: "Preparemos las fotos que permitirán a Mirava parecerse a ti.", photos: "3 vistas esenciales · unos 2 minutos", privacy: "Tus fotos se incorporan a tu Perfil de Identidad privado. Podrás consultarlas, sustituirlas o eliminarlas.", processing: "El encuadre se analiza en tu dispositivo. Las fotos validadas se utilizan después para tus creaciones Mirava.", consent: "Tengo al menos 18 años, tengo los derechos sobre estas fotos y acepto su conservación privada. Entiendo que las fotos validadas serán tratadas por la API de OpenAI únicamente cuando solicite una creación MIRAVA.", camera: "Empezar mis fotos", resume: "Retomar mis fotos", preparing: "Termina tu Perfil de Identidad para preparar tu primera sesión.", ready: "Tu primera sesión está lista", open: "Abrir mi primera sesión", formats: "Formatos recomendados", why: "Por qué esta dirección", goalLabel: "Objetivo", primaryDirection: "Dirección dominante", firstSession: "Primera sesión", editGoal: "Modificar el objetivo", editUniverses: "Modificar los universos", saveError: "MIRAVA no ha podido guardar este paso. Inténtalo de nuevo." },
} as const

function directionFor(goal: MiravaOnboardingGoal, universeIds: string[], locale: Locale): MiravaOnboardingDirection {
  const primaryUniverseId = universeIds[0]
  if (!primaryUniverseId) throw new Error("MIRAVA_DIRECTION_REQUIRES_UNIVERSE")
  if (goal === "campaign") return { primaryUniverseId, sessionType: "campaign_series", recommendedFormats: locale === "fr" ? ["Publication", "Story", "Bannière"] : ["Publicación", "Story", "Banner"] }
  if (goal === "portfolio") return { primaryUniverseId, sessionType: "signature_series", recommendedFormats: locale === "fr" ? ["Portrait", "Portfolio", "Bannière"] : ["Retrato", "Portfolio", "Banner"] }
  return { primaryUniverseId, sessionType: "portrait_editorial", recommendedFormats: locale === "fr" ? ["Portrait", "Publication", "Photo de profil"] : ["Retrato", "Publicación", "Foto de perfil"] }
}

export function MiravaStudioOnboarding({ locale, firstName, initialUniverseId, initialState, onStartCapture, onCompleted }: { locale: Locale; firstName: string | null; initialUniverseId?: string; initialState: MiravaOnboardingState | null; onStartCapture: (state: MiravaOnboardingState) => void; onCompleted: (state: MiravaOnboardingState, firstName: string) => void }) {
  const labels = COPY[locale]
  const reducedMotion = useReducedMotion()
  const [onboardingState, setOnboardingState] = useState<MiravaOnboardingState | null>(initialState)
  const [stepId, setStepId] = useState<MiravaOnboardingStepId>(initialState?.currentStep ?? "promise_name")
  const [name, setName] = useState(firstName ?? "")
  const [goal, setGoal] = useState<MiravaOnboardingGoal | undefined>(initialState?.goal)
  const [universeIds, setUniverseIds] = useState<string[]>(initialState?.universeIds.length ? initialState.universeIds : initialUniverseId && getMiravaUniverse(initialUniverseId) ? [initialUniverseId] : [])
  const [identityConsentAccepted, setIdentityConsentAccepted] = useState(Boolean(initialState?.identityConsentAt))
  const [photosUploaded, setPhotosUploaded] = useState(0)
  const [identityPhase, setIdentityPhase] = useState<"intro" | "capture">("intro")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [universeLimitNotice, setUniverseLimitNotice] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const goalAdvanceTimerRef = useRef<number | null>(null)
  const step = onboardingStepIndex(stepId)
  const direction = useMemo(() => goal && universeIds.length ? directionFor(goal, universeIds, locale) : undefined, [goal, locale, universeIds])
  const selectedGoal = GOALS[locale].find((item) => item.id === goal)
  const primaryUniverse = getMiravaUniverse(direction?.primaryUniverseId)

  useEffect(() => {
    setOnboardingState(initialState)
    if (initialState) setStepId(initialState.currentStep)
  }, [initialState])
  useEffect(() => { posthog.capture(initialState ? "onboarding_resumed" : "onboarding_started", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: initialState?.currentStep ?? "promise_name" }) }, [initialState])
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    panelRef.current?.focus({ preventScroll: true })
    posthog.capture("onboarding_step_viewed", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: stepId })
    if (stepId === "identity_permission") posthog.capture("identity_explanation_viewed", { onboarding_version: MIRAVA_ONBOARDING_VERSION })
    // Reset identity phase when navigating away from identity step
    if (stepId !== "identity_permission") setIdentityPhase("intro")
  }, [stepId])
  useEffect(() => () => { if (goalAdvanceTimerRef.current !== null) window.clearTimeout(goalAdvanceTimerRef.current) }, [])

  const persist = async (currentStep: MiravaOnboardingStepId, overrides: { firstName?: string; goal?: MiravaOnboardingGoal; universeIds?: string[]; direction?: MiravaOnboardingDirection; identityConsentAccepted?: true } = {}) => {
    setPending(true); setError(null)
    try {
      const response = await fetch("/api/visual-engine/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", currentStep, ...overrides }) })
      const data = await response.json() as { onboarding?: MiravaOnboardingState; error?: string }
      if (!response.ok || !data.onboarding) throw new Error(data.error ?? "MIRAVA_ONBOARDING_FAILED")
      setOnboardingState(data.onboarding)
      setStepId(data.onboarding.currentStep)
      return data.onboarding
    } catch { setError(labels.saveError); return null } finally { setPending(false) }
  }

  const next = async () => {
    if (stepId === "promise_name") { const saved = await persist("objective", { firstName: name.trim() }); if (saved) posthog.capture("name_saved", { onboarding_version: MIRAVA_ONBOARDING_VERSION }) }
    else if (stepId === "objective" && goal) { if (goalAdvanceTimerRef.current !== null) window.clearTimeout(goalAdvanceTimerRef.current); await persist("visual_universes", { goal }) }
    else if (stepId === "visual_universes" && direction) await persist("direction_review", { universeIds, direction })
    else if (stepId === "direction_review" && direction) { const saved = await persist("identity_permission", { direction }); if (saved) posthog.capture("direction_confirmed", { onboarding_version: MIRAVA_ONBOARDING_VERSION, objective: goal, primary_universe_id: direction.primaryUniverseId }) }
    // identity_permission intro phase: advance to capture phase (no backend call yet)
    else if (stepId === "identity_permission" && identityPhase === "intro" && identityConsentAccepted) { setIdentityPhase("capture"); posthog.capture("identity_consent_accepted", { onboarding_version: MIRAVA_ONBOARDING_VERSION }) }
    else if (stepId === "capture_activation" && onboardingState?.status !== "session_ready" && onboardingState) onStartCapture(onboardingState)
    else if (stepId === "capture_activation" && onboardingState?.status === "session_ready") {
      setPending(true); setError(null)
      try {
        const response = await fetch("/api/visual-engine/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate" }) })
        const data = await response.json().catch(() => ({})) as { onboarding?: MiravaOnboardingState }
        if (!response.ok || !data.onboarding) throw new Error("MIRAVA_ONBOARDING_FAILED")
        posthog.capture("onboarding_activated", { onboarding_version: MIRAVA_ONBOARDING_VERSION }); onCompleted(data.onboarding, name.trim())
      } catch { setError(labels.saveError) } finally { setPending(false) }
    }
  }

  const chooseGoal = (choice: MiravaOnboardingGoal) => {
    setGoal(choice)
    posthog.capture("objective_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, objective: choice })
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
    posthog.capture("onboarding_back_clicked", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: stepId })
    // On capture phase: go back to intro phase, not to previous step
    if (stepId === "identity_permission" && identityPhase === "capture") {
      setIdentityPhase("intro")
      return
    }
    const target = MIRAVA_ONBOARDING_STEPS[Math.max(0, step - 1)]
    await goToStep(target)
  }

  const toggleUniverse = (id: string) => setUniverseIds((current) => {
    if (current.includes(id)) {
      setUniverseLimitNotice(null)
      posthog.capture("universe_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, universe_id: id, selected: false })
      return current.filter((value) => value !== id)
    }
    if (current.length >= 3) {
      setUniverseLimitNotice(labels.universeLimit)
      return current
    }
    setUniverseLimitNotice(null)
    posthog.capture("universe_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, universe_id: id, selected: true })
    return [...current, id]
  })

  // identity_permission intro: need consent. capture phase: dock has no CTA (capture handles it)
  const canContinue = stepId === "promise_name" ? Boolean(name.trim()) : stepId === "objective" ? Boolean(goal) : stepId === "visual_universes" ? universeIds.length > 0 : stepId === "identity_permission" ? identityConsentAccepted : stepId === "capture_activation" ? Boolean(onboardingState) : true

  return (
    <section lang={locale} className="mirava-studio-onboarding-v3">
      <MiravaMobileShell scrollable={stepId === "identity_permission" && identityPhase === "capture"}>
        {/* Progress Header */}
        <MobileProgressHeader
          step={step}
          totalSteps={6}
          locale={locale}
          onBack={() => void back()}
          canGoBack={step > 0 && !pending}
        />

        {/* Accessibility Progress Bar Metadata Contract */}
        <div className="sr-only" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step + 1}>
          <motion.span animate={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>

        {/* Animated Step Panel */}
        <div className="flex-1 pb-8">
          <AnimatePresence mode="wait">
            <motion.div ref={panelRef} key={stepId} tabIndex={-1} className="outline-none" initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
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

                  {/* Editorial Collage Grid */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2" aria-hidden="true">
                    {MIRAVA_UNIVERSES.slice(0, 3).map((universe, idx) => (
                      <div
                        key={universe.id}
                        className={cn(
                          "relative aspect-[0.82] overflow-hidden rounded-2xl border border-white/10 shadow-md transition-transform duration-300",
                          idx === 1 ? "scale-105 z-10 border-white/25 shadow-xl" : "opacity-80"
                        )}
                      >
                        <img src={universe.image} alt="" className="h-full w-full object-cover object-top" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>
                    ))}
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

              {/* STEP 4: DIRECTION REVIEW */}
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
                      <div className="py-3 flex justify-between items-center">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">{labels.firstSession}</span>
                        <span className="font-semibold text-[#ede8df] text-sm">{selectedGoal?.session}</span>
                      </div>
                      <div className="py-3 flex justify-between items-center">
                        <span className="text-white/50 uppercase tracking-wider font-semibold">{labels.formats}</span>
                        <span className="font-medium text-white/80 text-right">{direction.recommendedFormats.join(" · ")}</span>
                      </div>
                    </div>
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
                  </div>
                </div>
              )}

              {/* STEP 5A: IDENTITY INTRO — consent + trust (identityPhase = "intro") */}
              {stepId === "identity_permission" && identityPhase === "intro" && (
                <div className="space-y-6 pt-2 sm:pt-3">
                  <div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / IDENTITÉ ET CONTRÔLE
                    </span>
                    <h1 className="mt-3 font-jakarta text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl leading-[1.15]">
                      {labels.identity}
                    </h1>
                  </div>

                  {/* Consent Checkbox */}
                  <MiravaCustomCheckbox
                    checked={identityConsentAccepted}
                    onChange={setIdentityConsentAccepted}
                    label={labels.consent}
                  />

                  {/* Trust Bullet Cards */}
                  <div className="space-y-2.5 rounded-2xl border border-white/15 bg-white/10 p-4 text-xs leading-relaxed text-white/70 backdrop-blur-xl">
                    <div className="flex gap-3 items-start">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#ede8df]" />
                      <span>{labels.privacy}</span>
                    </div>
                    <div className="flex gap-3 items-start pt-2 border-t border-white/5">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#ede8df]" />
                      <span>{labels.processing}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5B: IDENTITY CAPTURE — photo slots only (identityPhase = "capture") */}
              {stepId === "identity_permission" && identityPhase === "capture" && (
                <div className="pt-2 sm:pt-3">
                  <MiravaIdentityCapture
                    inline={true}
                    locale={locale}
                    initialConsentAccepted={identityConsentAccepted}
                    onClose={() => {}}
                    onComplete={async (files) => {
                      setPhotosUploaded(files.length)
                      if (files.length > 0) {
                        setPending(true)
                        try {
                          const res = await fetch("/api/visual-engine/identity-profile", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ageConfirmed: true,
                              rightsConfirmed: true,
                              retentionAccepted: true,
                              privacyAccepted: true,
                              openaiDisclosureAccepted: true,
                            }),
                          })
                          if (res.ok) {
                            const saved = await persist("capture_activation", { identityConsentAccepted: true })
                            if (saved) onStartCapture(saved)
                          }
                        } finally {
                          setPending(false)
                        }
                      }
                    }}
                  />
                </div>
              )}

              {/* STEP 6: CAPTURE ACTIVATION */}
              {stepId === "capture_activation" && (
                <div className="space-y-6 pt-2">
                  <div className="text-center">
                    <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border border-[#ede8df]/30 bg-white/15 backdrop-blur-xl shadow-xl">
                      <Sparkles className="h-7 w-7 text-[#ede8df]" />
                    </div>
                    <span className="block font-jakarta text-[10px] font-bold tracking-[0.16em] text-[#d5c6b0] uppercase">
                      MIRAVA / ACTIVATION
                    </span>
                    <h1 className="mt-2 font-jakarta text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl leading-tight">
                      {onboardingState?.status === "session_ready" ? `${labels.ready}, ${name.trim()}.` : labels.preparing}
                    </h1>
                  </div>

                  {/* Identity Profile Status Card */}
                  <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <strong className="block font-jakarta text-sm font-semibold text-white">
                          {locale === "fr" ? "Profil Identité Privé" : "Perfil de Identidad Privado"}
                        </strong>
                        <span className="font-jakarta text-xs text-[#ede8df]">
                          {onboardingState?.status === "session_ready"
                            ? (locale === "fr" ? "4 vues sur 4 validées" : "4 vistas de 4 validadas")
                            : (locale === "fr" ? "1 vue sur 4 validée" : "1 vista de 4 validada")}
                        </span>
                      </div>
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-jakarta text-[10px] font-bold text-emerald-400">
                        {onboardingState?.status === "session_ready" ? "PRÊT" : "EN COURS"}
                      </span>
                    </div>

                    {/* View Breakdown List */}
                    <div className="mt-3.5 space-y-2.5 font-jakarta text-xs">
                      {PHOTO_SLOTS.map((slot) => {
                        const isRequired = slot.level === "required"
                        const isRecommended = slot.level === "recommended"
                        const isDone = onboardingState?.status === "session_ready" || slot.number === 1

                        return (
                          <div key={slot.id} className="flex items-center justify-between text-white/90">
                            <div className="flex items-center gap-2">
                              {isDone ? (
                                <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border border-white/30 bg-black/40" />
                              )}
                              <span>{slot.title[locale]}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-semibold",
                              isDone
                                ? "text-emerald-400"
                                : isRequired
                                ? "text-amber-400"
                                : "text-white/40"
                            )}>
                              {isDone
                                ? (locale === "fr" ? "Validé" : "Validado")
                                : isRequired
                                ? (locale === "fr" ? "Requis" : "Requerido")
                                : isRecommended
                                ? (locale === "fr" ? "Recommandé" : "Recomendado")
                                : (locale === "fr" ? "Optionnel" : "Opcional")}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => void goToStep("identity_permission")}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-jakarta text-xs font-semibold text-white transition-all hover:bg-white/20"
                    >
                      <Camera className="h-4 w-4 text-[#ede8df]" />
                      <span>{locale === "fr" ? "Ajouter ou modifier mes photos" : "Añadir o modificar mis fotos"}</span>
                    </button>
                  </div>

                  {onboardingState?.status === "session_ready" && direction && (
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left font-jakarta text-xs backdrop-blur-xl">
                      <span className="block text-[10px] font-semibold text-[#d5c6b0] uppercase tracking-wider">
                        {locale === "fr" ? "Première séance configurée" : "Primera sesión configurada"}
                      </span>
                      <strong className="mt-1 block font-semibold text-white text-sm">
                        {selectedGoal?.session} — {primaryUniverse?.name[locale]}
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

        {/* Action Bar — always visible. On identity capture phase, only back button shown */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={24}
            brightness={45}
            opacity={0.95}
            blur={14}
            backgroundOpacity={0.15}
            className="mx-auto max-w-md p-2 shadow-[0_16px_40px_rgba(0,0,0,0.8)] sm:max-w-xl mirava-onboarding-v3-actions"
          >
            <div className="flex w-full items-center gap-3">
              <button
                onClick={() => void back()}
                disabled={step === 0 || pending}
                aria-label={labels.back}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">{labels.back}</span>
              </button>

              {/* Capture phase: no dock CTA (MiravaIdentityCapture handles its own action buttons) */}
              {!(stepId === "identity_permission" && identityPhase === "capture") && (
                <button
                  onClick={() => void next()}
                  disabled={!canContinue || pending}
                  className="group flex min-h-[52px] w-full flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ede8df] px-5 font-jakarta text-sm font-semibold text-[#0d0e0e] shadow-[0_4px_20px_rgba(237,232,223,0.15)] transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#2c2d2e] disabled:text-white/30 disabled:shadow-none is-primary"
                >
                  <span>
                    {pending ? labels.saving : stepId === "promise_name" ? labels.start : stepId === "objective" ? labels.objectiveCta : stepId === "visual_universes" ? labels.use : stepId === "direction_review" ? labels.confirm : stepId === "identity_permission" && identityPhase === "intro" ? labels.camera : onboardingState?.status === "session_ready" ? labels.open : labels.resume}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </GlassSurface>
        </footer>
      </MiravaMobileShell>
    </section>
  )
}
