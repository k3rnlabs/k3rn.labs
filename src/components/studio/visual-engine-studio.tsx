"use client"

import {
  type ChangeEvent,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import Image from "next/image"
import Link from "next/link"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  ArrowRight,
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  CircleAlert,
  Download,
  Images,
  Loader2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { BlurText } from "@/components/mirava/blur-text"
import { enableMiravaPush, MiravaInstallButton } from "@/components/mirava/mirava-pwa"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"
import { MiravaCreativeDirector } from "@/components/studio/mirava-creative-director"
import { MiravaIdentityCapture, type MiravaIdentityConsent } from "@/components/studio/mirava-identity-capture"
import { MiravaStudioOnboarding } from "@/components/studio/mirava-studio-onboarding"
import { BottomNavBar, type BottomNavItem } from "@/components/ui/bottom-nav-bar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Header } from "@/components/ui/header-2"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import { isMiravaOnboardingCompleted, type MiravaOnboardingState } from "@/lib/mirava/onboarding"
import { isMiravaIdentityProfileReady, MIRAVA_MAX_IDENTITY_PHOTOS, MIRAVA_MIN_IDENTITY_PHOTOS } from "@/lib/mirava/identity-profile"
import {
  uploadMiravaIdentityAsset,
  uploadMiravaIdentityProfile,
} from "@/lib/mirava/identity-profile-upload.client"
import { MIRAVA_UNIVERSES, getMiravaUniverse, type MiravaUniverse } from "@/lib/mirava/universes"
import { cn } from "@/lib/utils"
import posthog from "posthog-js"

type Locale = "fr" | "es"
type Status = "DRAFT" | "ANALYSIS_QUEUED" | "ANALYSING" | "IDENTITY_READY" | "GENERATION_QUEUED" | "GENERATING" | "COMPLETED" | "FAILED" | "CANCELLED"
type View = "create" | "universes" | "library" | "account"
type Asset = { id: string; kind: "REFERENCE" | "IDENTITY" | "RESULT"; createdAt: string }
type Creation = {
  id: string
  studioProfileId: string | null
  presetId: string | null
  status: Status
  failureMessage: string | null
  createdAt: string
  completedAt?: string | null
  requestedResultCount: number
  completedResultCount?: number
  resultUrl?: string | null
  resultUrls?: string[]
}
type Detail = { creation: Creation; assets: Asset[]; resultUrl: string | null; resultUrls: string[]; completedResultCount: number; studioCredits: number }
type Studio = { id: string; name: string; presetId: string | null; createdAt: string; updatedAt: string }
type IdentityProfile = { id: string; assetCount: number; updatedAt: string; previews: Array<{ id: string; url: string; createdAt: string }> } | null
type Offer = { id: string; name: string; credits: number; priceEur: number; kind: "pack" | "subscription" }
type Account = { credits: number; subscription: { planId: string | null; status: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null; plans: Offer[]; packs: Offer[] }
type Consents = { adult: boolean; rights: boolean; privacy: boolean; provider: boolean }

const pendingStatuses: Status[] = ["ANALYSIS_QUEUED", "ANALYSING", "GENERATION_QUEUED", "GENERATING"]

const copy = {
  fr: {
    create: "Studio",
    universesNav: "Univers",
    directorNav: "Alma",
    library: "Portfolio",
    account: "Compte",
    heroEyebrow: "ÉNERGIE ÉDITORIALE · IDENTITÉ PRÉSERVÉE",
    heroTitle: "Votre studio photo personnel, partout où vous voulez être vue.",
    heroIntro: "Photographie, style et décors d’exception : composez des campagnes où vous restez l’héroïne centrale.",
    custom: "Créer mon propre studio",
    customHint: "Importez une photo de référence. MIRAVA en extrait la direction artistique en privé et la rend réutilisable.",
    startCustom: "Créer depuis une référence",
    explore: "Explorer les univers",
    universes: "Les 7 univers MIRAVA",
    universesIntro: "Sept intentions créatives complètes. Une seule identité : la vôtre.",
    adjust: "Ajuster ma séance",
    director: "Parler à ma Directrice créative",
    proofTitle: "Même vous. Tous les décors.",
    proofText: "Votre visage, votre carnation et votre présence restent le fil rouge. La pose, le style, l’angle et la lumière s’adaptent entièrement à chaque séance.",
    identityKit: "Votre Profil identité",
    identityKitText: "Trois portraits sont requis : face, 3/4 gauche et 3/4 droit. Quatre photos sont recommandées ; les vues plein pied renforcent la cohérence des proportions.",
    consent: "Avant de lancer votre création",
    adult: "J’ai au moins 18 ans et toutes les personnes représentées sont majeures.",
    rights: "J’ai les droits nécessaires et le consentement explicite de chaque personne représentée.",
    privacy: "J’ai lu la politique : les références artistiques sont purgées après analyse ; mon Profil identité reste privé jusqu’à sa suppression.",
    provider: "Je comprends que mes images sont traitées par l’API OpenAI pour réaliser ma création.",
    enter: "Confirmer et lancer",
    reference: "Votre inspiration",
    referenceHint: "Une seule image suffit pour construire un studio personnel. Elle ne sera jamais affichée publiquement.",
    analyze: "Créer mon studio",
    analysing: "Votre direction prend forme",
    identity: "Préparez votre identité",
    identityHint: "Votre Profil identité est créé une fois puis réutilisé pour chaque séance. Trois portraits sont requis ; cheveux et silhouette renforcent la fidélité.",
    identityReadyTitle: "Votre Profil identité est prêt",
    identityReadyHint: "Votre identité est déjà liée à cette séance. Vous pouvez lancer votre image ou ajouter une vue privée si vous souhaitez encore la renforcer.",
    guided: "Préparer mon Profil identité",
    import: "Importer mes photos",
    identityReady: "Profil prêt",
    generate: "Créer mon image signature",
    generating: "Votre image est en préparation",
    result: "Votre image signature est prête.",
    download: "Enregistrer dans Photos",
    delete: "Supprimer",
    continueShoot: "Créer une nouvelle image",
    continueHint: "Même studio · Nouvelle pose · 1 crédit",
    formatTitle: "Format de la séance",
    formatSingle: "Image signature",
    formatSeries3: "Série de 3",
    formatSeries5: "Série de 5",
    formatHint: "Chaque image consomme un crédit. Une série garde le même univers tout en variant les activités, poses, angles et lumières.",
    reuse: "Créer depuis ce studio",
    libraryTitle: "Votre collection privée",
    studiosTitle: "Vos studios",
    imagesTitle: "Vos images",
    empty: "Votre première image signature apparaîtra ici.",
    accountTitle: "Votre accès MIRAVA",
    profile: "Profil identité",
    deleteProfile: "Supprimer mon Profil identité",
    profilePrivacy: "Vos références d’identité sont privées, jamais publiques et supprimables immédiatement.",
    credits: "créations",
    plans: "Abonnements",
    packs: "Recharges",
    choose: "Choisir",
    portal: "Gérer l’abonnement",
    notify: "Me prévenir quand ma création est prête",
    installed: "Notifications activées.",
    failure: "Cette création demande votre attention.",
    busy: "Vous pouvez fermer l’application : MIRAVA poursuit le travail en privé.",
    status: { DRAFT: "Préparez votre référence", ANALYSIS_QUEUED: "Direction en attente", ANALYSING: "Direction en cours", IDENTITY_READY: "Studio prêt", GENERATION_QUEUED: "Création en attente", GENERATING: "Création en cours", COMPLETED: "Terminée", FAILED: "Action requise", CANCELLED: "Annulée" },
  },
  es: {
    create: "Estudio",
    universesNav: "Universos",
    directorNav: "Alma",
    library: "Portfolio",
    account: "Cuenta",
    heroEyebrow: "ENERGÍA EDITORIAL · IDENTIDAD PRESERVADA",
    heroTitle: "Tu estudio fotográfico personal, estés donde quieras ser vista.",
    heroIntro: "Fotografía, estilismo y escenarios excepcionales: crea campañas donde sigues siendo la protagonista.",
    custom: "Crear mi propio estudio",
    customHint: "Sube una foto de referencia. MIRAVA extrae su dirección artística en privado y la hace reutilizable.",
    startCustom: "Crear desde una referencia",
    explore: "Explorar los universos",
    universes: "Los 7 universos MIRAVA",
    universesIntro: "Siete intenciones creativas completas. Una sola identidad: la tuya.",
    adjust: "Ajustar mi sesión",
    director: "Hablar con mi Directora creativa",
    proofTitle: "La misma tú. Todos los escenarios.",
    proofText: "Tu rostro, tu tono de piel y tu presencia son el hilo conductor. La pose, el estilismo, el ángulo y la luz se adaptan por completo a cada sesión.",
    identityKit: "Tu Perfil de identidad",
    identityKitText: "Se requieren tres retratos: frente, tres cuartos izquierdo y derecho. Se recomiendan cuatro fotos; las vistas de cuerpo entero refuerzan la coherencia de las proporciones.",
    consent: "Antes de crear tu sesión",
    adult: "Tengo al menos 18 años y todas las personas representadas son adultas.",
    rights: "Tengo los derechos necesarios y el consentimiento explícito de cada persona representada.",
    privacy: "He leído la política: las referencias artísticas se eliminan tras el análisis; mi Perfil de identidad permanece privado hasta que lo elimine.",
    provider: "Entiendo que mis imágenes se tratan mediante la API de OpenAI para realizar mi creación.",
    enter: "Confirmar y crear",
    reference: "Tu inspiración",
    referenceHint: "Una sola imagen basta para construir un estudio personal. Nunca se mostrará públicamente.",
    analyze: "Crear mi estudio",
    analysing: "Tu dirección está tomando forma",
    identity: "Prepara tu identidad",
    identityHint: "Tu Perfil de identidad se crea una vez y se reutiliza en cada sesión. Se requieren tres retratos; el cabello y la silueta refuerzan la fidelidad.",
    identityReadyTitle: "Tu Perfil de identidad está listo",
    identityReadyHint: "Tu identidad ya está vinculada a esta sesión. Puedes crear tu imagen o añadir una vista privada si deseas reforzarla.",
    guided: "Preparar mi Perfil de identidad",
    import: "Subir mis fotos",
    identityReady: "Perfil listo",
    generate: "Crear mi imagen insignia",
    generating: "Tu imagen se está preparando",
    result: "Tu imagen insignia está lista.",
    download: "Guardar en Fotos",
    delete: "Eliminar",
    continueShoot: "Crear una nueva imagen",
    continueHint: "Mismo estudio · Nueva pose · 1 crédito",
    formatTitle: "Formato de la sesión",
    formatSingle: "Imagen insignia",
    formatSeries3: "Serie de 3",
    formatSeries5: "Serie de 5",
    formatHint: "Cada imagen consume un crédito. Una serie conserva el mismo universo variando actividades, poses, ángulos y luces.",
    reuse: "Crear desde este estudio",
    libraryTitle: "Tu colección privada",
    studiosTitle: "Tus estudios",
    imagesTitle: "Tus imágenes",
    empty: "Tu primera imagen insignia aparecerá aquí.",
    accountTitle: "Tu acceso MIRAVA",
    profile: "Perfil de identidad",
    deleteProfile: "Eliminar mi Perfil de identidad",
    profilePrivacy: "Tus referencias de identidad son privadas, nunca públicas y se pueden eliminar inmediatamente.",
    credits: "creaciones",
    plans: "Suscripciones",
    packs: "Recargas",
    choose: "Elegir",
    portal: "Gestionar suscripción",
    notify: "Avisarme cuando mi creación esté lista",
    installed: "Notificaciones activadas.",
    failure: "Esta creación requiere tu atención.",
    busy: "Puedes cerrar la aplicación: MIRAVA continúa trabajando en privado.",
    status: { DRAFT: "Prepara tu referencia", ANALYSIS_QUEUED: "Dirección en espera", ANALYSING: "Creando la dirección", IDENTITY_READY: "Estudio listo", GENERATION_QUEUED: "Creación en espera", GENERATING: "Creando", COMPLETED: "Terminada", FAILED: "Acción necesaria", CANCELLED: "Cancelada" },
  },
} as const

type Copy = typeof copy.fr | typeof copy.es


type MiravaShareData = {
  files: File[]
  title?: string
}

type MiravaShareNavigator = Navigator & {
  share?: (data: MiravaShareData) => Promise<void>
  canShare?: (data: MiravaShareData) => boolean
}

function ResultSaveButton({
  url,
  index,
  label,
}: {
  url: string
  index: number
  label: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    setFile(null)

    void fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("RESULT_DOWNLOAD_FAILED")
        }

        const blob = await response.blob()

        if (!active) return

        setFile(
          new File(
            [blob],
            `mirava-${Date.now()}-${index + 1}.png`,
            {
              type: blob.type || "image/png",
            }
          )
        )
      })
      .catch(() => {
        if (active) setFile(null)
      })

    return () => {
      active = false
    }
  }, [index, url])

  const save = async () => {
    if (!file || saving) return

    setSaving(true)

    try {
      const shareNavigator =
        navigator as MiravaShareNavigator

      const shareData: MiravaShareData = {
        files: [file],
        title: "MIRAVA Studio",
      }

      const canShareFile =
        Boolean(shareNavigator.share) &&
        (
          !shareNavigator.canShare ||
          shareNavigator.canShare(shareData)
        )

      if (canShareFile && shareNavigator.share) {
        await shareNavigator.share(shareData)
        return
      }

      const objectUrl = URL.createObjectURL(file)
      const anchor = document.createElement("a")

      anchor.href = objectUrl
      anchor.download = file.name
      anchor.style.display = "none"

      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.setTimeout(
        () => URL.revokeObjectURL(objectUrl),
        1_000
      )
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return
      }

      console.error(
        "[MIRAVA] result save failed",
        error instanceof Error ? error.name : "unknown"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={!file || saving}
      className="mirava-button mirava-button-primary absolute bottom-3 right-3 h-12 w-12 p-0 shadow-lg backdrop-blur disabled:opacity-60"
      aria-label={`${label} ${index + 1}`}
      title={label}
    >
      {!file || saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  )
}

const studioStageCopy = {
  fr: [
    { label: "Moodboard", title: "Où voulez-vous être vue ?", text: "Choisissez un univers MIRAVA ou partez d’une image qui vous inspire." },
    { label: "Séance", title: "Quelle image voulez-vous créer ?", text: "Définissez l’énergie, le style et le rythme de votre séance." },
    { label: "Création", title: "Votre studio est prêt.", text: "Relisez votre direction avant de lancer la production." },
  ],
  es: [
    { label: "Moodboard", title: "¿Dónde quieres ser vista?", text: "Elige un universo MIRAVA o parte de una imagen que te inspire." },
    { label: "Sesión", title: "¿Qué imagen quieres crear?", text: "Define la energía, el estilo y el ritmo de tu sesión." },
    { label: "Creación", title: "Tu estudio está listo.", text: "Revisa tu dirección antes de lanzar la producción." },
  ],
} as const

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin" })
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) {
    // Seul le 401 déclenche une déconnexion et une redirection vers le login.
    // Les autres erreurs (5xx, etc.) restent des erreurs locales affichées dans le studio.
    if (response.status === 401) throw new Error("MIRAVA_REQUEST_FAILED")
    throw new Error(data.error ?? `MIRAVA_ERROR_${response.status}`)
  }
  return data
}

function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("mirava-surface p-5 sm:p-6", className)}>{children}</section>
}

export function VisualEngineStudio() {
  const { locale, setLocale, isReady: isLocaleReady } = useMiravaLocale()
  const t = copy[locale]
  const [view, setView] = useState<View>("create")
  const [createStep, setCreateStepValue] = useState(0)
  const [furthestCreateStep, setFurthestCreateStep] = useState(0)
  const [current, setCurrent] = useState<Detail | null>(null)
  const [creations, setCreations] = useState<Creation[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile>(null)
  const [miravaOnboarding, setMiravaOnboarding] = useState<MiravaOnboardingState | null | undefined>(undefined)
  const [miravaFirstName, setMiravaFirstName] = useState<string | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null)
  const [selectedUniverseId, setSelectedUniverseId] = useState(MIRAVA_UNIVERSES[0].id)
  const [entryUniverseId, setEntryUniverseId] = useState<string | undefined>(undefined)
  const [entryIntent, setEntryIntent] = useState<"reference" | null>(null)
  const [options, setOptions] = useState<MiravaCreativeOptions>({})
  const [consents, setConsents] = useState<Consents>({ adult: false, rights: false, privacy: false, provider: false })
  const [consentTarget, setConsentTarget] = useState<string | null | undefined>(undefined)
  const [consentReference, setConsentReference] = useState<File | null>(null)
  const [directorOpen, setDirectorOpen] = useState(false)
  const [captureContext, setCaptureContext] = useState<"onboarding" | "replace" | "append" | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [checkoutNotice, setCheckoutNotice] = useState<"success" | "cancelled" | null>(null)
  const studioBackgroundRef = useRef<HTMLDivElement>(null)
  const studioScrollRef = useRef<HTMLDivElement>(null)
  const hasHydratedStudioPreferenceRef = useRef(false)
  const directorTriggerRef = useRef<HTMLElement | null>(null)
  const captureTriggerRef = useRef<HTMLElement | null>(null)
  const clearNotice = () => {
    setNotice(null)
    setCheckoutNotice(null)
  }
  const showNotice = (message: string) => {
    setCheckoutNotice(null)
    setNotice(message)
  }
  const displayedNotice = checkoutNotice === "success"
    ? (locale === "fr" ? "Retour de paiement reçu. Votre accès est actualisé dès la confirmation Stripe." : "Hemos recibido el regreso del pago. Tu acceso se actualizará en cuanto Stripe lo confirme.")
    : checkoutNotice === "cancelled"
      ? (locale === "fr" ? "Paiement annulé. Aucun changement n’a été apporté à votre accès." : "Pago cancelado. No se ha realizado ningún cambio en tu acceso.")
      : notice
  const setCreateStep = useCallback((step: number) => {
    const safeStep = Math.max(0, Math.min(2, step))
    setCreateStepValue(safeStep)
    setFurthestCreateStep((current) => Math.max(current, safeStep))
  }, [])

  const refresh = useCallback(async (creationId?: string) => {
    const [libraryData, studioData, profileData, accountData, onboardingData] = await Promise.all([
      api<{ studioCredits: number; creations: Creation[] }>("/api/visual-engine/creations"),
      api<{ studios: Studio[] }>("/api/visual-engine/studios"),
      api<{ profile: IdentityProfile }>("/api/visual-engine/identity-profile"),
      api<Account>("/api/visual-engine/account"),
      api<{ firstName: string | null; onboarding: MiravaOnboardingState | null }>("/api/visual-engine/onboarding"),
    ])
    setCreations(libraryData.creations)
    setStudios(studioData.studios)
    setIdentityProfile(profileData.profile)
    setAccount(accountData)
    setMiravaOnboarding(onboardingData.onboarding)
    setMiravaFirstName(onboardingData.firstName)
    // À la première entrée d'une cliente déjà onboardée, reprendre son univers
    // préféré. Une intention explicite dans l'URL reste toujours prioritaire ;
    // ensuite, les choix faits dans la séance ne sont jamais écrasés lors d'un refresh.
    if (!hasHydratedStudioPreferenceRef.current) {
      const requestedUniverse = typeof window === "undefined"
        ? undefined
        : getMiravaUniverse(new URLSearchParams(window.location.search).get("preset"))
      const preferredUniverse = requestedUniverse ?? getMiravaUniverse(onboardingData.onboarding?.universeIds[0])
      if (preferredUniverse) setSelectedUniverseId(preferredUniverse.id)
      if (isMiravaOnboardingCompleted(onboardingData.onboarding)) {
        setOptions((current) => current.seriesSize ? current : {
          ...current,
          // A first image is the least surprising default. A campaign goal can
          // still lead to a series, but only after the client has explicitly
          // selected its credit cost on the session screen.
          seriesSize: 1,
        })
      }
      hasHydratedStudioPreferenceRef.current = true
    }
    if (creationId) setCurrent(await api<Detail>(`/api/visual-engine/creations/${creationId}`))
  }, [])

  useEffect(() => {
    if (!isLocaleReady) return
    const params = new URLSearchParams(window.location.search)
    // Capture la destination avant de nettoyer les paramètres purement visuels.
    // Ainsi une offre choisie sur la landing survit au détour obligatoire par la connexion.
    const authReturnPath = `${window.location.pathname}${window.location.search}`
    const requestedView = params.get("view")
    const requestedUniverse = getMiravaUniverse(params.get("preset"))
    const requestedReference = params.get("source") === "reference"
    const requestedOfferId = params.get("offer")
    const checkoutState = params.get("checkout")
    if (requestedView === "identity") setView("account")
    else if (requestedView === "create" || requestedView === "universes" || requestedView === "library" || requestedView === "account") setView(requestedView)
    if (requestedUniverse) {
      setSelectedUniverseId(requestedUniverse.id)
      setEntryUniverseId(requestedUniverse.id)
    }
    if (requestedReference) setEntryIntent("reference")
    if (requestedOfferId) {
      setView("account")
      setHighlightedOfferId(requestedOfferId)
      setCheckoutNotice(null)
      setNotice(locale === "fr" ? "Votre offre est prête à être confirmée." : "Tu oferta está lista para confirmar.")
      params.delete("offer")
      const nextSearch = params.toString()
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`)
    }
    if (checkoutState === "success" || checkoutState === "cancelled") {
      setView("account")
      setNotice(null)
      setCheckoutNotice(checkoutState)
      params.delete("checkout")
      const nextSearch = params.toString()
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`)
    }

    // Si on arrive depuis la confirmation d'email (?confirmed=true), on attend 800ms
    // pour que les cookies de session aient le temps d'être établis dans le navigateur
    // avant de faire les appels API qui vérifient la session.
    const isConfirmed = params.get("confirmed") === "true"
    const delay = isConfirmed ? 800 : 0

    const loadStudio = () => {
      void refresh(params.get("creation") ?? undefined).catch((reason: unknown) => {
        if (reason instanceof Error && reason.message === "MIRAVA_REQUEST_FAILED") {
          window.location.replace(`/visual-engine/studio/login?next=${encodeURIComponent(authReturnPath)}`)
          return
        }
        setError(reason instanceof Error ? reason.message : (locale === "fr" ? "Impossible de charger MIRAVA." : "No se ha podido cargar MIRAVA."))
      })
    }

    if (delay > 0) {
      const timer = setTimeout(loadStudio, delay)
      return () => clearTimeout(timer)
    } else {
      loadStudio()
    }
  }, [isLocaleReady, locale, refresh])

  useEffect(() => {
    const syncViewFromHistory = () => {
      const params = new URLSearchParams(window.location.search)
      const requestedView = params.get("view")
      const requestedUniverse = getMiravaUniverse(params.get("preset"))
      const requestedReference = params.get("source") === "reference"
      const requestedOfferId = params.get("offer")
      if (requestedView === "identity") setView("account")
      else if (requestedView === "create" || requestedView === "universes" || requestedView === "library" || requestedView === "account") setView(requestedView)
      if (requestedUniverse) {
        setSelectedUniverseId(requestedUniverse.id)
        setEntryUniverseId(requestedUniverse.id)
      }
      if (requestedReference) setEntryIntent("reference")
      if (requestedOfferId) {
        setView("account")
        setHighlightedOfferId(requestedOfferId)
      }
    }
    window.addEventListener("popstate", syncViewFromHistory)
    return () => window.removeEventListener("popstate", syncViewFromHistory)
  }, [])

  const modalOpen = Boolean(captureContext) || directorOpen || consentTarget !== undefined

  useEffect(() => {
    const background = studioBackgroundRef.current
    if (!background) return
    background.inert = modalOpen
    return () => { background.inert = false }
  }, [modalOpen])

  useEffect(() => {
    if (!current || !pendingStatuses.includes(current.creation.status)) return
    const timer = window.setInterval(() => void refresh(current.creation.id), 2500)
    return () => window.clearInterval(timer)
  }, [current, refresh])

  const run = async (name: string, action: () => Promise<void>): Promise<boolean> => {
    setPending(name)
    setError(null)
    clearNotice()
    try {
      await action()
      return true
    } catch (reason) {
      setError(reason instanceof Error && reason.message !== "MIRAVA_REQUEST_FAILED" ? reason.message : (locale === "fr" ? "MIRAVA n’a pas pu terminer cette action." : "MIRAVA no ha podido completar esta acción."))
      if (typeof window !== "undefined") studioScrollRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      })
      return false
    } finally {
      setPending(null)
    }
  }

  const ready = Object.values(consents).every(Boolean)
  const selectView = (next: View) => {
    setDirectorOpen(false)
    clearNotice()
    setHighlightedOfferId(null)
    setView(next)
    window.history.pushState({}, "", `/visual-engine/studio?view=${next}`)
    // Bottom navigation changes the destination, not the scroll position of the
    // previous page. Starting at the top prevents the new screen title from
    // being hidden behind the persistent studio header on mobile.
    studioScrollRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    })
  }

  const openDirector = (trigger?: HTMLElement) => {
    directorTriggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setDirectorOpen(true)
  }

  const closeDirector = () => {
    setDirectorOpen(false)
    window.requestAnimationFrame(() => directorTriggerRef.current?.focus())
  }

  const openCapture = (context: "onboarding" | "replace" | "append") => {
    captureTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setCaptureContext(context)
  }

  const closeCapture = () => {
    setCaptureContext(null)
    window.requestAnimationFrame(() => captureTriggerRef.current?.focus())
  }

  const create = async (presetId?: string | null, referenceFile?: File | null) => {
    setConsentTarget(undefined)
    setConsentReference(null)
    await run("create", async () => {
      const data = await api<{ creation: Creation }>("/api/visual-engine/creations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageConfirmed: true,
          rightsConfirmed: true,
          privacyAccepted: true,
          openaiDisclosureAccepted: true,
          presetId: presetId ?? undefined,
          creativeOptions: options,
        }),
      })
      if (!presetId && referenceFile) {
        const form = new FormData()
        form.set("kind", "REFERENCE")
        form.set("file", referenceFile)
        await api(`/api/visual-engine/creations/${data.creation.id}/assets`, { method: "POST", body: form })
        await api(`/api/visual-engine/creations/${data.creation.id}/analyze`, { method: "POST" })
      }
      // A preset is immediately ready; a personal reference first enters the
      // durable analysis job and the worker queues its generation afterwards.
      if (presetId && isMiravaIdentityProfileReady(identityProfile)) {
        await api(`/api/visual-engine/creations/${data.creation.id}/generate`, { method: "POST" })
      }
      await refresh(data.creation.id)
    })
  }

  const requestCreate = (presetId?: string | null, brief?: string, referenceFile?: File | null) => {
    if (brief) setOptions((value) => ({ ...value, note: brief }))
    if (ready) {
      void create(presetId, referenceFile)
      return
    }
    setConsentTarget(presetId ?? null)
    setConsentReference(referenceFile ?? null)
  }

  const uploadReference = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !current) return
    await run("reference", async () => {
      const form = new FormData()
      form.set("kind", "REFERENCE")
      form.set("file", file)
      await api(`/api/visual-engine/creations/${current.creation.id}/assets`, { method: "POST", body: form })
      await refresh(current.creation.id)
    })
  }

  const prepareOnboardingSession = async (onboarding: MiravaOnboardingState, consent: MiravaIdentityConsent) => {
    const presetId = onboarding.direction?.primaryUniverseId ?? onboarding.universeIds[0]
    if (!presetId || !onboarding.identityConsentAt) throw new Error(locale === "fr" ? "Confirmez d’abord l’utilisation de vos photos." : "Confirma primero el uso de tus fotos.")

    // A network response can disappear after the server has recorded the first
    // session. Read the durable onboarding state before creating anything so a
    // retry resumes that exact session rather than leaving a second draft.
    const latestOnboarding = await api<{ onboarding: MiravaOnboardingState | null }>("/api/visual-engine/onboarding")
    if (latestOnboarding.onboarding?.status === "session_ready" && latestOnboarding.onboarding.firstSessionId) {
      setMiravaOnboarding(latestOnboarding.onboarding)
      // This call is intentionally idempotent server-side. It recovers the
      // narrow case where the session was saved but the first queue response
      // was lost before the browser could receive it.
      await api(`/api/visual-engine/creations/${latestOnboarding.onboarding.firstSessionId}/generate`, { method: "POST" })
      setCurrent(await api<Detail>(`/api/visual-engine/creations/${latestOnboarding.onboarding.firstSessionId}`))
      return latestOnboarding.onboarding.firstSessionId
    }

    const session = await api<{ creation: Creation }>("/api/visual-engine/creations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ageConfirmed: consent.ageConfirmed,
        rightsConfirmed: consent.rightsConfirmed,
        privacyAccepted: consent.privacyAccepted,
        openaiDisclosureAccepted: consent.openaiDisclosureAccepted,
        presetId,
        creativeOptions: { seriesSize: 1, note: onboarding.goal ? `onboarding:${onboarding.goal}` : "onboarding" },
      }),
    })
    const activation = await api<{ onboarding: MiravaOnboardingState }>("/api/visual-engine/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "session_ready", firstSessionId: session.creation.id }),
    })
    posthog.capture("first_session_created", { onboarding_version: onboarding.version, objective: onboarding.goal, primary_universe_id: presetId })
    // The onboarding direction is a preset and the private identity profile is
    // already complete. Queue the first image while the client confirms the
    // final activation, so there is no additional production choice to make.
    await api(`/api/visual-engine/creations/${session.creation.id}/generate`, { method: "POST" })
    setMiravaOnboarding(activation.onboarding)
    setCurrent(await api<Detail>(`/api/visual-engine/creations/${session.creation.id}`))
    return session.creation.id
  }

  const startOrResumeOnboarding = async (
    onboarding: MiravaOnboardingState,
  ) => {
    setMiravaOnboarding(onboarding)
    setPending("onboarding-activation")
    setError(null)
    clearNotice()

    try {
      /*
       * L'upload du Profil identité vient d'être finalisé par
       * MiravaStudioOnboarding. L'état React du Studio peut encore contenir
       * l'ancien profil null : toujours relire la source durable avant de
       * décider de rouvrir la capture.
       */
      const latestProfile =
        await api<{ profile: IdentityProfile }>(
          "/api/visual-engine/identity-profile",
        )

      setIdentityProfile(latestProfile.profile)

      if (
        !isMiravaIdentityProfileReady(
          latestProfile.profile,
        )
      ) {
        openCapture("onboarding")
        return
      }

      const creationId =
        await prepareOnboardingSession(
          onboarding,
          {
            ageConfirmed: true,
            rightsConfirmed: true,
            retentionAccepted: true,
            privacyAccepted: true,
            openaiDisclosureAccepted: true,
          },
        )

      await refresh(creationId)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : locale === "fr"
          ? "La première séance n’a pas pu être préparée."
          : "No se ha podido preparar la primera sesión.",
      )
    } finally {
      setPending(null)
    }
  }

  const uploadIdentityFiles = async (
    files: File[],
    consent?: MiravaIdentityConsent,
    mode: "replace" | "append" = "replace",
  ) => {
    const remaining = MIRAVA_MAX_IDENTITY_PHOTOS - (identityProfile?.assetCount ?? 0)
    const invalidCount = mode === "append"
      ? files.length < 1 || files.length > remaining
      : files.length < MIRAVA_MIN_IDENTITY_PHOTOS || files.length > MIRAVA_MAX_IDENTITY_PHOTOS
    if (invalidCount || (!current && !consent) || (captureContext === "onboarding" && (!consent?.privacyAccepted || !consent.openaiDisclosureAccepted))) {
      const msg = mode === "append"
        ? (locale === "fr" ? `Ajoutez entre une et ${Math.max(1, remaining)} photo(s).` : `Añade entre una y ${Math.max(1, remaining)} foto(s).`)
        : (locale === "fr" ? "Sélectionnez entre trois et dix photos." : "Selecciona entre tres y diez fotos.")
      setError(msg)
      throw new Error(msg)
    }
    setPending("identity")
    setError(null)
    clearNotice()
    try {
      let refreshCreationId =
        current?.creation.id

      const effectiveConsent =
        consent ?? {
          ageConfirmed: true,
          rightsConfirmed: true,
          retentionAccepted: true,
          privacyAccepted: true,
          openaiDisclosureAccepted: true,
        }

      await uploadMiravaIdentityProfile({
        files,
        consent: effectiveConsent,
        locale,
        mode,
        creationId: current?.creation.id,
      })
      if (captureContext === "onboarding" && miravaOnboarding && !isMiravaOnboardingCompleted(miravaOnboarding)) {
        if (!consent) throw new Error(locale === "fr" ? "Le consentement est requis avant de préparer la séance." : "Se requiere el consentimiento antes de preparar la sesión.")
        refreshCreationId = await prepareOnboardingSession(miravaOnboarding, consent)
      }
      closeCapture()
      await refresh(refreshCreationId)
    } catch (reason) {
      const msg = reason instanceof Error && reason.message !== "MIRAVA_REQUEST_FAILED" ? reason.message : (locale === "fr" ? "MIRAVA n’a pas pu enregistrer le profil." : "MIRAVA no ha podido guardar el perfil.")
      setError(msg)
      throw new Error(msg)
    } finally {
      setPending(null)
    }
  }

  const replaceIdentityAsset = async (
    assetId: string,
    file: File,
  ): Promise<boolean> =>
    run(
      `identity-asset-replace-${assetId}`,
      async () => {
        await uploadMiravaIdentityAsset({
          assetId,
          file,
          locale,
        })

        await refresh(
          current?.creation.id,
        )
      },
    )

  const deleteIdentityAsset = async (
    assetId: string,
  ): Promise<boolean> =>
    run(
      `identity-asset-delete-${assetId}`,
      async () => {
        await api(
          `/api/visual-engine/identity-profile/assets/${encodeURIComponent(assetId)}`,
          {
            method: "DELETE",
          },
        )

        await refresh(
          current?.creation.id,
        )
      },
    )

  const analyze = () => current && run("analyze", async () => { await api(`/api/visual-engine/creations/${current.creation.id}/analyze`, { method: "POST" }); await refresh(current.creation.id) })
  const generate = () => current && run("generate", async () => { await api(`/api/visual-engine/creations/${current.creation.id}/generate`, { method: "POST" }); await refresh(current.creation.id) })
  const reuse = (id: string) => run("reuse", async () => {
    const data = await api<{ creation: Creation }>(`/api/visual-engine/studios/${id}/creations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creativeOptions: options }) })
    selectView("create")
    await refresh(data.creation.id)
  })
  const applyAlmaDirection = async (suggestions: Partial<MiravaCreativeOptions>) => {
    const canApplyToCurrent = current && ["DRAFT", "ANALYSIS_QUEUED", "ANALYSING", "IDENTITY_READY"].includes(current.creation.status)
    if (!canApplyToCurrent) {
      setOptions((value) => ({ ...value, ...suggestions }))
      showNotice(locale === "fr" ? "Direction Alma prête pour votre prochaine séance. Votre création en cours reste inchangée." : "La dirección de Alma está lista para tu próxima sesión. Tu creación en curso no cambia.")
      return
    }

    const data = await api<{ creation: Creation }>(`/api/visual-engine/creations/${current.creation.id}/creative-options`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestions),
    })
    setOptions((value) => ({ ...value, ...suggestions }))
    setCurrent((value) => value ? { ...value, creation: { ...value.creation, ...data.creation } } : value)
    showNotice(locale === "fr" ? "Direction Alma enregistrée pour cette séance." : "Dirección de Alma guardada para esta sesión.")
  }
  const openReferenceFromAlma = () => {
    setDirectorOpen(false)
    // A reference defines a new reusable studio. Once a creation has an art
    // direction, it deliberately cannot accept a second reference; preserve it
    // in the gallery and start a clean, explicit custom-studio route instead.
    setCurrent(null)
    setEntryIntent("reference")
    setCreateStep(0)
    selectView("create")
    showNotice(locale === "fr" ? "Votre séance en cours reste dans votre galerie. Importez maintenant une inspiration pour créer un nouveau studio personnel." : "Tu sesión actual permanece en tu galería. Ahora importa una inspiración para crear un nuevo estudio personal.")
  }
  const removeCreation = () => current && run("delete", async () => { await api(`/api/visual-engine/creations/${current.creation.id}`, { method: "DELETE" }); setCurrent(null); await refresh() })
  const removeIdentity = () => run("identity-delete", async () => { await api("/api/visual-engine/identity-profile", { method: "DELETE" }); await refresh() })
  const checkout = (offerId: string) => run(`offer-${offerId}`, async () => { const data = await api<{ url: string }>("/api/visual-engine/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }) }); window.location.assign(data.url) })
  const portal = () => run("portal", async () => { const data = await api<{ url: string }>("/api/visual-engine/billing/portal", { method: "POST" }); window.location.assign(data.url) })
  // Mobile navigation deliberately contains destinations only. Universes and
  // Alma remain available in the creation flow, where their result can be
  // applied immediately instead of moving the client to a separate section.
  const bottomNavItems: BottomNavItem[] = [
    { id: "create", label: t.create, icon: <Camera /> },
    { id: "library", label: t.library, icon: <Images /> },
    { id: "account", label: t.account, icon: <CircleUserRound /> },
  ]
  const selectBottomNav = (id: string) => {
    if (id === "create" || id === "library" || id === "account") {
      setDirectorOpen(false)
      selectView(id)
    }
  }
  const isCreateFlow = view === "create" && !current && !directorOpen
  const sessionReadyForFlow = Boolean(options.seriesSize) && options.seriesSize! <= (account?.credits ?? 0) && (options.referenceMode !== "variations" || Boolean(options.variationAxes?.length))
  const nextStepDisabled = (createStep === 0 && entryIntent === "reference" && !options.referenceMode)
    || (createStep === 1 && !sessionReadyForFlow)
  const completeMiravaOnboarding = (state: MiravaOnboardingState, firstName: string) => {
    setMiravaOnboarding(state)
    setMiravaFirstName(firstName)
    const preferredUniverse = getMiravaUniverse(state.universeIds[0]) ?? MIRAVA_UNIVERSES[0]
    setSelectedUniverseId(preferredUniverse.id)
    setOptions((current) => current.seriesSize ? current : {
      ...current,
      seriesSize: 1,
    })
    setCreateStepValue(0)
    setFurthestCreateStep(0)
    if (state.firstSessionId) {
      posthog.capture("first_session_opened", { onboarding_version: state.version, objective: state.goal, primary_universe_id: state.direction?.primaryUniverseId })
      void refresh(state.firstSessionId)
    }
  }

  if (miravaOnboarding === undefined) {
    return <main lang={locale} className="mirava-theme mirava-app-shell bg-mirava-canvas text-mirava-ink"><MiravaGrain /><div className="mirava-ambient pointer-events-none fixed inset-0" /><div className="mirava-studio-loading" aria-label="Chargement de MIRAVA" /></main>
  }

  if (!isMiravaOnboardingCompleted(miravaOnboarding)) {
    return (
      <main lang={locale} className="mirava-theme mirava-app-shell bg-mirava-canvas text-mirava-ink">
        <MiravaGrain />
        <div className="mirava-ambient pointer-events-none fixed inset-0" />
        <div ref={studioBackgroundRef} aria-hidden={modalOpen ? true : undefined}>
          <MiravaStudioOnboarding key={miravaOnboarding?.updatedAt ?? "new"} locale={locale} firstName={miravaFirstName} initialUniverseId={entryUniverseId} initialState={miravaOnboarding} onStartCapture={(state) => void startOrResumeOnboarding(state)} onCompleted={completeMiravaOnboarding} />
        </div>
        {captureContext && <MiravaIdentityCapture locale={locale} context={captureContext} existingCount={0} initialConsentAccepted={Boolean(miravaOnboarding?.identityConsentAt)} onClose={closeCapture} onComplete={(files, consent) => uploadIdentityFiles(files, consent)} />}
      </main>
    )
  }

  return (
    <main lang={locale} className="mirava-theme mirava-app-shell mirava-native-shell bg-mirava-canvas text-mirava-ink">
      <MiravaGrain />
      <div className="mirava-ambient pointer-events-none fixed inset-0" />
      <div ref={studioBackgroundRef} aria-hidden={modalOpen ? true : undefined} className="mirava-native-frame">
      <Header
        brand={<Link href="/visual-engine" aria-label={locale === "fr" ? "Accueil MIRAVA Studio" : "Inicio MIRAVA Studio"} className="mirava-button mirava-button-quiet min-h-12 px-1"><MiravaWordmark /></Link>}
        desktopNavigation={
          <nav aria-label="Navigation principale" className="mirava-desktop-nav hidden items-center gap-1 p-1 lg:flex">
            <DesktopNavButton active={view === "create" && !directorOpen} primary label={t.create} onClick={() => { setDirectorOpen(false); selectView("create") }} />
            <DesktopNavButton active={view === "universes"} label={t.universesNav} onClick={() => selectView("universes")} />
            <DesktopNavButton active={view === "library"} label={t.library} onClick={() => selectView("library")} />
            <DesktopNavButton active={directorOpen} icon={<Image src="/visual-engine/alma-directrice.webp" alt="" width={20} height={20} />} label={t.directorNav} onClick={(event) => openDirector(event.currentTarget)} />
            <DesktopNavButton active={view === "account"} label={t.account} onClick={() => selectView("account")} />
          </nav>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="mirava-meta tabular-nums flex min-h-12 items-center px-3 py-2 font-jakarta text-[10px] font-semibold tracking-[.08em]">{account?.credits ?? 0} {t.credits}</span>
            <button aria-label={locale === "fr" ? "Passer en espagnol" : "Cambiar al francés"} onClick={() => setLocale(locale === "fr" ? "es" : "fr")} className="mirava-button mirava-button-secondary min-w-12 px-3 text-xs">{locale.toUpperCase()}</button>
          </div>
        }
        steps={view === "create" && !current ? studioStageCopy[locale].map(({ label }) => ({ label })) : undefined}
        activeStep={createStep}
        furthestStep={furthestCreateStep}
        onStepChange={setCreateStep}
        journeyBack={isCreateFlow && createStep > 0 ? <button type="button" onClick={() => setCreateStep(createStep - 1)} className="mirava-flow-button" aria-label={locale === "fr" ? "Retour à l’étape précédente" : "Volver al paso anterior"}><ArrowLeft className="h-4 w-4" /><span className="mirava-flow-button-copy">{locale === "fr" ? "Retour" : "Volver"}</span></button> : null}
        journeyNext={isCreateFlow && createStep < 2 ? <button type="button" onClick={() => setCreateStep(createStep + 1)} disabled={nextStepDisabled} className="mirava-flow-button mirava-flow-button-primary"><span>{locale === "fr" ? "Suivant" : "Siguiente"}</span><ArrowRight className="h-4 w-4" /></button> : null}
        stepsLabel={locale === "fr" ? "Étapes de création" : "Etapas de creación"}
      />

      <div ref={studioScrollRef} className="mirava-native-scroll">
        <div className="relative mx-auto max-w-6xl px-4 pt-4 sm:px-7 sm:pt-6">
        {error && <div role="alert" className="mirava-alert mb-6 flex gap-3 p-4 text-sm shadow-lg"><CircleAlert className="h-5 w-5 shrink-0" />{error}</div>}
        {displayedNotice && <div role="status" aria-live="polite" aria-atomic="true" className="mirava-notice mb-6 p-4 text-sm shadow-lg">{displayedNotice}</div>}
        {view === "create" && (!current
          ? <StartView locale={locale} t={t} firstName={miravaFirstName} step={createStep} selectedUniverseId={selectedUniverseId} setSelectedUniverseId={setSelectedUniverseId} options={options} setOptions={setOptions} identityProfile={identityProfile} availableCredits={account?.credits ?? 0} pending={pending} entryIntent={entryIntent} onCreate={requestCreate} onDirector={() => openDirector()} onOpenAccount={() => selectView("account")} onOpenCapture={() => openCapture(identityProfile ? (identityProfile.assetCount < MIRAVA_MAX_IDENTITY_PHOTOS ? "append" : "replace") : "onboarding")} />
          : <CreationView locale={locale} t={t} current={current} identityProfile={identityProfile} pending={pending} onUploadReference={uploadReference} onAnalyze={analyze} onOpenCapture={() => openCapture(identityProfile ? (identityProfile.assetCount < MIRAVA_MAX_IDENTITY_PHOTOS ? "append" : "replace") : "onboarding")} onGenerate={generate} onDelete={removeCreation} onContinue={(studioId) => void reuse(studioId)} />)}
        {view === "universes" && <UniversesView locale={locale} t={t} selectedUniverseId={selectedUniverseId} setSelectedUniverseId={setSelectedUniverseId} onChoose={(brief) => { setOptions((value) => ({ ...(value.seriesSize ? { seriesSize: value.seriesSize } : {}), ...(value.seriesSize && value.seriesSize > 1 && value.seriesStrategy ? { seriesStrategy: value.seriesStrategy } : {}), ...(brief ? { note: brief } : {}) })); setCreateStep(1); selectView("create") }} />}
        {view === "library" && <LibraryView locale={locale} t={t} studios={studios} creations={creations} onStartCreate={() => { setCurrent(null); setCreateStep(0); selectView("create") }} onReuse={(id) => void reuse(id)} onSelect={(id) => void run("select", async () => { setCurrent(await api<Detail>(`/api/visual-engine/creations/${id}`)); selectView("create") })} />}
        {view === "account" && <AccountView locale={locale} t={t} account={account} identityProfile={identityProfile} highlightedOfferId={highlightedOfferId} pending={pending} onCheckout={checkout} onPortal={portal} onStartCreate={() => { setCurrent(null); setCreateStep(0); selectView("create") }} onOpenCapture={() => openCapture(identityProfile ? "append" : "onboarding")} onReplaceIdentity={() => openCapture("replace")} onReplaceIdentityAsset={replaceIdentityAsset} onDeleteIdentityAsset={deleteIdentityAsset} onDeleteIdentity={removeIdentity} />}
        </div>
      </div>

      <BottomNavBar
        activeId={view}
        items={bottomNavItems}
        onValueChange={selectBottomNav}
        navigationLabel={locale === "fr" ? "Navigation MIRAVA" : "Navegación MIRAVA"}
        className="fixed inset-x-0 z-30 mx-auto lg:hidden"
      />

      {consentTarget !== undefined && <ConsentGate locale={locale} t={t} consents={consents} setConsents={setConsents} pending={pending} onClose={() => { setConsentTarget(undefined); setConsentReference(null) }} onConfirm={() => void create(consentTarget, consentReference)} />}
      {directorOpen && <MiravaCreativeDirector locale={locale} universeId={selectedUniverseId} options={options} onApply={applyAlmaDirection} onOpenReference={openReferenceFromAlma} onClose={closeDirector} />}
      </div>
      {captureContext && <MiravaIdentityCapture locale={locale} context={captureContext} existingCount={identityProfile?.assetCount ?? 0} initialConsentAccepted={true} onClose={closeCapture} onComplete={(files, consent) => uploadIdentityFiles(files, consent, captureContext === "append" ? "append" : "replace")} />}
    </main>
  )
}

function ReferenceUpload({ locale, referenceFile, onChoose }: { locale: Locale; referenceFile: File | null; onChoose: (file: File | null) => void }) {
  return (
    <label className="mirava-upload mt-3 flex min-h-28 cursor-pointer items-center gap-4 p-5">
      <span className="mirava-surface-raised grid h-12 w-12 shrink-0 place-items-center"><Upload className="h-5 w-5 text-mirava-accent" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-jakarta text-sm font-semibold">{locale === "fr" ? "Partir de ma référence" : "Partir de mi referencia"}</span>
        <span className="mirava-muted mt-1 block truncate text-xs">{referenceFile ? (locale === "fr" ? "1 image sélectionnée · appuyez pour la remplacer" : "1 imagen seleccionada · pulsa para reemplazarla") : (locale === "fr" ? "Une image suffit · JPG, PNG ou WebP" : "Una imagen basta · JPG, PNG o WebP")}</span>
      </span>
      {referenceFile && <Check className="h-5 w-5 shrink-0 text-mirava-success" />}
      <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onChoose(event.target.files?.[0] ?? null)} />
    </label>
  )
}

function StartView({
  locale,
  t,
  firstName,
  step,
  selectedUniverseId,
  setSelectedUniverseId,
  options,
  setOptions,
  identityProfile,
  availableCredits,
  pending,
  entryIntent,
  onCreate,
  onDirector,
  onOpenAccount,
  onOpenCapture,
}: {
  locale: Locale
  t: Copy
  firstName: string | null
  step: number
  selectedUniverseId: string
  setSelectedUniverseId: (id: typeof MIRAVA_UNIVERSES[number]["id"]) => void
  options: MiravaCreativeOptions
  setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>>
  identityProfile: IdentityProfile
  availableCredits: number
  pending: string | null
  entryIntent: "reference" | null
  onCreate: (presetId?: string | null, brief?: string, referenceFile?: File | null) => void
  onDirector: () => void
  onOpenAccount: () => void
  onOpenCapture: () => void
}) {
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const universeRowRef = useRef<HTMLDivElement>(null)
  const selected = getMiravaUniverse(selectedUniverseId) ?? MIRAVA_UNIVERSES[0]
  const identityReady = isMiravaIdentityProfileReady(identityProfile)
  const stageCopy = studioStageCopy[locale]
  const creationCount = options.seriesSize ?? 1
  const createActionLabel = locale === "fr"
    ? creationCount === 1 ? "Créer mon image" : `Créer mes ${creationCount} photos`
    : creationCount === 1 ? "Crear mi imagen" : `Crear mis ${creationCount} fotos`
  const isReferenceRoute = step === 0 && entryIntent === "reference"
  const stageTitle = isReferenceRoute
    ? locale === "fr"
      ? firstName ? `${firstName}, quelle image vous inspire ?` : "Quelle image vous inspire ?"
      : firstName ? `${firstName}, ¿qué imagen te inspira?` : "¿Qué imagen te inspira?"
    : step === 0 && firstName
    ? locale === "fr" ? `${firstName}, où voulez-vous être vue ?` : `${firstName}, ¿dónde quieres que te vean?`
    : stageCopy[step].title
  const stageText = step === 0 && referenceFile
    ? locale === "fr" ? "Votre inspiration est sélectionnée. Passez à la séance pour choisir la fidélité et le format de vos images." : "Tu inspiración está seleccionada. Pasa a la sesión para elegir la fidelidad y el formato de tus imágenes."
    : isReferenceRoute
      ? locale === "fr" ? "Ajoutez une image qui exprime le décor, la lumière ou l’énergie que vous voulez retrouver." : "Añade una imagen que exprese el escenario, la luz o la energía que quieres recrear."
    : stageCopy[step].text

  const keepFormat = (current: MiravaCreativeOptions): MiravaCreativeOptions => ({
    ...(current.seriesSize ? { seriesSize: current.seriesSize } : {}),
    ...(current.seriesSize && current.seriesSize > 1 && current.seriesStrategy ? { seriesStrategy: current.seriesStrategy } : {}),
  })
  const chooseUniverse = (id: typeof MIRAVA_UNIVERSES[number]["id"]) => {
    setReferenceFile(null)
    setSelectedUniverseId(id)
    setOptions((current) => keepFormat(current))
  }
  const chooseReference = (file: File | null) => {
    setReferenceFile(file)
    setOptions((current) => file ? { ...keepFormat(current), referenceMode: "faithful" } : keepFormat(current))
  }

  useEffect(() => {
    if (!referenceFile) {
      setReferencePreview(null)
      return
    }
    const url = URL.createObjectURL(referenceFile)
    setReferencePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [referenceFile])

  useEffect(() => {
    if (step !== 0 || referenceFile) return
    universeRowRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "nearest",
    })
  }, [referenceFile, selectedUniverseId, step])

  const activeAdjustments = [options.location, options.styling, options.energy, options.photoStyle].filter(Boolean) as string[]
  const variationLabels = options.variationAxes?.map((axis) => ({
    location: locale === "fr" ? "décor" : "escenario",
    styling: locale === "fr" ? "tenue" : "estilismo",
    light: locale === "fr" ? "lumière" : "luz",
    framing: locale === "fr" ? "cadrage" : "encuadre",
  })[axis]) ?? []

  return (
    <section className="mirava-onboarding mx-auto max-w-5xl pb-12 pt-5 sm:pt-9">
      <div className="mirava-onboarding-heading relative mb-8 max-w-3xl" data-step={`0${step + 1}`}>
        <p className="mirava-label">MIRAVA / {stageCopy[step].label}</p>
        <h1 className="mirava-section-title mt-3 text-4xl sm:text-6xl"><BlurText text={stageTitle} /></h1>
        <p className="mirava-copy mt-4 max-w-2xl text-sm leading-6 sm:text-base">{stageText}</p>
      </div>

      {step === 0 && (
        <div>
          {entryIntent === "reference" && !referenceFile && <div className="mirava-notice mb-4 border border-mirava-accent/40 p-4 text-sm" role="status">{locale === "fr" ? "Votre studio commence avec votre photo d’inspiration. Ajoutez-la ici, puis MIRAVA vous guidera pour la suite." : "Tu estudio empieza con tu foto de inspiración. Añádela aquí y MIRAVA te guiará después."}</div>}
          {entryIntent === "reference" && <ReferenceUpload locale={locale} referenceFile={referenceFile} onChoose={chooseReference} />}
          {!referenceFile && entryIntent !== "reference" && <div ref={universeRowRef} className="mirava-scroll-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
            {MIRAVA_UNIVERSES.map((universe) => (
              <UniverseCard key={universe.id} universe={universe} locale={locale} selected={selected.id === universe.id} onClick={() => chooseUniverse(universe.id)} />
            ))}
          </div>}
          {entryIntent !== "reference" && <ReferenceUpload locale={locale} referenceFile={referenceFile} onChoose={chooseReference} />}
          {referenceFile && <button onClick={() => chooseReference(null)} className="mirava-button mirava-button-quiet mt-2 px-3 text-xs">{locale === "fr" ? "Retirer la référence" : "Quitar la referencia"}</button>}
        </div>
      )}

      {step === 1 && (
        <div>
          <button onClick={onDirector} className="mirava-alma-card flex w-full items-center gap-4 p-4 text-left sm:p-5">
            <Image src="/visual-engine/alma-directrice.webp" alt="Alma" width={72} height={72} className="mirava-alma-avatar h-16 w-16 shrink-0 object-cover" />
            <span className="min-w-0 flex-1">
              <span className="mirava-label block">ALMA / {locale === "fr" ? "DIRECTRICE CRÉATIVE" : "DIRECTORA CREATIVA"}</span>
              <span className="mt-2 block font-jakarta text-lg font-semibold">{locale === "fr" ? "Concevoir votre séance avec Alma" : "Diseñar tu sesión con Alma"}</span>
              <span className="mirava-copy mt-1 block text-xs leading-5">{locale === "fr" ? "Alma vous aide à préciser une campagne, une série ou une direction sur-mesure, puis à l’appliquer à votre séance." : "Alma te ayuda a definir una campaña, una serie o una dirección a medida, y a aplicarla a tu sesión."}</span>
            </span>
            <MessageCircle className="h-5 w-5 shrink-0 text-mirava-accent" />
          </button>
          <CreativeControls locale={locale} universe={selected} referencePreview={referencePreview} isReference={Boolean(referenceFile)} options={options} setOptions={setOptions} availableCredits={availableCredits} onOpenAccount={onOpenAccount} />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="mirava-dark-panel relative min-h-[26rem] overflow-hidden">
            {referencePreview ? <img src={referencePreview} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <Image src={selected.image} alt="" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />}
            <div className="mirava-media-overlay absolute inset-0" />
            <div className="absolute inset-x-5 bottom-5">
              <p className="mirava-label">{referenceFile ? (locale === "fr" ? "RÉFÉRENCE PERSONNELLE" : "REFERENCIA PERSONAL") : selected.eyebrow[locale]}</p>
              <h2 className="mt-2 font-jakarta text-3xl font-semibold">{referenceFile ? (locale === "fr" ? "Votre référence" : "Tu referencia") : selected.name[locale]}</h2>
            </div>
          </div>
          <Surface className="flex flex-col">
            <p className="mirava-label">{locale === "fr" ? "RÉCAPITULATIF" : "RESUMEN"}</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Source créative" : "Fuente creativa"}</dt><dd className="mt-1 font-semibold">{referenceFile ? (locale === "fr" ? "Référence personnelle" : "Referencia personal") : selected.name[locale]}</dd></div>
              <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Format" : "Formato"}</dt><dd className="mt-1 font-semibold">{options.seriesSize ? `${options.seriesSize} ${locale === "fr" ? "photo(s)" : "foto(s)"}` : "—"}</dd></div>
              <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Style choisi" : "Estilo elegido"}</dt><dd className="mt-1 font-semibold">{referenceFile ? (options.referenceMode === "variations" ? (locale === "fr" ? `Variations : ${variationLabels.join(", ") || "à préciser"}` : `Variaciones: ${variationLabels.join(", ") || "por precisar"}`) : (locale === "fr" ? "Fidèle à la référence" : "Fiel a la referencia")) : selected.creativeDirection.photoStyle[locale]}</dd></div>
              {!referenceFile && <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Ajustements" : "Ajustes"}</dt><dd className="mt-1 font-semibold">{activeAdjustments.length ? activeAdjustments.join(" · ") : (locale === "fr" ? "Aucun ajustement" : "Sin ajustes")}</dd></div>}
              <div><dt className="mirava-muted text-xs">{t.profile}</dt><dd className="mt-1 flex items-center gap-2 font-semibold">{identityReady ? <><Check className="h-4 w-4 text-mirava-success" />{locale === "fr" ? "Prêt" : "Listo"} · {identityProfile?.assetCount ?? 0}/{MIRAVA_MAX_IDENTITY_PHOTOS}</> : <>{locale === "fr" ? "À préparer avant la création" : "Por preparar antes de crear"}</>}</dd></div>
            </dl>
            {identityReady ? <IdentityProfilePreview identityProfile={identityProfile} locale={locale} onManage={onOpenCapture} className="mt-6" /> : null}
            {identityReady ? <button onClick={() => onCreate(referenceFile ? null : selected.id, undefined, referenceFile)} disabled={!options.seriesSize || options.seriesSize > availableCredits || pending === "create"} className="mirava-button mirava-button-primary mt-8 w-full gap-2 px-5 text-sm lg:mt-auto">{pending === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{createActionLabel}</button> : <><button onClick={onOpenCapture} className="mirava-button mirava-button-primary mt-8 w-full gap-2 px-5 text-sm lg:mt-auto"><Camera className="h-4 w-4" />{locale === "fr" ? "Préparer mon Profil identité" : "Preparar mi Perfil de identidad"}</button><p className="mirava-muted mt-3 text-xs leading-5">{locale === "fr" ? "Trois photos privées suffisent ; vous reviendrez ensuite directement à cette création." : "Bastan tres fotos privadas; después volverás directamente a esta creación."}</p></>}
          </Surface>
        </div>
      )}

    </section>
  )
}

function IdentityProfilePreview({
  identityProfile,
  locale,
  onManage,
  className,
}: {
  identityProfile: IdentityProfile
  locale: Locale
  onManage: () => void
  className?: string
}) {
  if (!identityProfile?.previews?.length) return null
  const manageLabel = locale === "fr" ? "Gérer mes photos d’identité" : "Gestionar mis fotos de identidad"
  return <div className={cn("mirava-identity-review", className)}>
    <div className="mirava-identity-review-photos">
      {identityProfile.previews.map((preview, index) => <button key={preview.id} type="button" onClick={onManage} title={manageLabel} className="mirava-identity-review-photo"><img src={preview.url} alt={locale === "fr" ? `Photo identité ${index + 1}` : `Foto de identidad ${index + 1}`} /></button>)}
    </div>
    <button type="button" onClick={onManage} className="mirava-button mirava-button-quiet mt-3 px-0 text-xs">{manageLabel}</button>
  </div>
}

function UniverseCard({ universe, locale, selected, onClick }: { universe: MiravaUniverse; locale: Locale; selected: boolean; onClick: () => void }) {
  return (
    <button aria-pressed={selected} onClick={onClick} className={cn("mirava-image-frame group relative min-w-[72vw] snap-center overflow-hidden border bg-mirava-canvas-raised text-left transition-[border-color,box-shadow] duration-150 sm:min-w-0", selected ? "border-mirava-ink ring-2 ring-mirava-ink/15" : "border-mirava-line")}>
      <div className="relative aspect-[9/16] bg-black overflow-hidden">
        <Image src={universe.image} alt={universe.name[locale]} fill priority={universe.id === "escapade-solaire"} sizes="(max-width: 640px) 72vw, (max-width: 1024px) 45vw, 24vw" className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.025]" />
        <div className="mirava-media-overlay absolute inset-0 z-10" />
        <div className="absolute inset-x-4 bottom-4 text-mirava-ink z-20">
          <p className="text-[9px] font-semibold tracking-[.14em] text-mirava-ink/60">{universe.eyebrow[locale]}</p>
          <p className="mt-1 font-jakarta text-xl font-semibold tracking-[-.045em]">{universe.name[locale]}</p>
          <p className="mt-1 text-xs leading-5 text-mirava-ink/65">{universe.tagline[locale]}</p>
        </div>
        {selected && <span className="mirava-control absolute right-3 top-3 z-20 grid h-9 min-h-0 w-9 place-items-center border-mirava-ink bg-mirava-ink text-mirava-canvas"><Check className="h-4 w-4" /></span>}
      </div>
    </button>
  )
}

function CreativeControls({ locale, universe, isReference, referencePreview, options, setOptions, availableCredits, onOpenAccount }: { locale: Locale; universe: MiravaUniverse; isReference: boolean; referencePreview: string | null; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>>; availableCredits: number; onOpenAccount: () => void }) {
  return (
    <div className="mt-7 grid gap-3">
      <SessionFormatPicker locale={locale} options={options} setOptions={setOptions} availableCredits={availableCredits} onOpenAccount={onOpenAccount} />
      {isReference
        ? <ReferenceFidelity locale={locale} referencePreview={referencePreview} options={options} setOptions={setOptions} />
        : <>
            <CreativeDirectionSummary locale={locale} universe={universe} />
            <UniverseRefinement locale={locale} universe={universe} options={options} setOptions={setOptions} />
          </>}
      {options.seriesSize && options.seriesSize > 1 ? <SeriesDirection locale={locale} options={options} setOptions={setOptions} /> : null}
      <Surface className="mirava-material-subtle">
        <label htmlFor="mirava-note" className="mirava-copy text-xs font-semibold">{locale === "fr" ? "Une précision à transmettre ?" : "¿Alguna precisión que transmitir?"}</label>
        <p className="mirava-muted mt-1 text-xs leading-5">{locale === "fr" ? "Facultatif · uniquement si votre intention n’est pas déjà visible dans la direction." : "Opcional · solo si tu intención aún no está visible en la dirección."}</p>
        <textarea id="mirava-note" value={options.note ?? ""} onChange={(event) => setOptions((value) => ({ ...value, note: event.target.value }))} maxLength={180} rows={3} placeholder={locale === "fr" ? "Ex. Plus spontané, comme une image prise entre deux moments…" : "Ej. Más espontáneo, como una imagen tomada entre dos momentos…"} className="mirava-input mt-3 min-h-28 w-full resize-none p-4 leading-6" />
        <p className="mirava-muted mt-2 text-right text-[10px]">{options.note?.length ?? 0}/180</p>
      </Surface>
    </div>
  )
}

function SessionFormatPicker({ locale, options, setOptions, availableCredits, onOpenAccount }: { locale: Locale; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>>; availableCredits: number; onOpenAccount: () => void }) {
  const seriesOptions = [
    { value: 1 as const, label: locale === "fr" ? "Image signature" : "Imagen insignia", detail: locale === "fr" ? "1 crédit" : "1 crédito" },
    ...([2, 3, 4, 5, 6] as const).map((value) => ({
      value,
      label: locale === "fr" ? `${value} photos` : `${value} fotos`,
      detail: locale === "fr" ? `${value} crédits` : `${value} créditos`,
    })),
  ]
  return (
    <Surface className="mirava-material-mineral">
        <div className="flex items-center justify-between gap-4">
          <div><p className="mirava-label">{locale === "fr" ? "ÉTAPE OBLIGATOIRE" : "PASO OBLIGATORIO"}</p><h2 className="mt-2 font-jakarta text-xl font-semibold tracking-[-.04em]">{locale === "fr" ? "Format de la séance" : "Formato de la sesión"}</h2></div>
          <span className="mirava-required-mark text-[10px] font-semibold uppercase tracking-[.12em]">{options.seriesSize
            ? (locale === "fr" ? `${options.seriesSize} ${options.seriesSize === 1 ? "image" : "images"} · ${options.seriesSize} crédit${options.seriesSize > 1 ? "s" : ""}` : `${options.seriesSize} ${options.seriesSize === 1 ? "imagen" : "imágenes"} · ${options.seriesSize} crédito${options.seriesSize > 1 ? "s" : ""}`)
            : (locale === "fr" ? "À choisir" : "Por elegir")}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {seriesOptions.map((item) => {
            const unavailable = item.value > availableCredits
            return (
            <button
              key={item.value}
              onClick={() => setOptions((current) => ({ ...current, seriesSize: item.value, seriesStrategy: item.value > 1 ? (current.seriesStrategy ?? "single-setting") : undefined }))}
              disabled={unavailable}
              aria-pressed={options.seriesSize === item.value}
              aria-label={unavailable
                ? (locale === "fr" ? `${item.label} · ${item.detail} requis · ${availableCredits} disponible${availableCredits > 1 ? "s" : ""}` : `${item.label} · requiere ${item.detail} · ${availableCredits} disponible${availableCredits === 1 ? "" : "s"}`)
                : undefined}
              data-selected={options.seriesSize === item.value}
              className="mirava-control min-h-20 p-3 text-left transition-[background-color,border-color,color] duration-150"
            >
              <span className="block text-xs font-semibold">{item.label}</span>
              <span className={cn("mt-1 block text-[10px]", options.seriesSize === item.value ? "text-mirava-canvas/60" : "mirava-muted")}>{item.detail}</span>
            </button>
            )
          })}
        </div>
        <p className="mirava-copy mt-3 text-xs leading-5">
          {locale === "fr"
            ? "Le format détermine le nombre d’images livrées et les crédits utilisés."
            : "El formato determina el número de imágenes entregadas y los créditos utilizados."}
        </p>
        {availableCredits < 6 && <p className="mirava-muted mt-3 text-xs leading-5">{locale === "fr"
          ? <>Votre solde permet jusqu’à {availableCredits} photo{availableCredits > 1 ? "s" : ""}. <button type="button" onClick={onOpenAccount} className="font-semibold underline underline-offset-4">Ajouter des crédits</button></>
          : <>Tu saldo permite hasta {availableCredits} foto{availableCredits === 1 ? "" : "s"}. <button type="button" onClick={onOpenAccount} className="font-semibold underline underline-offset-4">Añadir créditos</button></>}</p>}
    </Surface>
  )
}

function CreativeDirectionSummary({ locale, universe }: { locale: Locale; universe: MiravaUniverse }) {
  const direction = universe.creativeDirection
  const rows = [
    { label: locale === "fr" ? "Décor" : "Escenario", value: direction.location[locale] },
    { label: locale === "fr" ? "Allure" : "Estilo", value: direction.styling[locale] },
    { label: locale === "fr" ? "Attitude" : "Actitud", value: direction.energy[locale] },
    { label: locale === "fr" ? "Lumière" : "Luz", value: direction.light[locale] },
  ]
  return (
    <section className="mirava-direction-brief">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mirava-label">MIRAVA / {locale === "fr" ? "DIRECTION SÉLECTIONNÉE" : "DIRECCIÓN SELECCIONADA"}</p>
          <h2 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-.055em]">{universe.name[locale]}</h2>
        </div>
        <p className="mirava-direction-source">{locale === "fr" ? "Composition MIRAVA" : "Composición MIRAVA"}</p>
      </div>
      <p className="mirava-copy mt-3 max-w-2xl text-sm leading-6">{locale === "fr" ? "Votre séance est déjà composée. Conservez cette direction ou ajustez un seul détail plus bas." : "Tu sesión ya está compuesta. Conserva esta dirección o ajusta un solo detalle más abajo."}</p>
      <dl className="mirava-direction-cues mt-6">
        {rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
      </dl>
    </section>
  )
}

function UniverseRefinement({ locale, universe, options, setOptions }: { locale: Locale; universe: MiravaUniverse; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>> }) {
  const [expanded, setExpanded] = useState(false)
  const groups = [
    { key: "location" as const, label: locale === "fr" ? "Décor" : "Escenario", values: universe.creativeDirection.refinements.locations[locale] },
    { key: "styling" as const, label: locale === "fr" ? "Allure" : "Estilo", values: universe.creativeDirection.refinements.stylings[locale] },
    { key: "energy" as const, label: locale === "fr" ? "Attitude" : "Actitud", values: universe.creativeDirection.refinements.energies[locale] },
    { key: "photoStyle" as const, label: locale === "fr" ? "Lumière" : "Luz", values: universe.creativeDirection.refinements.lights[locale] },
  ]
  const hasOverrides = groups.some((group) => Boolean(options[group.key]))
  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="mirava-refinement-shell mirava-material-subtle p-4 sm:p-5">
      <CollapsibleTrigger asChild>
        <button className="flex min-h-12 w-full items-center justify-between gap-4 text-left">
          <span><span className="block font-jakarta text-sm font-semibold">{locale === "fr" ? "Ajuster cette direction" : "Ajustar esta dirección"}</span><span className="mirava-muted mt-1 block text-xs">{locale === "fr" ? "Facultatif · MIRAVA décide si vous ne changez rien" : "Opcional · MIRAVA decide si no cambias nada"}</span></span>
          <span className="mirava-meta min-w-12 px-3 py-2 text-center text-[10px] font-semibold">{hasOverrides ? (locale === "fr" ? "Modifiée" : "Modificada") : (expanded ? "−" : "+")}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mirava-collapsible-content">
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {groups.map((group) => <div key={group.key}>
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{group.label}</p>{options[group.key] ? <button onClick={() => setOptions((current) => ({ ...current, [group.key]: undefined }))} className="mirava-button mirava-button-quiet min-h-0 px-1 py-1 text-[10px]">{locale === "fr" ? "Laisser MIRAVA décider" : "Dejar decidir a MIRAVA"}</button> : null}</div>
          <div className="mt-2 flex flex-wrap gap-2">{group.values.map((value) => <button key={value} aria-pressed={options[group.key] === value} onClick={() => setOptions((current) => ({ ...current, [group.key]: current[group.key] === value ? undefined : value }))} data-selected={options[group.key] === value} className="mirava-control min-h-12 px-3.5 text-xs font-semibold">{value}</button>)}</div>
        </div>)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ReferenceFidelity({ locale, referencePreview, options, setOptions }: { locale: Locale; referencePreview: string | null; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>> }) {
  const mode = options.referenceMode ?? "faithful"
  const axes = [
    { key: "location" as const, label: locale === "fr" ? "Décor" : "Escenario" },
    { key: "styling" as const, label: locale === "fr" ? "Tenue" : "Estilismo" },
    { key: "light" as const, label: locale === "fr" ? "Lumière" : "Luz" },
    { key: "framing" as const, label: locale === "fr" ? "Cadrage" : "Encuadre" },
  ]
  const selectMode = (value: string) => {
    if (value === "faithful") setOptions((current) => ({ ...current, referenceMode: "faithful", variationAxes: undefined }))
    if (value === "variations") setOptions((current) => ({ ...current, referenceMode: "variations", variationAxes: current.variationAxes ?? [] }))
  }
  return (
    <section className="mirava-reference-direction mirava-material-spotlight overflow-hidden p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
        <div className="mirava-image-frame relative aspect-[4/5] overflow-hidden bg-mirava-canvas-raised">{referencePreview ? <img src={referencePreview} alt="" className="h-full w-full object-cover" /> : null}</div>
        <div><p className="mirava-label">{locale === "fr" ? "RÉFÉRENCE PERSONNELLE" : "REFERENCIA PERSONAL"}</p><h2 className="mt-2 font-jakarta text-2xl font-semibold tracking-[-.05em]">{locale === "fr" ? "Quelle fidélité souhaitez-vous ?" : "¿Qué fidelidad deseas?"}</h2><p className="mirava-copy mt-2 text-xs leading-5">{locale === "fr" ? "Votre image est la source de vérité. MIRAVA ne remplace aucun de ses choix sans votre accord." : "Tu imagen es la fuente de verdad. MIRAVA no sustituye ninguna decisión sin tu acuerdo."}</p></div>
      </div>
      <RadioGroup value={mode} onValueChange={selectMode} className="mt-5 grid gap-2 sm:grid-cols-2" aria-label={locale === "fr" ? "Fidélité à la référence" : "Fidelidad a la referencia"}>
        <label data-selected={mode === "faithful"} className="mirava-choice-card relative min-h-24 p-4 text-left"><RadioGroupItem value="faithful" className="absolute inset-0 z-10 h-full w-full aspect-auto cursor-pointer rounded-[var(--mirava-radius)] opacity-0" /><span className="block text-sm font-semibold">{locale === "fr" ? "Rester fidèle à cette image" : "Mantenerme fiel a esta imagen"}</span><span className="mirava-choice-copy mt-1 block text-xs leading-5">{locale === "fr" ? "Décor, lumière et allure restent inchangés." : "Escenario, luz y estilo permanecen intactos."}</span></label>
        <label data-selected={mode === "variations"} className="mirava-choice-card relative min-h-24 p-4 text-left"><RadioGroupItem value="variations" className="absolute inset-0 z-10 h-full w-full aspect-auto cursor-pointer rounded-[var(--mirava-radius)] opacity-0" /><span className="block text-sm font-semibold">{locale === "fr" ? "Créer des variations" : "Crear variaciones"}</span><span className="mirava-choice-copy mt-1 block text-xs leading-5">{locale === "fr" ? "Vous choisissez précisément ce qui peut évoluer." : "Tú eliges exactamente qué puede cambiar."}</span></label>
      </RadioGroup>
      {mode === "variations" ? <div className="mt-5"><p className="text-xs font-semibold">{locale === "fr" ? "Que peut faire varier MIRAVA ?" : "¿Qué puede variar MIRAVA?"}</p><div className="mt-2 flex flex-wrap gap-2">{axes.map((axis) => { const selected = options.variationAxes?.includes(axis.key) ?? false; return <button key={axis.key} aria-pressed={selected} onClick={() => setOptions((current) => ({ ...current, variationAxes: selected ? (current.variationAxes ?? []).filter((item) => item !== axis.key) : [...(current.variationAxes ?? []), axis.key] }))} data-selected={selected} className="mirava-control min-h-12 px-4 text-xs font-semibold">{axis.label}</button> })}</div>{!options.variationAxes?.length ? <p className="mirava-warning-copy mt-3 text-xs">{locale === "fr" ? "Choisissez au moins une dimension à faire varier." : "Elige al menos una dimensión para variar."}</p> : null}</div> : null}
    </section>
  )
}

function SeriesDirection({ locale, options, setOptions }: { locale: Locale; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>> }) {
  const strategy = options.seriesStrategy ?? "single-setting"
  const selectStrategy = (value: string) => {
    if (value === "single-setting" || value === "varied-settings") setOptions((current) => ({ ...current, seriesStrategy: value }))
  }
  return (
    <Surface className="mirava-material-mineral">
      <p className="mirava-label">{locale === "fr" ? "RYTHME DE LA SÉRIE" : "RITMO DE LA SERIE"}</p>
      <h2 className="mt-2 font-jakarta text-xl font-semibold tracking-[-.04em]">{locale === "fr" ? "Comment faire vivre les décors ?" : "¿Cómo hacer vivir los escenarios?"}</h2>
      <RadioGroup value={strategy} onValueChange={selectStrategy} className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={locale === "fr" ? "Rythme de la série" : "Ritmo de la serie"}>
        <label data-selected={strategy === "single-setting"} className="mirava-choice-card relative min-h-24 p-4 text-left"><RadioGroupItem value="single-setting" className="absolute inset-0 z-10 h-full w-full aspect-auto cursor-pointer rounded-[var(--mirava-radius)] opacity-0" /><span className="block text-sm font-semibold">{locale === "fr" ? "Un décor principal" : "Un escenario principal"}</span><span className="mirava-choice-copy mt-1 block text-xs leading-5">{locale === "fr" ? "MIRAVA varie les sous-lieux, poses et lumières." : "MIRAVA varía sublugares, poses y luces."}</span></label>
        <label data-selected={strategy === "varied-settings"} className="mirava-choice-card relative min-h-24 p-4 text-left"><RadioGroupItem value="varied-settings" className="absolute inset-0 z-10 h-full w-full aspect-auto cursor-pointer rounded-[var(--mirava-radius)] opacity-0" /><span className="block text-sm font-semibold">{locale === "fr" ? "Plusieurs décors liés" : "Varios escenarios relacionados"}</span><span className="mirava-choice-copy mt-1 block text-xs leading-5">{locale === "fr" ? "Chaque décor reste cohérent avec le même univers." : "Cada escenario sigue siendo coherente con el mismo universo."}</span></label>
      </RadioGroup>
    </Surface>
  )
}

function ConsentGate({ locale, t, consents, setConsents, pending, onClose, onConfirm }: { locale: Locale; t: Copy; consents: Consents; setConsents: Dispatch<SetStateAction<Consents>>; pending: string | null; onClose: () => void; onConfirm: () => void }) {
  const rows: Array<[keyof Consents, string]> = [["adult", t.adult], ["rights", t.rights], ["privacy", t.privacy], ["provider", t.provider]]
  const ready = Object.values(consents).every(Boolean)
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mirava-modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-5" />
        <DialogPrimitive.Content className="mirava-modal fixed inset-x-0 bottom-0 z-50 max-h-dvh w-full max-w-xl overflow-y-auto p-5 outline-none sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:max-h-[94dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-7">
        <div className="flex items-start justify-between">
          <div><p className="mirava-label">MIRAVA / {locale === "fr" ? "ACCÈS PRIVÉ" : "ACCESO PRIVADO"}</p><DialogPrimitive.Title className="mirava-section-title mt-2 text-3xl">{t.consent}</DialogPrimitive.Title></div>
          <button onClick={onClose} aria-label={locale === "fr" ? "Fermer" : "Cerrar"} className="mirava-button mirava-button-secondary h-12 w-12"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 space-y-2">
          {rows.map(([key, label]) => (
            <label key={key} className="mirava-control flex min-h-14 cursor-pointer gap-3 p-4 text-sm leading-5">
              <input type="checkbox" checked={consents[key]} onChange={() => setConsents((value) => ({ ...value, [key]: !value[key] }))} className="mt-0.5 h-4 w-4 accent-mirava-accent" />
              {label}
            </label>
          ))}
        </div>
        <button onClick={onConfirm} disabled={!ready || pending === "create"} className="mirava-button mirava-button-primary mt-6 min-h-13 w-full gap-2 px-5 text-sm">
          {pending === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {t.enter}
        </button>
        <DialogPrimitive.Description className="mirava-muted mt-4 text-center text-[10px] leading-4">{locale === "fr" ? "Le consentement ne contourne jamais les règles de sécurité du fournisseur." : "El consentimiento nunca elude las reglas de seguridad del proveedor."}</DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CreationView({
  locale,
  t,
  current,
  identityProfile,
  pending,
  onUploadReference,
  onAnalyze,
  onOpenCapture,
  onGenerate,
  onDelete,
  onContinue,
}: {
  locale: Locale
  t: Copy
  current: Detail
  identityProfile: IdentityProfile
  pending: string | null
  onUploadReference: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onAnalyze: () => void
  onOpenCapture: () => void
  onGenerate: () => void
  onDelete: () => void
  onContinue: (studioId: string) => void
}) {
  const rawStatus = current.creation.status
  // The public API only exposes public states. Keep the screen resilient if an
  // outdated intermediary returns an unknown state: it must not crash or reveal
  // an implementation detail to the customer.
  const status = ((t.status as Record<string, string>)[rawStatus] ? rawStatus : "IDENTITY_READY") as Status
  const referenceCount = current.assets.filter((asset) => asset.kind === "REFERENCE").length
  const busy = pendingStatuses.includes(status)
  const statusLabel = (t.status as Record<string, string>)[status] ?? t.identityReady

  if (status === "COMPLETED" && current.resultUrl) {
    const resultUrls = current.resultUrls?.length ? current.resultUrls : [current.resultUrl]
    return (
      <section className="mx-auto max-w-3xl py-8 sm:py-14">
        <p className="mirava-label">MIRAVA / SIGNATURE</p>
        <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl"><BlurText text={t.result} /></h1>
        <div className={cn("mirava-dark-panel mt-7 grid gap-2 p-2", resultUrls.length > 1 && "sm:grid-cols-2")}>
          {resultUrls.map((url, index) => (
            <div key={url} className={cn("mirava-image-frame relative overflow-hidden", resultUrls.length === 3 && index === 0 && "sm:col-span-2 sm:mx-auto sm:w-1/2")}>
              <img src={url} alt={`${t.result} ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
              <ResultSaveButton
                url={url}
                index={index}
                label={t.download}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {current.creation.studioProfileId && (
            <button
              type="button"
              onClick={() => onContinue(current.creation.studioProfileId!)}
              disabled={pending === "reuse"}
              className="mirava-button mirava-button-primary group flex min-h-24 w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="flex min-w-0 items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/10">
                  <Images className="h-5 w-5" />
                </span>

                <span className="min-w-0">
                  <span className="block font-jakarta text-lg font-semibold">
                    {t.continueShoot}
                  </span>
                  <span className="mt-1 block text-xs opacity-65">
                    {t.continueHint}
                  </span>
                </span>
              </span>

              <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </button>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending === "delete"}
              className="mirava-button mirava-button-danger min-h-10 px-3 text-xs"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.delete}
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {status === "DRAFT" ? (locale === "fr" ? "RÉFÉRENCE" : "REFERENCIA") : status === "IDENTITY_READY" ? (locale === "fr" ? "IDENTITÉ" : "IDENTIDAD") : "STUDIO"}</p>
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl"><BlurText text={busy ? (status.includes("ANAL") ? t.analysing : t.generating) : statusLabel} /></h1>

      {status === "DRAFT" && (
        <Surface className="mt-7">
          <h2 className="font-jakarta text-2xl font-semibold tracking-[-.04em]">{t.reference}</h2>
          <p className="mirava-copy mt-2 text-sm leading-6">{t.referenceHint}</p>
          <label className="mirava-upload mt-6 flex min-h-48 cursor-pointer flex-col items-center justify-center p-5 text-center">
            <Upload className="h-6 w-6 text-mirava-accent" />
            <span className="mt-3 text-sm font-semibold">{referenceCount ? (locale === "fr" ? "Référence ajoutée" : "Referencia añadida") : (locale === "fr" ? "Importer une image" : "Subir una imagen")}</span>
            <span className="mirava-muted mt-1 text-xs">JPG, PNG ou WebP · 10 Mo max</span>
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onUploadReference(event)} />
          </label>
          <button disabled={referenceCount !== 1 || pending === "analyze"} onClick={onAnalyze} className="mirava-button mirava-button-primary mt-5 min-h-12 px-5">{pending === "analyze" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{t.analyze}</button>
        </Surface>
      )}

      {status === "IDENTITY_READY" && (
        <>
          <Surface className="mt-7">
            {isMiravaIdentityProfileReady(identityProfile) ? (
              <>
                <p className="mirava-status-success flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4" />{t.identityReady} · {identityProfile!.assetCount}/{MIRAVA_MAX_IDENTITY_PHOTOS}</p>
                <h2 className="mt-3 font-jakarta text-2xl font-semibold tracking-[-.04em]">{t.identityReadyTitle}</h2>
                <p className="mirava-copy mt-2 text-sm leading-6">{t.identityReadyHint}</p>
                <button disabled={pending === "generate"} onClick={onGenerate} className="mirava-button mirava-button-primary mt-6 min-h-12 px-5">{pending === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{t.generate}</button>
                <button onClick={onOpenCapture} className="mirava-button mirava-button-secondary mt-3 min-h-11 w-full px-4 text-sm">
                  <Camera className="mr-2 h-4 w-4" />{locale === "fr" ? "Ajouter une vue privée" : "Añadir una vista privada"}
                </button>
              </>
            ) : (
              <>
                <h2 className="font-jakarta text-2xl font-semibold tracking-[-.04em]">{t.identity}</h2>
                <p className="mirava-copy mt-2 text-sm leading-6">{t.identityHint}</p>
                <button onClick={onOpenCapture} className="mirava-dark-panel mt-6 min-h-36 w-full p-5 text-left">
                  <Camera className="h-5 w-5 text-mirava-accent" />
                  <span className="mt-5 block font-jakarta text-lg font-semibold">{locale === "fr" ? "Ouvrir mon Profil identité" : "Abrir mi Perfil de identidad"}</span>
                  <span className="mirava-copy mt-2 block text-xs leading-5">{locale === "fr" ? "Choisissez ensuite caméra guidée ou photothèque. Toutes les vues sont contrôlées localement." : "Elige después cámara guiada o galería. Todas las vistas se verifican localmente."}</span>
                </button>
                <button disabled className="mirava-button mirava-button-primary mt-5 min-h-12 px-5">{t.generate}</button>
              </>
            )}
          </Surface>

          {isMiravaIdentityProfileReady(identityProfile) ? <IdentityProfilePreview identityProfile={identityProfile} locale={locale} onManage={onOpenCapture} className="mt-4" /> : null}
        </>
      )}

      {busy && <Surface className="mt-7">
        <div className="h-1 overflow-hidden bg-mirava-surface-raised"><div className="h-full w-2/3 animate-pulse bg-mirava-accent" /></div>
        <p className="mirava-copy mt-4 text-sm leading-6">{t.busy}</p>
        {current.creation.requestedResultCount > 1 && (
          <p className="mt-2 text-xs font-semibold text-mirava-accent">
            {locale === "fr" ? `Série : ${current.completedResultCount}/${current.creation.requestedResultCount} image(s) prête(s)` : `Serie: ${current.completedResultCount}/${current.creation.requestedResultCount} imagen(es) lista(s)`}
          </p>
        )}
      </Surface>}
      {status === "FAILED" && <div role="alert" className="mirava-alert mt-7 p-5 text-sm">{current.creation.failureMessage ?? t.failure}</div>}
    </section>
  )
}

function UniversesView({ locale, t, selectedUniverseId, setSelectedUniverseId, onChoose }: { locale: Locale; t: Copy; selectedUniverseId: string; setSelectedUniverseId: (id: typeof MIRAVA_UNIVERSES[number]["id"]) => void; onChoose: (brief?: string) => void }) {
  const selected = getMiravaUniverse(selectedUniverseId) ?? MIRAVA_UNIVERSES[0]
  return (
    <section className="py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {locale === "fr" ? "DIRECTIONS VISUELLES" : "DIRECCIONES VISUALES"}</p>
      <h1 className="mirava-section-title mirava-universes-title mt-3 text-4xl sm:text-6xl"><BlurText text={t.universes} /></h1>
      <p className="mirava-copy mt-4 max-w-2xl text-sm leading-6">{t.universesIntro}</p>
      <div className="mirava-scroll-row -mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
        {MIRAVA_UNIVERSES.map((universe) => <UniverseCard key={universe.id} universe={universe} locale={locale} selected={selected.id === universe.id} onClick={() => setSelectedUniverseId(universe.id)} />)}
      </div>
      <div className="mirava-dark-panel mt-4 grid overflow-hidden lg:grid-cols-[1fr_1fr]">
        <div className="relative min-h-[24rem]"><Image src={selected.image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /><div className="mirava-media-overlay-soft absolute inset-0" /></div>
        <div className="p-6 sm:p-9">
          <p className="mirava-label">{selected.eyebrow[locale]}</p>
          <h2 className="mirava-section-title mt-3 text-4xl">{selected.name[locale]}</h2>
          <p className="mirava-copy mt-4 text-sm leading-6">{selected.description[locale]}</p>
          <div className="mt-6 space-y-2">
            {selected.sampleBriefs[locale].map((brief) => <button key={brief} onClick={() => onChoose(brief)} className="mirava-control flex min-h-14 w-full items-center justify-between gap-4 p-4 text-left text-xs leading-5"><span>{brief}</span><ChevronRight className="h-4 w-4 shrink-0" /></button>)}
          </div>
          <button onClick={() => onChoose()} className="mirava-button mirava-button-primary mt-6 gap-2 px-5 text-sm">{locale === "fr" ? "Choisir cet univers" : "Elegir este universo"}<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  )
}

function LibraryView({ locale, t, studios, creations, onStartCreate, onReuse, onSelect }: { locale: Locale; t: Copy; studios: Studio[]; creations: Creation[]; onStartCreate: () => void; onReuse: (id: string) => void; onSelect: (id: string) => void }) {
  return (
    <section className="py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {locale === "fr" ? "ARCHIVE PRIVÉE" : "ARCHIVO PRIVADO"}</p>
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl"><BlurText text={t.libraryTitle} /></h1>
      <h2 className="mirava-section-title mt-10 text-2xl">{t.studiosTitle}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {studios.map((studio) => {
          const universe = getMiravaUniverse(studio.presetId)
          return <article key={studio.id} className="mirava-surface overflow-hidden">
            <div className="mirava-studio-cover relative aspect-[16/10] overflow-hidden bg-mirava-canvas-raised">
              {universe
                ? <Image src={universe.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                : <div aria-hidden="true" className="mirava-studio-cover-abstract absolute inset-0" />}
            </div>
            <div className="p-5"><p className="font-jakarta text-lg font-semibold">{studio.name}</p><p className="mirava-copy mt-2 text-xs">{universe?.tagline[locale] ?? (locale === "fr" ? "Direction personnelle privée" : "Dirección personal privada")}</p><button onClick={() => onReuse(studio.id)} className="mirava-button mirava-button-primary mt-5 min-h-12 px-4 text-xs">{t.reuse}<ChevronRight className="ml-1 h-4 w-4" /></button></div>
          </article>
        })}
        {!studios.length && <Surface className="sm:col-span-2 lg:col-span-3">
          <p className="mirava-copy text-sm leading-6">{locale === "fr" ? "Votre premier studio apparaîtra ici après votre première séance." : "Tu primer estudio aparecerá aquí después de tu primera sesión."}</p>
          <button onClick={onStartCreate} className="mirava-button mirava-button-primary mt-4 min-h-12 px-4 text-sm"><Camera className="mr-2 h-4 w-4" />{locale === "fr" ? "Créer ma première séance" : "Crear mi primera sesión"}</button>
        </Surface>}
      </div>
      <h2 className="mirava-section-title mt-12 text-2xl">{t.imagesTitle}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {creations.map((creation, index) => {
          const statusLabel = t.status[creation.status] ?? (locale === "fr" ? "Préparation en cours" : "Preparación en curso")
          return (
            <button key={creation.id} onClick={() => onSelect(creation.id)} aria-label={locale === "fr" ? `Ouvrir la création ${index + 1} : ${statusLabel}` : `Abrir creación ${index + 1}: ${statusLabel}`} className="mirava-surface overflow-hidden text-left">
              <div className="aspect-[4/5] bg-mirava-surface-raised">{creation.resultUrl && <img src={creation.resultUrl} alt="" className="h-full w-full object-cover" />}</div>
              <p className="p-3 text-xs font-semibold">{statusLabel}</p>
            </button>
          )
        })}
        {!creations.length && <Surface className="col-span-full">
          <p className="mirava-copy text-sm leading-6">{locale === "fr" ? "Votre galerie reste privée et vide jusqu’à votre première image." : "Tu galería es privada y permanece vacía hasta tu primera imagen."}</p>
          <button onClick={onStartCreate} className="mirava-button mirava-button-secondary mt-4 min-h-12 px-4 text-sm"><Camera className="mr-2 h-4 w-4" />{locale === "fr" ? "Commencer une séance" : "Empezar una sesión"}</button>
        </Surface>}
      </div>
    </section>
  )
}

function AccountView({
  locale,
  t,
  account,
  identityProfile,
  highlightedOfferId,
  pending,
  onCheckout,
  onPortal,
  onStartCreate,
  onOpenCapture,
  onReplaceIdentity,
  onReplaceIdentityAsset,
  onDeleteIdentityAsset,
  onDeleteIdentity,
}: {
  locale: Locale
  t: Copy
  account: Account | null
  identityProfile: IdentityProfile
  highlightedOfferId: string | null
  pending: string | null
  onCheckout: (id: string) => void
  onPortal: () => void
  onStartCreate: () => void
  onOpenCapture: () => void
  onReplaceIdentity: () => void
  onReplaceIdentityAsset: (
    assetId: string,
    file: File,
  ) => Promise<boolean>
  onDeleteIdentityAsset: (
    assetId: string,
  ) => Promise<boolean>
  onDeleteIdentity: () => Promise<boolean>
}) {
  const ready = isMiravaIdentityProfileReady(identityProfile)
  const availableCredits = account?.credits ?? 0
  const highlightedOffer = [...(account?.plans ?? []), ...(account?.packs ?? [])].find((offer) => offer.id === highlightedOfferId)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushNotice, setPushNotice] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  const [selectedIdentityAssetId, setSelectedIdentityAssetId] =
    useState<string | null>(null)
  const [confirmAssetDelete, setConfirmAssetDelete] =
    useState(false)
  const [assetActionError, setAssetActionError] =
    useState<string | null>(null)
  const selectedIdentityAsset =
    identityProfile?.previews.find(
      (preview) =>
        preview.id === selectedIdentityAssetId,
    ) ?? null

  const [deleteIdentityOpen, setDeleteIdentityOpen] = useState(false)
  const [deleteIdentityError, setDeleteIdentityError] = useState<string | null>(null)
  const deleteIdentityTriggerRef = useRef<HTMLButtonElement>(null)

  const handleNotify = async () => {
    setPushLoading(true)
    setPushNotice(null)
    setPushError(null)
    try {
      const ok = await enableMiravaPush(locale)
      if (ok) {
        setPushNotice(t.installed)
      } else {
        const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
        const msg = isIos
          ? (locale === "fr"
              ? "Sur iOS (Safari), les notifications nécessitent d’installer l’application sur votre écran d’accueil (via le menu Partager Safari)."
              : "En iOS (Safari), las notificaciones requieren instalar la aplicación en tu pantalla de inicio (desde el menú Compartir Safari).")
          : (locale === "fr"
              ? "Les notifications ne sont pas autorisées ou non supportées par ce navigateur."
              : "Las notificaciones no están autorizadas o no son compatibles con este navegador.")
        setPushError(msg)
      }
    } catch {
      setPushError(locale === "fr" ? "Impossible d’activer les notifications." : "No se han podido activar las notificaciones.")
    } finally {
      setPushLoading(false)
    }
  }

  const handleIdentityAssetReplacement = async (
    assetId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    setAssetActionError(null)

    const replaced =
      await onReplaceIdentityAsset(
        assetId,
        file,
      )

    if (replaced) {
      setSelectedIdentityAssetId(null)
      setConfirmAssetDelete(false)
      return
    }

    setAssetActionError(
      locale === "fr"
        ? "Cette photo n’a pas pu être remplacée."
        : "No se pudo sustituir esta foto.",
    )
  }

  const confirmSingleAssetDeletion =
    async () => {
      if (!selectedIdentityAsset) return

      setAssetActionError(null)

      const removed =
        await onDeleteIdentityAsset(
          selectedIdentityAsset.id,
        )

      if (removed) {
        setSelectedIdentityAssetId(null)
        setConfirmAssetDelete(false)
        return
      }

      setAssetActionError(
        locale === "fr"
          ? "Cette photo n’a pas pu être supprimée."
          : "No se pudo eliminar esta foto.",
      )
    }

  const confirmIdentityDeletion = async () => {
    setDeleteIdentityError(null)
    const removed = await onDeleteIdentity()
    if (removed) {
      setDeleteIdentityOpen(false)
      return
    }
    setDeleteIdentityError(locale === "fr" ? "La suppression n’a pas pu être terminée. Vos photos sont toujours conservées." : "No se pudo completar la eliminación. Tus fotos siguen conservadas.")
  }

  const closeIdentityDeletionDialog = () => {
    setDeleteIdentityOpen(false)
    window.requestAnimationFrame(() => deleteIdentityTriggerRef.current?.focus())
  }

  return (
    <section className="py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {locale === "fr" ? "ACCÈS" : "ACCESO"}</p>
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl"><BlurText text={t.accountTitle} /></h1>
      <div className="mt-8 grid gap-4">
        <Surface className="flex flex-col justify-between">
          <div>
            <p className="mirava-label">
              {locale === "fr"
                ? "CRÉDITS & ACCÈS"
                : "CRÉDITOS Y ACCESO"}
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="tabular-nums font-jakarta text-4xl font-semibold">
                  {account?.credits ?? 0}
                </p>
                <p className="mirava-copy mt-1 text-sm">
                  {t.credits}
                </p>
              </div>

              {account?.subscription ? (
                <button
                  onClick={onPortal}
                  disabled={pending === "portal"}
                  className="mirava-button mirava-button-secondary px-4 text-xs font-semibold"
                >
                  {pending === "portal" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t.portal}
                </button>
              ) : null}
            </div>
          </div>

          {availableCredits > 0 ? (
            <>
              <p className="mirava-copy mt-6 text-xs leading-5">
                {locale === "fr"
                  ? `${availableCredits === 1 ? "Votre création est prête" : `Vos ${availableCredits} créations sont prêtes`}. Lancez une séance quand vous le souhaitez.`
                  : `${availableCredits === 1 ? "Tu creación está lista" : `Tus ${availableCredits} creaciones están listas`}. Inicia una sesión cuando quieras.`}
              </p>

              <button
                onClick={onStartCreate}
                className="mirava-button mirava-button-primary mt-4 self-start px-4 text-sm font-semibold"
              >
                <Camera className="mr-2 h-4 w-4" />
                {locale === "fr"
                  ? "Créer ma séance"
                  : "Crear mi sesión"}
              </button>
            </>
          ) : (
            <p className="mirava-copy mt-6 text-xs leading-5">
              {locale === "fr"
                ? "Choisissez un abonnement ou une recharge pour créer une séance."
                : "Elige una suscripción o una recarga para crear una sesión."}
            </p>
          )}
        </Surface>

        <section className="mirava-surface overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mirava-label">
                  {locale === "fr"
                    ? "PROFIL IDENTITÉ PRIVÉ"
                    : "PERFIL DE IDENTIDAD PRIVADO"}
                </p>

                <h2 className="mirava-section-title mt-3 text-3xl">
                  {ready
                    ? locale === "fr"
                      ? "Vos références"
                      : "Tus referencias"
                    : locale === "fr"
                    ? "Préparer mon identité"
                    : "Preparar mi identidad"}
                </h2>
              </div>

              <span className="mirava-meta shrink-0 px-3 py-2 text-[10px] font-semibold tabular-nums">
                {identityProfile?.assetCount ?? 0}/
                {MIRAVA_MAX_IDENTITY_PHOTOS}
              </span>
            </div>

            <p className="mirava-copy mt-4 max-w-xl text-sm leading-6">
              {ready
                ? locale === "fr"
                  ? "Touchez une photo pour l’agrandir, la remplacer ou la supprimer. Ces références restent privées."
                  : "Toca una foto para ampliarla, sustituirla o eliminarla. Estas referencias siguen siendo privadas."
                : t.profilePrivacy}
            </p>
          </div>

          {identityProfile?.previews?.length ? (
            <div className="grid grid-cols-2 gap-px border-y border-white/10 bg-white/10 sm:grid-cols-3">
              {identityProfile.previews.map(
                (preview, index) => (
                  <button
                    key={preview.id}
                    type="button"
                    onClick={() => {
                      setAssetActionError(null)
                      setConfirmAssetDelete(false)
                      setSelectedIdentityAssetId(
                        preview.id,
                      )
                    }}
                    aria-label={
                      locale === "fr"
                        ? `Ouvrir la photo identité ${index + 1}`
                        : `Abrir la foto de identidad ${index + 1}`
                    }
                    className="group relative aspect-[4/5] overflow-hidden bg-black"
                  >
                    <img
                      src={preview.url}
                      alt={
                        locale === "fr"
                          ? `Photo identité ${index + 1}`
                          : `Foto de identidad ${index + 1}`
                      }
                      className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[0.98]"
                    />

                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-10 text-left text-[10px] font-semibold text-white/80">
                      {locale === "fr"
                        ? `Vue ${index + 1}`
                        : `Vista ${index + 1}`}
                    </span>
                  </button>
                ),
              )}
            </div>
          ) : (
            <div className="border-y border-white/10 p-5 sm:p-6">
              <p className="mirava-muted text-xs leading-5">
                {locale === "fr"
                  ? "Les aperçus privés sont momentanément indisponibles. Vos photos restent enregistrées."
                  : "Las vistas privadas no están disponibles temporalmente. Tus fotos siguen guardadas."}
              </p>
            </div>
          )}

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <button
              onClick={onOpenCapture}
              disabled={
                identityProfile?.assetCount ===
                MIRAVA_MAX_IDENTITY_PHOTOS
              }
              className="mirava-button mirava-button-primary px-4 text-sm font-semibold"
            >
              <Camera className="mr-2 h-4 w-4" />
              {identityProfile
                ? locale === "fr"
                  ? "Ajouter une vue"
                  : "Añadir una vista"
                : t.guided}
            </button>

            {identityProfile ? (
              <button
                onClick={onReplaceIdentity}
                className="mirava-button mirava-button-secondary px-4 text-sm font-semibold"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {locale === "fr"
                  ? "Refaire tout le profil"
                  : "Rehacer todo el perfil"}
              </button>
            ) : null}

            {identityProfile ? (
              <button
                ref={deleteIdentityTriggerRef}
                onClick={() => {
                  setDeleteIdentityError(null)
                  setDeleteIdentityOpen(true)
                }}
                disabled={
                  pending === "identity-delete"
                }
                className="mirava-button mirava-button-danger px-4 text-sm font-semibold sm:col-span-2 sm:justify-self-start"
              >
                {pending === "identity-delete" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}

                {locale === "fr"
                  ? "Supprimer le Profil identité"
                  : "Eliminar el Perfil de identidad"}
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <DialogPrimitive.Root
        open={Boolean(selectedIdentityAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIdentityAssetId(null)
            setConfirmAssetDelete(false)
            setAssetActionError(null)
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md" />

          <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black outline-none">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div>
                <p className="mirava-label">
                  MIRAVA /{" "}
                  {locale === "fr"
                    ? "PHOTO PRIVÉE"
                    : "FOTO PRIVADA"}
                </p>

                <DialogPrimitive.Title className="mt-1 font-jakarta text-lg font-semibold text-white">
                  {locale === "fr"
                    ? "Gérer cette référence"
                    : "Gestionar esta referencia"}
                </DialogPrimitive.Title>
              </div>

              <DialogPrimitive.Close
                aria-label={
                  locale === "fr"
                    ? "Fermer"
                    : "Cerrar"
                }
                className="mirava-capture-round-control"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </header>

            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              {selectedIdentityAsset ? (
                <img
                  src={selectedIdentityAsset.url}
                  alt={
                    locale === "fr"
                      ? "Référence d’identité privée"
                      : "Referencia de identidad privada"
                  }
                  className="max-h-full max-w-full rounded-2xl object-contain"
                />
              ) : null}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-black/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {assetActionError ? (
                <p
                  role="alert"
                  className="mirava-alert mb-3 p-3 text-xs"
                >
                  {assetActionError}
                </p>
              ) : null}

              {confirmAssetDelete ? (
                <div className="grid gap-3">
                  <p className="text-sm leading-6 text-white/70">
                    {locale === "fr"
                      ? "Supprimer définitivement cette photo privée ?"
                      : "¿Eliminar definitivamente esta foto privada?"}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAssetDelete(false)
                      }
                      className="mirava-button mirava-button-secondary px-4 text-sm"
                    >
                      {locale === "fr"
                        ? "Annuler"
                        : "Cancelar"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void confirmSingleAssetDeletion()
                      }
                      disabled={
                        pending ===
                        `identity-asset-delete-${selectedIdentityAsset?.id}`
                      }
                      className="mirava-button mirava-button-danger px-4 text-sm"
                    >
                      {locale === "fr"
                        ? "Supprimer"
                        : "Eliminar"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="mirava-button mirava-button-primary cursor-pointer px-4 text-sm">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {locale === "fr"
                      ? "Remplacer"
                      : "Sustituir"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        if (selectedIdentityAsset) {
                          void handleIdentityAssetReplacement(
                            selectedIdentityAsset.id,
                            event,
                          )
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAssetDelete(true)
                    }
                    disabled={
                      (identityProfile?.assetCount ??
                        0) <=
                      MIRAVA_MIN_IDENTITY_PHOTOS
                    }
                    className="mirava-button mirava-button-danger px-4 text-sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {locale === "fr"
                      ? "Supprimer"
                      : "Eliminar"}
                  </button>
                </div>
              )}

              {(identityProfile?.assetCount ?? 0) <=
              MIRAVA_MIN_IDENTITY_PHOTOS ? (
                <p className="mirava-muted mt-3 text-center text-[11px] leading-5">
                  {locale === "fr"
                    ? "Trois photos minimum sont nécessaires. Cette photo peut être remplacée, mais pas supprimée."
                    : "Se necesitan al menos tres fotos. Esta foto puede sustituirse, pero no eliminarse."}
                </p>
              ) : null}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root open={deleteIdentityOpen} onOpenChange={(open) => { if (open) setDeleteIdentityOpen(true); else closeIdentityDeletionDialog() }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <DialogPrimitive.Content onCloseAutoFocus={(event) => { event.preventDefault(); deleteIdentityTriggerRef.current?.focus() }} className="mirava-modal fixed inset-x-0 bottom-0 z-50 max-h-dvh w-full max-w-md overflow-y-auto p-5 outline-none sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:max-h-[94dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-7">
            <p className="mirava-label">MIRAVA / {locale === "fr" ? "CONFIDENTIALITÉ" : "PRIVACIDAD"}</p>
            <DialogPrimitive.Title className="mirava-section-title mt-3 text-3xl">{locale === "fr" ? "Supprimer votre Profil identité ?" : "¿Eliminar tu Perfil de identidad?"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mirava-copy mt-4 text-sm leading-6">{locale === "fr" ? "Vos photos d’identité privées seront supprimées immédiatement. Cette action est définitive." : "Tus fotos de identidad privadas se eliminarán inmediatamente. Esta acción es definitiva."}</DialogPrimitive.Description>
            {deleteIdentityError && <p role="alert" className="mirava-alert mt-4 p-3 text-xs leading-5">{deleteIdentityError}</p>}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button onClick={closeIdentityDeletionDialog} className="mirava-button mirava-button-secondary min-h-12 px-4 text-sm font-semibold">{locale === "fr" ? "Garder mes photos" : "Conservar mis fotos"}</button>
              <button onClick={() => void confirmIdentityDeletion()} disabled={pending === "identity-delete"} className="mirava-button mirava-button-danger min-h-12 px-4 text-sm font-semibold">{pending === "identity-delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{locale === "fr" ? "Supprimer définitivement" : "Eliminar definitivamente"}</button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="mt-10">
        {highlightedOffer && (
          <div role="status" className="mirava-notice mb-6 flex items-center justify-between gap-3 p-4 text-sm shadow-lg">
            <span>{locale === "fr" ? `${highlightedOffer.name} est sélectionnée. Vous pouvez confirmer votre choix ci-dessous.` : `${highlightedOffer.name} está seleccionada. Puedes confirmar tu elección a continuación.`}</span>
          </div>
        )}
        <h2 className="font-jakarta text-2xl font-semibold">{t.plans}</h2>
        <Offers offers={account?.plans ?? []} locale={locale} t={t} onCheckout={onCheckout} onPortal={onPortal} currentSubscriptionPlanId={account?.subscription?.planId ?? null} highlightedOfferId={highlightedOfferId} pending={pending} />
        <h2 className="mt-10 font-jakarta text-2xl font-semibold">{t.packs}</h2>
        <Offers offers={account?.packs ?? []} locale={locale} t={t} onCheckout={onCheckout} onPortal={onPortal} currentSubscriptionPlanId={null} highlightedOfferId={highlightedOfferId} pending={pending} />
      </div>
      <div className="mt-10 max-w-lg space-y-3">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void handleNotify()} disabled={pushLoading} className="mirava-button mirava-button-secondary min-h-12 gap-2 px-4 text-sm font-semibold">
            {pushLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {t.notify}
          </button>
          <MiravaInstallButton locale={locale} />
        </div>
        {pushNotice && (
          <div role="status" className="mirava-notice mt-3 flex items-center gap-2 p-3 text-xs leading-5">
            <Check className="h-4 w-4 shrink-0 text-mirava-success" />
            <span>{pushNotice}</span>
          </div>
        )}
        {pushError && (
          <div role="alert" className="mirava-alert mt-3 flex items-start gap-2.5 p-3.5 text-xs leading-5">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{pushError}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function Offers({ offers, locale, t, onCheckout, onPortal, currentSubscriptionPlanId, highlightedOfferId, pending }: { offers: Offer[]; locale: Locale; t: Copy; onCheckout: (id: string) => void; onPortal: () => void; currentSubscriptionPlanId: string | null; highlightedOfferId: string | null; pending: string | null }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {offers.map((offer) => {
        const isOfferPending = pending === `offer-${offer.id}`
        const isSubscription = offer.kind === "subscription"
        const isCurrentSubscription = isSubscription && currentSubscriptionPlanId === offer.id
        const mustManageSubscription = isSubscription && Boolean(currentSubscriptionPlanId) && !isCurrentSubscription
        const isHighlighted = highlightedOfferId === offer.id
        const displayName = offer.name.replace(/\s+[—-]\s+\d+\s*$/, "")
        const creditsLabel = locale === "fr"
          ? `${offer.credits} création${offer.credits > 1 ? "s" : ""}${isSubscription ? " / mois" : " sans expiration"}`
          : `${offer.credits} ${offer.credits === 1 ? "creación" : "creaciones"}${isSubscription ? " / mes" : " sin caducidad"}`
        const priceLabel = locale === "fr"
          ? `${offer.priceEur} €${isSubscription ? " / mois · TTC" : " TTC"}`
          : `${offer.priceEur} €${isSubscription ? " / mes · IVA incluido" : " IVA incluido"}`
        const accessibleOfferLabel = locale === "fr"
          ? `${t.choose} ${displayName}, ${creditsLabel}, ${priceLabel}`
          : `${t.choose} ${displayName}, ${creditsLabel}, ${priceLabel}`
        return (
          <Surface key={offer.id} className={cn("flex flex-col justify-between p-5", isHighlighted && "border-mirava-accent/70 bg-mirava-surface-raised ring-1 ring-mirava-accent/40 shadow-xl shadow-mirava-accent/10")}>
            <div>
              <p className="tabular-nums font-jakarta text-xl font-semibold">{offer.credits}</p>
              <p className="mirava-copy mt-0.5 text-xs">{displayName}</p>
              <p className="mirava-copy mt-3 text-xs leading-5">{creditsLabel}</p>
              <p className="tabular-nums mt-3 font-jakarta text-2xl font-semibold">{offer.priceEur} €</p>
              <p className="mirava-muted mt-1 text-[11px] font-medium">{isSubscription ? (locale === "fr" ? "TTC / mois" : "IVA incluido / mes") : (locale === "fr" ? "TTC · sans expiration" : "IVA incluido · sin caducidad")}</p>
            </div>
              {isCurrentSubscription ? (
                <p role="status" className="mirava-notice mt-5 flex min-h-12 items-center justify-center gap-2 px-3 text-center text-xs font-semibold">
                  <Check className="h-4 w-4 shrink-0 text-mirava-success" />
                  {locale === "fr" ? "Votre forfait actuel" : "Tu plan actual"}
                </p>
              ) : (
                <button
                  onClick={() => mustManageSubscription ? onPortal() : onCheckout(offer.id)}
                  disabled={pending !== null}
                  aria-label={mustManageSubscription
                    ? (locale === "fr" ? `Modifier ${displayName} dans le portail d’abonnement` : `Modificar ${displayName} en el portal de suscripción`)
                    : accessibleOfferLabel}
                  className="mirava-button mirava-button-primary mt-5 min-h-12 w-full gap-2 text-xs font-semibold"
                >
                  {(isOfferPending || (mustManageSubscription && pending === "portal")) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isOfferPending || (mustManageSubscription && pending === "portal")
                    ? (locale === "fr" ? "Ouverture…" : "Abriendo…")
                    : mustManageSubscription
                      ? (locale === "fr" ? "Modifier mon forfait" : "Modificar mi plan")
                      : t.choose}
                </button>
              )}
          </Surface>
        )
      })}
    </div>
  )
}

function DesktopNavButton({ active, primary = false, icon, label, onClick }: { active: boolean; primary?: boolean; icon?: ReactElement; label: string; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <button aria-current={active ? "page" : undefined} onClick={onClick} data-active={active} data-primary={primary} className="mirava-desktop-tab flex min-h-12 items-center gap-2 px-4 text-xs font-semibold">{icon && <span className="mirava-desktop-tab-icon">{icon}</span>}{label}</button>
}
