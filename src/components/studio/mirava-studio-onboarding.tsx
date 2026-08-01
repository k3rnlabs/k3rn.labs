"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, Camera, Check, Images, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react"
import posthog from "posthog-js"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import {
  MIRAVA_ONBOARDING_STEPS,
  MIRAVA_ONBOARDING_VERSION,
  type MiravaIdentityIntent,
  type MiravaOnboardingGoal,
  type MiravaOnboardingState,
  type MiravaOnboardingStep,
} from "@/lib/mirava/onboarding"
import { MIRAVA_UNIVERSES, getMiravaUniverse } from "@/lib/mirava/universes"
import { cn } from "@/lib/utils"

type Locale = "fr" | "es"
type Goal = { id: MiravaOnboardingGoal; title: string; copy: string; recommendation: string }

const goals: Record<Locale, Goal[]> = {
  fr: [
    { id: "presence", title: "Développer ma présence", copy: "Des portraits cohérents pour vos profils, publications et prises de parole.", recommendation: "Portrait éditorial" },
    { id: "campaign", title: "Créer une campagne", copy: "Une direction complète à décliner sur plusieurs images et formats.", recommendation: "Série de campagne" },
    { id: "portfolio", title: "Construire mon portfolio", copy: "Des visuels plus expressifs pour affirmer votre signature personnelle.", recommendation: "Série signature" },
  ],
  es: [
    { id: "presence", title: "Desarrollar mi presencia", copy: "Retratos coherentes para tus perfiles, publicaciones e intervenciones.", recommendation: "Retrato editorial" },
    { id: "campaign", title: "Crear una campaña", copy: "Una dirección completa para desarrollar en varias imágenes y formatos.", recommendation: "Serie de campaña" },
    { id: "portfolio", title: "Construir mi portfolio", copy: "Visuales más expresivos para afirmar tu firma personal.", recommendation: "Serie distintiva" },
  ],
}

const COPY = {
  fr: {
    phase: ["Votre studio", "La promesse", "Le fonctionnement", "Votre direction", "Votre intention", "Votre direction", "Votre contrôle", "Studio prêt"],
    welcome: "Bienvenue dans votre studio photo personnel.", welcomeCopy: "Commençons par construire une direction qui vous ressemble.", name: "Comment souhaitez-vous que MIRAVA vous appelle ?", namePlaceholder: "Votre prénom", start: "Construire mon studio",
    promise: "Une même identité. Plusieurs univers.", promiseCopy: "Mirava transforme votre direction en images cohérentes pour votre présence, vos campagnes et votre portfolio.", promiseCta: "Voir comment ça fonctionne",
    how: "Trois gestes. Votre studio prend forme.", howCopy: "Vous n’avez pas besoin de maîtriser le vocabulaire photo. Vous choisissez, vous validez, Mirava vous aide à composer.", howCta: "Choisir ma direction", control: "Vous contrôlez les photos utilisées et chaque résultat créé.",
    universes: "Quelles images vous attirent naturellement ?", universesCopy: "Choisissez jusqu’à trois univers. Votre sélection compose la première direction.", useUniverses: "Utiliser ces univers", selected: "univers sélectionné", selectedPlural: "univers sélectionnés", max: "Maximum trois univers.",
    goal: "Qu’aimeriez-vous rendre visible en premier ?", goalCopy: "Votre réponse change la recommandation de votre première séance.",
    direction: "Votre studio prend forme, {name}.", directionCopy: "Nous préparons une première direction pour {goal}, entre {universes}.", directionCta: "Préparer mon identité", editable: "Vous pourrez modifier cette direction dans votre studio.",
    identity: "Votre identité, à votre rythme.", identityCopy: "Pour créer des images qui vous ressemblent, Mirava vous demandera trois vues simples. Vous décidez quand les préparer.", now: "Créer mon Profil Identité", nowCopy: "Trois vues privées, par capture guidée ou import depuis votre galerie.", later: "Le préparer plus tard", laterCopy: "Vous pouvez explorer votre studio maintenant. Nous le demanderons seulement avant une première création.", private: "Seules les photos que vous validez rejoignent votre Profil Identité.", device: "Le contrôle de cadrage se fait sur votre appareil avant l’envoi.", removal: "Vos photos sont consultables et supprimables depuis votre studio.",
    ready: "Votre studio est prêt, {name}.", readyCopy: "Votre première direction est préparée. {identity}", readyNow: "Nous ouvrons votre Profil Identité pour créer des images qui vous ressemblent.", readyLater: "Vous pourrez préparer votre Profil Identité au moment de lancer une première séance.", createIdentity: "Créer mon Profil Identité", explore: "Explorer mon studio",
    back: "Retour", saving: "Enregistrement…", step: "Séquence", identityCard: "Profil identité", directionCard: "Direction", resultsCard: "Images", camera: "Photos validées", plan: "Première séance recommandée",
  },
  es: {
    phase: ["Tu estudio", "La promesa", "Cómo funciona", "Tu dirección", "Tu intención", "Tu dirección", "Tu control", "Estudio listo"],
    welcome: "Bienvenida a tu estudio fotográfico personal.", welcomeCopy: "Empecemos a construir una dirección que se parezca a ti.", name: "¿Cómo quieres que MIRAVA te llame?", namePlaceholder: "Tu nombre", start: "Construir mi estudio",
    promise: "Una misma identidad. Varios universos.", promiseCopy: "Mirava transforma tu dirección en imágenes coherentes para tu presencia, tus campañas y tu portfolio.", promiseCta: "Ver cómo funciona",
    how: "Tres gestos. Tu estudio toma forma.", howCopy: "No necesitas dominar el vocabulario fotográfico. Eliges, validas y Mirava te ayuda a componer.", howCta: "Elegir mi dirección", control: "Controlas las fotos utilizadas y cada resultado creado.",
    universes: "¿Qué imágenes te atraen de forma natural?", universesCopy: "Elige hasta tres universos. Tu selección compone la primera dirección.", useUniverses: "Usar estos universos", selected: "universo seleccionado", selectedPlural: "universos seleccionados", max: "Máximo tres universos.",
    goal: "¿Qué te gustaría hacer visible primero?", goalCopy: "Tu respuesta cambia la recomendación de tu primera sesión.",
    direction: "Tu estudio toma forma, {name}.", directionCopy: "Preparamos una primera dirección para {goal}, entre {universes}.", directionCta: "Preparar mi identidad", editable: "Podrás modificar esta dirección en tu estudio.",
    identity: "Tu identidad, a tu ritmo.", identityCopy: "Para crear imágenes que se parezcan a ti, Mirava te pedirá tres vistas sencillas. Tú decides cuándo prepararlas.", now: "Crear mi Perfil de identidad", nowCopy: "Tres vistas privadas, mediante captura guiada o importación desde tu galería.", later: "Prepararlo más tarde", laterCopy: "Puedes explorar tu estudio ahora. Solo lo pediremos antes de una primera creación.", private: "Solo las fotos que validas se unen a tu Perfil de identidad.", device: "El control de encuadre se realiza en tu dispositivo antes del envío.", removal: "Puedes consultar y eliminar tus fotos desde tu estudio.",
    ready: "Tu estudio está listo, {name}.", readyCopy: "Tu primera dirección está preparada. {identity}", readyNow: "Abrimos tu Perfil de identidad para crear imágenes que se parezcan a ti.", readyLater: "Podrás preparar tu Perfil de identidad al lanzar tu primera sesión.", createIdentity: "Crear mi Perfil de identidad", explore: "Explorar mi estudio",
    back: "Volver", saving: "Guardando…", step: "Secuencia", identityCard: "Perfil de identidad", directionCard: "Dirección", resultsCard: "Imágenes", camera: "Fotos validadas", plan: "Primera sesión recomendada",
  },
} as const

const ease = [0.22, 1, 0.36, 1] as const
const pageMotion = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.42, ease } }
const sentence = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "")

export function MiravaStudioOnboarding({ locale, firstName, initialUniverseId, initialState, onCompleted }: {
  locale: Locale
  firstName: string | null
  initialUniverseId?: string
  initialState: MiravaOnboardingState | null
  onCompleted: (state: MiravaOnboardingState, firstName: string) => void
}) {
  const [step, setStep] = useState<MiravaOnboardingStep>(initialState?.step ?? 0)
  const [name, setName] = useState(firstName ?? "")
  const [universeIds, setUniverseIds] = useState<string[]>(() => initialState?.universeIds.length ? initialState.universeIds : initialUniverseId && getMiravaUniverse(initialUniverseId) ? [initialUniverseId] : [])
  const [goal, setGoal] = useState<MiravaOnboardingGoal | null>(initialState?.goal ?? null)
  const [identityIntent, setIdentityIntent] = useState<MiravaIdentityIntent | null>(initialState?.identityIntent ?? null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackedStartRef = useRef(false)
  const autoAdvanceRef = useRef<number | null>(null)
  const stepPanelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const labels = COPY[locale]
  const selectedUniverses = universeIds.map(getMiravaUniverse).filter(Boolean)
  const selectedNames = selectedUniverses.map((universe) => universe!.name[locale]).join(locale === "fr" ? " et " : " y ")
  const selectedGoal = goals[locale].find((item) => item.id === goal)

  useEffect(() => () => { if (autoAdvanceRef.current) window.clearTimeout(autoAdvanceRef.current) }, [])
  useEffect(() => {
    if (trackedStartRef.current) return
    trackedStartRef.current = true
    posthog.capture(initialState?.status === "in_progress" ? "onboarding_resumed" : "onboarding_started", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: initialState?.step ?? 0 })
  }, [initialState?.status, initialState?.step])
  useEffect(() => { posthog.capture("onboarding_step_viewed", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: step, sequence_id: MIRAVA_ONBOARDING_STEPS[step] }) }, [step])
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    const focusTimer = window.setTimeout(
      () => stepPanelRef.current?.focus({ preventScroll: true }),
      reducedMotion ? 0 : 460,
    )
    return () => window.clearTimeout(focusTimer)
  }, [reducedMotion, step])

  const persist = async (action: "progress" | "complete", nextStep?: MiravaOnboardingStep, overrides: Partial<Pick<MiravaOnboardingState, "universeIds" | "goal" | "identityIntent">> = {}) => {
    setPending(true); setError(null)
    const nextGoal = overrides.goal ?? goal
    const nextIntent = overrides.identityIntent ?? identityIntent
    const nextUniverses = overrides.universeIds ?? universeIds
    try {
      const response = await fetch("/api/visual-engine/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "complete"
        ? { action, firstName: name.trim(), universeIds: nextUniverses, goal: nextGoal, identityIntent: nextIntent }
        : { action, step: nextStep, ...(step === 0 ? { firstName: name.trim() } : {}), ...(step === 3 ? { universeIds: nextUniverses } : {}), ...(step === 4 ? { goal: nextGoal } : {}), ...(step === 6 ? { identityIntent: nextIntent } : {}) }) })
      const data = await response.json().catch(() => ({})) as { onboarding?: MiravaOnboardingState; error?: string }
      if (!response.ok || !data.onboarding) throw new Error(data.error ?? "MIRAVA_ONBOARDING_FAILED")
      posthog.capture(action === "complete" ? "onboarding_completed" : "onboarding_answer_submitted", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: step, sequence_id: MIRAVA_ONBOARDING_STEPS[step] })
      if (action === "complete") onCompleted(data.onboarding, name.trim())
      else if (nextStep !== undefined) setStep(nextStep)
    } catch (reason) {
      setError(reason instanceof Error && reason.message !== "MIRAVA_ONBOARDING_FAILED" ? reason.message : (locale === "fr" ? "MIRAVA n’a pas pu enregistrer votre accueil." : "MIRAVA no ha podido guardar tu bienvenida."))
    } finally { setPending(false) }
  }
  const advance = (next = (step + 1) as MiravaOnboardingStep) => { if (!pending) void persist("progress", next) }
  const toggleUniverse = (id: string) => {
    setError(null)
    setUniverseIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id)
      if (current.length >= 3) { setError(labels.max); return current }
      posthog.capture("onboarding_answer_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: 3, answer_kind: "universe" })
      return [...current, id]
    })
  }
  const chooseGoal = (choice: MiravaOnboardingGoal) => {
    setGoal(choice); posthog.capture("onboarding_answer_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: 4, answer_kind: "goal" })
    if (autoAdvanceRef.current) window.clearTimeout(autoAdvanceRef.current)
    autoAdvanceRef.current = window.setTimeout(() => void persist("progress", 5, { goal: choice }), reducedMotion ? 0 : 520)
  }
  const chooseIdentity = (choice: MiravaIdentityIntent) => {
    setIdentityIntent(choice); posthog.capture("onboarding_answer_selected", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: 6, answer_kind: "identity_timing" })
    void persist("progress", 7, { identityIntent: choice })
  }
  const complete = () => {
    if (!identityIntent || !goal || !universeIds.length || !name.trim() || pending) return
    if (identityIntent === "later") posthog.capture("onboarding_step_skipped", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: 6, skipped: "identity" })
    void persist("complete")
  }
  const primaryLabel = step === 0 ? labels.start : step === 1 ? labels.promiseCta : step === 2 ? labels.howCta : step === 3 ? labels.useUniverses : step === 5 ? labels.directionCta : identityIntent === "now" ? labels.createIdentity : labels.explore
  const canProceed = step === 0 ? Boolean(name.trim()) : step === 3 ? universeIds.length > 0 : step !== 4 && step !== 6

  return <section lang={locale} className="mirava-studio-onboarding" data-step={step}>
    <div className="mirava-studio-onboarding-top"><MiravaWordmark /><p className="mirava-label">{labels.phase[step]} · {labels.step} {step + 1}/8</p></div>
    <div className="mirava-onboarding-progress" role="progressbar" aria-label={labels.step} aria-valuemin={1} aria-valuemax={8} aria-valuenow={step + 1} aria-valuetext={`${labels.step} ${step + 1} ${locale === "fr" ? "sur" : "de"} 8`}><motion.span animate={{ width: `${((step + 1) / 8) * 100}%` }} transition={{ duration: reducedMotion ? 0 : 0.42, ease }} /></div>
    <div className="mirava-studio-onboarding-content">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div ref={stepPanelRef} key={step} {...pageMotion} role="region" aria-label={labels.phase[step]} tabIndex={-1} transition={{ ...pageMotion.transition, duration: reducedMotion ? 0.12 : 0.42 }}>
          {step === 0 && <div className="mirava-onboarding-welcome"><div><p className="mirava-label">MIRAVA / STUDIO PERSONNEL</p><h1 className="mirava-section-title mt-4">{labels.welcome}</h1><p className="mirava-copy mt-5 max-w-xl text-base leading-7">{labels.welcomeCopy}</p><label className="mt-10 block max-w-md"><span className="mirava-label">{labels.name}</span><input autoFocus autoComplete="given-name" aria-required="true" maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder={labels.namePlaceholder} className="mirava-onboarding-input mt-3" /></label></div><div className="mirava-welcome-composition" aria-hidden="true">{MIRAVA_UNIVERSES.slice(0, 3).map((universe, index) => <motion.img key={universe.id} src={universe.image} alt="" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reducedMotion ? 0 : index * 0.12, duration: 0.6, ease }} />)}</div></div>}
          {step === 1 && <div className="mirava-onboarding-narrative"><p className="mirava-label">MIRAVA / LA PROMESSE</p><h1 className="mirava-section-title mt-4 max-w-3xl">{labels.promise}</h1><p className="mirava-copy mt-5 max-w-xl text-base leading-7">{labels.promiseCopy}</p><div className="mirava-promise-gallery mt-10">{MIRAVA_UNIVERSES.slice(0, 4).map((universe, index) => <motion.figure key={universe.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : index * 0.1, duration: 0.5, ease }}><img src={universe.image} alt={universe.name[locale]} /><figcaption>{universe.name[locale]}</figcaption></motion.figure>)}</div></div>}
          {step === 2 && <div className="mirava-onboarding-narrative"><p className="mirava-label">MIRAVA / MODE D’EMPLOI</p><h1 className="mirava-section-title mt-4 max-w-3xl">{labels.how}</h1><p className="mirava-copy mt-5 max-w-xl text-base leading-7">{labels.howCopy}</p><div className="mirava-how-flow mt-10"><div><Images /><strong>{labels.identityCard}</strong><span>{labels.camera}</span></div><ArrowRight aria-hidden="true" /><div><Sparkles /><strong>{labels.directionCard}</strong><span>{labels.phase[3]}</span></div><ArrowRight aria-hidden="true" /><div><Check /><strong>{labels.resultsCard}</strong><span>{locale === "fr" ? "À consulter et sélectionner" : "Para consultar y seleccionar"}</span></div></div><p className="mirava-onboarding-control mt-8"><ShieldCheck aria-hidden="true" />{labels.control}</p></div>}
          {step === 3 && <div><p className="mirava-label">MIRAVA / VOS RÉFÉRENCES</p><h1 className="mirava-section-title mt-4 max-w-3xl">{labels.universes}</h1><p className="mirava-copy mt-5 max-w-xl text-base leading-7">{labels.universesCopy}</p><p className="mirava-onboarding-selection mt-7">{universeIds.length}/3 {universeIds.length === 1 ? labels.selected : labels.selectedPlural}</p><div className="mirava-onboarding-universe-grid mt-3">{MIRAVA_UNIVERSES.map((universe) => <button key={universe.id} type="button" aria-pressed={universeIds.includes(universe.id)} onClick={() => toggleUniverse(universe.id)} className={cn("mirava-onboarding-universe", universeIds.includes(universe.id) && "is-selected")}><img src={universe.image} alt="" /><span>{universe.eyebrow[locale]}</span><strong>{universe.name[locale]}</strong>{universeIds.includes(universe.id) && <Check aria-label={locale === "fr" ? "Sélectionné" : "Seleccionado"} className="h-4 w-4" />}</button>)}</div></div>}
          {step === 4 && <div><p className="mirava-label">MIRAVA / VOTRE PREMIER OBJECTIF</p><h1 className="mirava-section-title mt-4 max-w-3xl">{labels.goal}</h1><p className="mirava-copy mt-5 max-w-xl text-base leading-7">{labels.goalCopy}</p><div className="mirava-onboarding-choice-grid mt-9">{goals[locale].map((item) => <button key={item.id} type="button" aria-pressed={goal === item.id} onClick={() => chooseGoal(item.id)} className={cn("mirava-onboarding-choice", goal === item.id && "is-selected")}><strong>{item.title}</strong><span>{item.copy}</span></button>)}</div></div>}
          {step === 5 && <div className="mirava-onboarding-direction"><p className="mirava-label">MIRAVA / DIRECTION EN CONSTRUCTION</p><h1 className="mirava-section-title mt-4 max-w-3xl">{sentence(labels.direction, { name: name.trim() })}</h1><p className="mirava-copy mt-5 max-w-2xl text-base leading-7">{sentence(labels.directionCopy, { goal: selectedGoal?.title.toLowerCase() ?? "", universes: selectedNames })}</p><div className="mirava-direction-board mt-9">{selectedUniverses.map((universe, index) => <motion.figure key={universe!.id} layoutId={`universe-${universe!.id}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : index * 0.1, ease }}><img src={universe!.image} alt={universe!.name[locale]} /><figcaption>{universe!.name[locale]}</figcaption></motion.figure>)}<div className="mirava-direction-summary"><Sparkles /><span>{labels.plan}</span><strong>{selectedGoal?.recommendation}</strong><small>{labels.editable}</small></div></div></div>}
          {step === 6 && <div><p className="mirava-label">MIRAVA / IDENTITÉ ET CONTRÔLE</p><h1 className="mirava-section-title mt-4 max-w-3xl">{labels.identity}</h1><p className="mirava-copy mt-5 max-w-xl text-base leading-7">{labels.identityCopy}</p><div className="mirava-onboarding-trust mt-7"><p><LockKeyhole aria-hidden="true" />{labels.private}</p><p><Camera aria-hidden="true" />{labels.device}</p><p><ShieldCheck aria-hidden="true" />{labels.removal}</p></div><div className="mirava-onboarding-choice-grid mt-8">{(["now", "later"] as const).map((intent) => <button key={intent} type="button" aria-pressed={identityIntent === intent} onClick={() => chooseIdentity(intent)} className={cn("mirava-onboarding-choice", identityIntent === intent && "is-selected")}><strong>{intent === "now" ? labels.now : labels.later}</strong><span>{intent === "now" ? labels.nowCopy : labels.laterCopy}</span></button>)}</div></div>}
          {step === 7 && <div className="mirava-onboarding-ready"><p className="mirava-label">MIRAVA / STUDIO PRÊT</p><h1 className="mirava-section-title mt-4 max-w-3xl">{sentence(labels.ready, { name: name.trim() })}</h1><p className="mirava-copy mt-5 max-w-2xl text-base leading-7">{sentence(labels.readyCopy, { identity: identityIntent === "now" ? labels.readyNow : labels.readyLater })}</p><div className="mirava-ready-board mt-9">{selectedUniverses.slice(0, 3).map((universe) => <img key={universe!.id} src={universe!.image} alt={universe!.name[locale]} />)}<div><span>{selectedGoal?.recommendation}</span><strong>{identityIntent === "now" ? labels.now : labels.later}</strong></div></div></div>}
        </motion.div>
      </AnimatePresence>
    </div>
    <div className="mirava-studio-onboarding-actions"><button type="button" className="mirava-flow-button" disabled={step === 0 || pending} onClick={() => { if (step > 0) { setError(null); posthog.capture("onboarding_back_clicked", { onboarding_version: MIRAVA_ONBOARDING_VERSION, step_id: step }); setStep((step - 1) as MiravaOnboardingStep) } }}><ArrowLeft className="h-4 w-4" /><span>{labels.back}</span></button><div className="text-right"><p className="mirava-form-error" role="status">{error}</p>{step !== 4 && step !== 6 && <button type="button" disabled={!canProceed || pending} onClick={() => step === 7 ? complete() : advance()} className="mirava-flow-button mirava-flow-button-primary"><span>{pending ? labels.saving : primaryLabel}</span><ArrowRight className="h-4 w-4" /></button>}</div></div>
  </section>
}
