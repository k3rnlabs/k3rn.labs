"use client"

import {
  type ChangeEvent,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react"
import Image from "next/image"
import Link from "next/link"
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
  LayoutGrid,
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
import { MiravaFirstTimeInstallBanner } from "@/components/mirava/mirava-pwa"
import { enableMiravaPush } from "@/components/mirava/mirava-pwa"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"
import { MiravaCreativeDirector } from "@/components/studio/mirava-creative-director"
import { MiravaIdentityCapture } from "@/components/studio/mirava-identity-capture"
import { BottomNavBar, type BottomNavItem } from "@/components/ui/bottom-nav-bar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Header } from "@/components/ui/header-2"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import { isMiravaIdentityProfileReady, MIRAVA_MAX_IDENTITY_PHOTOS, MIRAVA_MIN_IDENTITY_PHOTOS } from "@/lib/mirava/identity-profile"
import { MIRAVA_UNIVERSES, getMiravaUniverse, type MiravaUniverse } from "@/lib/mirava/universes"
import { cn } from "@/lib/utils"

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
type IdentityProfile = { id: string; assetCount: number; updatedAt: string } | null
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
    identityKitText: "Deux photos minimum, quatre recommandées et jusqu’à six. Les vues plein pied améliorent la cohérence des proportions.",
    consent: "Avant d’entrer dans le Studio",
    adult: "J’ai au moins 18 ans et toutes les personnes représentées sont majeures.",
    rights: "J’ai les droits nécessaires et le consentement explicite de chaque personne représentée.",
    privacy: "J’ai lu la politique : les références artistiques sont purgées après analyse ; mon Profil identité reste privé jusqu’à sa suppression.",
    provider: "Je comprends que mes images sont traitées par l’API OpenAI pour réaliser ma création.",
    enter: "Confirmer et entrer",
    reference: "Votre inspiration",
    referenceHint: "Une seule image suffit pour construire un studio personnel. Elle ne sera jamais affichée publiquement.",
    analyze: "Créer mon studio",
    analysing: "Votre direction prend forme",
    identity: "Préparez votre identité",
    identityHint: "Votre Profil identité est créé une fois puis réutilisé pour chaque séance. Trois portraits sont requis ; cheveux et silhouette renforcent la fidélité.",
    guided: "Capture guidée",
    import: "Importer mes photos",
    identityReady: "Profil prêt",
    generate: "Créer mon image signature",
    generating: "Votre image est en préparation",
    result: "Votre image signature est prête.",
    download: "Télécharger",
    delete: "Supprimer",
    continueShoot: "Continuer la séance",
    continueHint: "Une nouvelle image, une nouvelle pose · 1 crédit",
    formatTitle: "Format de la séance",
    formatSingle: "Image signature",
    formatSeries3: "Série de 3",
    formatSeries5: "Série de 5",
    formatHint: "Chaque image consomme un crédit. Une série garde le même univers tout en variant les activités, poses, angles et lumières.",
    reuse: "Créer depuis ce studio",
    libraryTitle: "Votre collection privée",
    studiosTitle: "Vos studios",
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
    identityKitText: "Dos fotos como mínimo, cuatro recomendadas y hasta seis. Las vistas de cuerpo entero mejoran la coherencia de las proporciones.",
    consent: "Antes de entrar al Estudio",
    adult: "Tengo al menos 18 años y todas las personas representadas son adultas.",
    rights: "Tengo los derechos necesarios y el consentimiento explícito de cada persona representada.",
    privacy: "He leído la política: las referencias artísticas se eliminan tras el análisis; mi Perfil de identidad permanece privado hasta que lo elimine.",
    provider: "Entiendo que mis imágenes se tratan mediante la API de OpenAI para realizar mi creación.",
    enter: "Confirmar y entrar",
    reference: "Tu inspiración",
    referenceHint: "Una sola imagen basta para construir un estudio personal. Nunca se mostrará públicamente.",
    analyze: "Crear mi estudio",
    analysing: "Tu dirección está tomando forma",
    identity: "Prepara tu identidad",
    identityHint: "Tu Perfil de identidad se crea una vez y se reutiliza en cada sesión. Se requieren tres retratos; el cabello y la silueta refuerzan la fidelidad.",
    guided: "Captura guiada",
    import: "Subir mis fotos",
    identityReady: "Perfil listo",
    generate: "Crear mi imagen insignia",
    generating: "Tu imagen se está preparando",
    result: "Tu imagen insignia está lista.",
    download: "Descargar",
    delete: "Eliminar",
    continueShoot: "Continuar la sesión",
    continueHint: "Una nueva imagen, una nueva pose · 1 crédito",
    formatTitle: "Formato de la sesión",
    formatSingle: "Imagen insignia",
    formatSeries3: "Serie de 3",
    formatSeries5: "Serie de 5",
    formatHint: "Cada imagen consume un crédito. Una serie conserva el mismo universo variando actividades, poses, ángulos y luces.",
    reuse: "Crear desde este estudio",
    libraryTitle: "Tu colección privada",
    studiosTitle: "Tus estudios",
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

const studioStageCopy = {
  fr: [
    { label: "Moodboard", title: "Où voulez-vous être vue ?", text: "Choisissez un univers MIRAVA ou partez d’une image qui vous inspire." },
    { label: "Séance", title: "Quelle image voulez-vous créer ?", text: "Définissez l’énergie, le style et le rythme de votre séance." },
    { label: "Modèle", title: "Vous êtes au centre de la séance.", text: "Votre Profil identité garantit une présence cohérente d’une image à l’autre." },
    { label: "Création", title: "Votre studio est prêt.", text: "Relisez votre direction avant de lancer la production." },
  ],
  es: [
    { label: "Moodboard", title: "¿Dónde quieres ser vista?", text: "Elige un universo MIRAVA o parte de una imagen que te inspire." },
    { label: "Sesión", title: "¿Qué imagen quieres crear?", text: "Define la energía, el estilo y el ritmo de tu sesión." },
    { label: "Modelo", title: "Tú estás en el centro de la sesión.", text: "Tu Perfil de identidad garantiza una presencia coherente entre imágenes." },
    { label: "Creación", title: "Tu estudio está listo.", text: "Revisa tu dirección antes de lanzar la producción." },
  ],
} as const

const identityGuide = [
  "/visual-engine/identity-guide/01-face.webp",
  "/visual-engine/identity-guide/02-left.webp",
  "/visual-engine/identity-guide/03-right.webp",
  "/visual-engine/identity-guide/04-hair.webp",
  "/visual-engine/identity-guide/05-body-front.webp",
  "/visual-engine/identity-guide/06-body-angle.webp",
]

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
  const { locale, setLocale } = useMiravaLocale()
  const t = copy[locale]
  const [view, setView] = useState<View>("create")
  const [createStep, setCreateStepValue] = useState(0)
  const [furthestCreateStep, setFurthestCreateStep] = useState(0)
  const [current, setCurrent] = useState<Detail | null>(null)
  const [creations, setCreations] = useState<Creation[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [selectedUniverseId, setSelectedUniverseId] = useState(MIRAVA_UNIVERSES[0].id)
  const [options, setOptions] = useState<MiravaCreativeOptions>({})
  const [consents, setConsents] = useState<Consents>({ adult: false, rights: false, privacy: false, provider: false })
  const [consentTarget, setConsentTarget] = useState<string | null | undefined>(undefined)
  const [consentReference, setConsentReference] = useState<File | null>(null)
  const [directorOpen, setDirectorOpen] = useState(false)
  const [captureContext, setCaptureContext] = useState<"onboarding" | "replace" | "append" | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const setCreateStep = useCallback((step: number) => {
    const safeStep = Math.max(0, Math.min(3, step))
    setCreateStepValue(safeStep)
    setFurthestCreateStep((current) => Math.max(current, safeStep))
  }, [])

  const refresh = useCallback(async (creationId?: string) => {
    const [libraryData, studioData, profileData, accountData] = await Promise.all([
      api<{ studioCredits: number; creations: Creation[] }>("/api/visual-engine/creations"),
      api<{ studios: Studio[] }>("/api/visual-engine/studios"),
      api<{ profile: IdentityProfile }>("/api/visual-engine/identity-profile"),
      api<Account>("/api/visual-engine/account"),
    ])
    setCreations(libraryData.creations)
    setStudios(studioData.studios)
    setIdentityProfile(profileData.profile)
    setAccount(accountData)
    if (creationId) setCurrent(await api<Detail>(`/api/visual-engine/creations/${creationId}`))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get("view")
    if (requestedView === "identity") setView("account")
    else if (requestedView === "create" || requestedView === "universes" || requestedView === "library" || requestedView === "account") setView(requestedView)

    // Si on arrive depuis la confirmation d'email (?confirmed=true), on attend 800ms
    // pour que les cookies de session aient le temps d'être établis dans le navigateur
    // avant de faire les appels API qui vérifient la session.
    const isConfirmed = params.get("confirmed") === "true"
    const delay = isConfirmed ? 800 : 0

    const loadStudio = () => {
      void refresh(params.get("creation") ?? undefined).catch((reason: unknown) => {
        if (reason instanceof Error && reason.message === "MIRAVA_REQUEST_FAILED") {
          window.location.replace("/visual-engine/studio/login")
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
  }, [locale, refresh])

  useEffect(() => {
    const syncViewFromHistory = () => {
      const requestedView = new URLSearchParams(window.location.search).get("view")
      if (requestedView === "identity") setView("account")
      else if (requestedView === "create" || requestedView === "universes" || requestedView === "library" || requestedView === "account") setView(requestedView)
    }
    window.addEventListener("popstate", syncViewFromHistory)
    return () => window.removeEventListener("popstate", syncViewFromHistory)
  }, [])

  useEffect(() => {
    if (!current || !pendingStatuses.includes(current.creation.status)) return
    const timer = window.setInterval(() => void refresh(current.creation.id), 2500)
    return () => window.clearInterval(timer)
  }, [current, refresh])

  const run = async (name: string, action: () => Promise<void>) => {
    setPending(name)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof Error && reason.message !== "MIRAVA_REQUEST_FAILED" ? reason.message : (locale === "fr" ? "MIRAVA n’a pas pu terminer cette action." : "MIRAVA no ha podido completar esta acción."))
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setPending(null)
    }
  }

  const ready = Object.values(consents).every(Boolean)
  const selectView = (next: View) => {
    setDirectorOpen(false)
    setView(next)
    window.history.pushState({}, "", `/visual-engine/studio?view=${next}`)
  }

  const create = async (presetId?: string | null, referenceFile?: File | null) => {
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
      setConsentTarget(undefined)
      setConsentReference(null)
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

  const uploadIdentityFiles = async (
    files: File[],
    consent?: { ageConfirmed: true; rightsConfirmed: true; retentionAccepted: true },
    mode: "replace" | "append" = "replace",
  ) => {
    const remaining = MIRAVA_MAX_IDENTITY_PHOTOS - (identityProfile?.assetCount ?? 0)
    const invalidCount = mode === "append"
      ? files.length < 1 || files.length > remaining
      : files.length < MIRAVA_MIN_IDENTITY_PHOTOS || files.length > MIRAVA_MAX_IDENTITY_PHOTOS
    if (invalidCount || (!current && !consent)) {
      const msg = mode === "append"
        ? (locale === "fr" ? `Ajoutez entre une et ${Math.max(1, remaining)} photo(s).` : `Añade entre una y ${Math.max(1, remaining)} foto(s).`)
        : (locale === "fr" ? "Sélectionnez entre trois et six photos." : "Selecciona entre tres y seis fotos.")
      setError(msg)
      throw new Error(msg)
    }
    setPending("identity")
    setError(null)
    setNotice(null)
    try {
      const form = new FormData()
      form.set("mode", mode)
      if (current) form.set("creationId", current.creation.id)
      if (consent) {
        form.set("ageConfirmed", String(consent.ageConfirmed))
        form.set("rightsConfirmed", String(consent.rightsConfirmed))
        form.set("retentionAccepted", String(consent.retentionAccepted))
      }
      files.forEach((file) => form.append("file", file))
      await api("/api/visual-engine/identity-profile", { method: "POST", body: form })
      setCaptureContext(null)
      await refresh(current?.creation.id)
    } catch (reason) {
      const msg = reason instanceof Error && reason.message !== "MIRAVA_REQUEST_FAILED" ? reason.message : (locale === "fr" ? "MIRAVA n’a pas pu enregistrer le profil." : "MIRAVA no ha podido guardar el perfil.")
      setError(msg)
      throw new Error(msg)
    } finally {
      setPending(null)
    }
  }

  const analyze = () => current && run("analyze", async () => { await api(`/api/visual-engine/creations/${current.creation.id}/analyze`, { method: "POST" }); await refresh(current.creation.id) })
  const generate = () => current && run("generate", async () => { await api(`/api/visual-engine/creations/${current.creation.id}/generate`, { method: "POST" }); await refresh(current.creation.id) })
  const reuse = (id: string) => run("reuse", async () => {
    const data = await api<{ creation: Creation }>(`/api/visual-engine/studios/${id}/creations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creativeOptions: options }) })
    selectView("create")
    await refresh(data.creation.id)
  })
  const removeCreation = () => current && run("delete", async () => { await api(`/api/visual-engine/creations/${current.creation.id}`, { method: "DELETE" }); setCurrent(null); await refresh() })
  const removeIdentity = () => run("identity-delete", async () => { await api("/api/visual-engine/identity-profile", { method: "DELETE" }); await refresh() })
  const checkout = (offerId: string) => run(`offer-${offerId}`, async () => { const data = await api<{ url: string }>("/api/visual-engine/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }) }); window.location.assign(data.url) })
  const portal = () => run("portal", async () => { const data = await api<{ url: string }>("/api/visual-engine/billing/portal", { method: "POST" }); window.location.assign(data.url) })
  const bottomNavItems: BottomNavItem[] = [
    { id: "create", label: t.create, icon: <Camera /> },
    { id: "universes", label: t.universesNav, icon: <LayoutGrid /> },
    { id: "library", label: t.library, icon: <Images /> },
    { id: "alma", label: t.directorNav, icon: <Image src="/visual-engine/alma-directrice.webp" alt="" width={24} height={24} /> },
    { id: "account", label: t.account, icon: <CircleUserRound /> },
  ]
  const selectBottomNav = (id: string) => {
    if (id === "alma") {
      setDirectorOpen(true)
      return
    }
    if (id === "create" || id === "universes" || id === "library" || id === "account") {
      setDirectorOpen(false)
      selectView(id)
    }
  }

  return (
    <main className="mirava-theme mirava-app-shell bg-mirava-canvas text-mirava-ink">
      <MiravaGrain />
      <div className="mirava-ambient pointer-events-none fixed inset-0" />
      <Header
        brand={<Link href="/visual-engine" aria-label="Accueil MIRAVA Studio" className="mirava-button mirava-button-quiet min-h-12 px-1"><MiravaWordmark /></Link>}
        desktopNavigation={
          <nav aria-label="Navigation principale" className="mirava-desktop-nav hidden items-center gap-1 p-1 lg:flex">
            <DesktopNavButton active={view === "create" && !directorOpen} primary label={t.create} onClick={() => { setDirectorOpen(false); selectView("create") }} />
            <DesktopNavButton active={view === "universes"} label={t.universesNav} onClick={() => selectView("universes")} />
            <DesktopNavButton active={view === "library"} label={t.library} onClick={() => selectView("library")} />
            <DesktopNavButton active={directorOpen} icon={<Image src="/visual-engine/alma-directrice.webp" alt="" width={20} height={20} />} label={t.directorNav} onClick={() => setDirectorOpen(true)} />
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
        stepsLabel={locale === "fr" ? "Étapes de création" : "Etapas de creación"}
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-4 sm:px-7 sm:pt-6">
        <MiravaFirstTimeInstallBanner locale={locale} />
        {error && <div role="alert" className="mirava-alert mb-6 flex gap-3 p-4 text-sm shadow-lg"><CircleAlert className="h-5 w-5 shrink-0" />{error}</div>}
        {notice && <div className="mirava-notice mb-6 p-4 text-sm shadow-lg">{notice}</div>}
        {view === "create" && (!current
          ? <StartView locale={locale} t={t} step={createStep} setStep={setCreateStep} selectedUniverseId={selectedUniverseId} setSelectedUniverseId={setSelectedUniverseId} options={options} setOptions={setOptions} identityProfile={identityProfile} pending={pending} onCreate={requestCreate} onDirector={() => setDirectorOpen(true)} onOpenCapture={() => setCaptureContext(identityProfile ? (identityProfile.assetCount < MIRAVA_MAX_IDENTITY_PHOTOS ? "append" : "replace") : "onboarding")} />
          : <CreationView locale={locale} t={t} current={current} identityProfile={identityProfile} pending={pending} onUploadReference={uploadReference} onAnalyze={analyze} onOpenCapture={() => setCaptureContext(identityProfile ? (identityProfile.assetCount < MIRAVA_MAX_IDENTITY_PHOTOS ? "append" : "replace") : "onboarding")} onGenerate={generate} onDelete={removeCreation} onContinue={(studioId) => void reuse(studioId)} />)}
        {view === "universes" && <UniversesView locale={locale} t={t} selectedUniverseId={selectedUniverseId} setSelectedUniverseId={setSelectedUniverseId} onChoose={(brief) => { setOptions((value) => ({ ...(value.seriesSize ? { seriesSize: value.seriesSize } : {}), ...(value.seriesSize && value.seriesSize > 1 && value.seriesStrategy ? { seriesStrategy: value.seriesStrategy } : {}), ...(brief ? { note: brief } : {}) })); setCreateStep(1); selectView("create") }} />}
        {view === "library" && <LibraryView locale={locale} t={t} studios={studios} creations={creations} onReuse={(id) => void reuse(id)} onSelect={(id) => void run("select", async () => { setCurrent(await api<Detail>(`/api/visual-engine/creations/${id}`)); selectView("create") })} />}
        {view === "account" && <AccountView locale={locale} t={t} account={account} identityProfile={identityProfile} pending={pending} onCheckout={checkout} onPortal={portal} onOpenCapture={() => setCaptureContext(identityProfile ? "append" : "onboarding")} onReplaceIdentity={() => setCaptureContext("replace")} onDeleteIdentity={removeIdentity} />}
      </div>

      <BottomNavBar
        activeId={directorOpen ? "alma" : view}
        items={bottomNavItems}
        onValueChange={selectBottomNav}
        navigationLabel={locale === "fr" ? "Navigation MIRAVA" : "Navegación MIRAVA"}
        className="fixed inset-x-0 z-30 mx-auto lg:hidden"
      />

      {consentTarget !== undefined && <ConsentGate locale={locale} t={t} consents={consents} setConsents={setConsents} pending={pending} onClose={() => { setConsentTarget(undefined); setConsentReference(null) }} onConfirm={() => void create(consentTarget, consentReference)} />}
      {directorOpen && <MiravaCreativeDirector locale={locale} universeId={selectedUniverseId} options={options} onApply={(suggestions) => { setOptions((value) => ({ ...value, ...suggestions })) }} onClose={() => setDirectorOpen(false)} />}
      {captureContext && <MiravaIdentityCapture locale={locale} context={captureContext} existingCount={identityProfile?.assetCount ?? 0} onClose={() => setCaptureContext(null)} onComplete={(files, consent) => uploadIdentityFiles(files, consent, captureContext === "append" ? "append" : "replace")} />}
    </main>
  )
}

function StartView({
  locale,
  t,
  step,
  setStep,
  selectedUniverseId,
  setSelectedUniverseId,
  options,
  setOptions,
  identityProfile,
  pending,
  onCreate,
  onDirector,
  onOpenCapture,
}: {
  locale: Locale
  t: Copy
  step: number
  setStep: (step: number) => void
  selectedUniverseId: string
  setSelectedUniverseId: (id: typeof MIRAVA_UNIVERSES[number]["id"]) => void
  options: MiravaCreativeOptions
  setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>>
  identityProfile: IdentityProfile
  pending: string | null
  onCreate: (presetId?: string | null, brief?: string, referenceFile?: File | null) => void
  onDirector: () => void
  onOpenCapture: () => void
}) {
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const selected = getMiravaUniverse(selectedUniverseId) ?? MIRAVA_UNIVERSES[0]
  const identityReady = isMiravaIdentityProfileReady(identityProfile)
  const stageCopy = studioStageCopy[locale]

  const next = () => setStep(Math.min(3, step + 1))
  const back = () => setStep(Math.max(0, step - 1))
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

  const activeAdjustments = [options.location, options.styling, options.energy, options.photoStyle].filter(Boolean) as string[]
  const variationLabels = options.variationAxes?.map((axis) => ({
    location: locale === "fr" ? "décor" : "escenario",
    styling: locale === "fr" ? "tenue" : "estilismo",
    light: locale === "fr" ? "lumière" : "luz",
    framing: locale === "fr" ? "cadrage" : "encuadre",
  })[axis]) ?? []
  const sessionReady = Boolean(options.seriesSize) && (!referenceFile || options.referenceMode !== "variations" || Boolean(options.variationAxes?.length))

  return (
    <section className="mirava-onboarding mx-auto max-w-5xl pb-12 pt-5 sm:pt-9">
      <div className="mirava-onboarding-heading relative mb-8 max-w-3xl" data-step={`0${step + 1}`}>
        <p className="mirava-label">MIRAVA / {stageCopy[step].label}</p>
        <h1 className="mirava-section-title mt-3 text-4xl sm:text-6xl">{stageCopy[step].title}</h1>
        <p className="mirava-copy mt-4 max-w-2xl text-sm leading-6 sm:text-base">{stageCopy[step].text}</p>
      </div>

      {step === 0 && (
        <div>
          <div className="mirava-scroll-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
            {MIRAVA_UNIVERSES.map((universe) => (
              <UniverseCard key={universe.id} universe={universe} locale={locale} selected={!referenceFile && selected.id === universe.id} onClick={() => chooseUniverse(universe.id)} />
            ))}
          </div>
          <label className="mirava-upload mt-3 flex min-h-28 cursor-pointer items-center gap-4 p-5">
            <span className="mirava-surface-raised grid h-12 w-12 shrink-0 place-items-center"><Upload className="h-5 w-5 text-mirava-accent" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-jakarta text-sm font-semibold">{locale === "fr" ? "Partir de ma référence" : "Partir de mi referencia"}</span>
              <span className="mirava-muted mt-1 block truncate text-xs">{referenceFile?.name ?? (locale === "fr" ? "Une image suffit · JPG, PNG ou WebP" : "Una imagen basta · JPG, PNG o WebP")}</span>
            </span>
            {referenceFile && <Check className="h-5 w-5 shrink-0 text-mirava-success" />}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseReference(event.target.files?.[0] ?? null)} />
          </label>
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
              <span className="mirava-copy mt-1 block text-xs leading-5">{locale === "fr" ? "Alma vous aide à définir votre direction artistique (Profil Pro, Shooting Mode, Série) et applique automatiquement tous les réglages." : "Alma te ayuda a definir tu dirección artística (Perfil Pro, Sesión Moda, Serie) y aplica automáticamente todos los ajustes."}</span>
            </span>
            <MessageCircle className="h-5 w-5 shrink-0 text-mirava-accent" />
          </button>
          <CreativeControls locale={locale} universe={selected} referencePreview={referencePreview} isReference={Boolean(referenceFile)} options={options} setOptions={setOptions} />
        </div>
      )}

      {step === 2 && (
        <section className="mirava-identity-passport">
          <div className="mirava-identity-copy">
            <div className="flex items-start justify-between gap-4">
              <div><p className="mirava-label">{t.profile}</p><h2 className="mirava-section-title mt-3 text-3xl">{identityReady ? t.identityReady : t.identity}</h2></div>
              <span className="mirava-meta px-3 py-2 text-[10px] font-semibold tabular-nums">{identityProfile?.assetCount ?? 0}/6</span>
            </div>
            <p className="mirava-copy mt-4 text-sm leading-6">{t.identityHint}</p>
            <div className="mirava-notice mt-5 p-4 text-xs leading-5"><ShieldCheck className="mr-2 inline h-4 w-4 text-mirava-accent" />{locale === "fr" ? "Caméra guidée ou photothèque : chaque vue est contrôlée sur cet appareil avant votre validation." : "Cámara guiada o galería: cada vista se verifica en este dispositivo antes de tu validación."}</div>
            <button onClick={onOpenCapture} className="mirava-button mirava-button-primary mt-6 w-full gap-2 px-5 text-sm"><Camera className="h-4 w-4" />{identityReady ? (locale === "fr" ? "Compléter mon profil" : "Completar mi perfil") : (locale === "fr" ? "Créer mon Profil identité" : "Crear mi Perfil de identidad")}</button>
            <p className="mirava-muted mt-3 text-center text-[11px]">{locale === "fr" ? "Vous choisirez ensuite Caméra ou Photothèque." : "Después elegirás Cámara o Galería."}</p>
            {identityReady && <p className="mirava-status-success mt-5 flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4" />{locale === "fr" ? "Profil prêt pour cette séance" : "Perfil listo para esta sesión"}</p>}
          </div>
          <div className="mirava-identity-contact-sheet" aria-hidden="true">
            {identityGuide.map((image, index) => <div key={image} className={cn("mirava-identity-contact-frame relative overflow-hidden", index > 3 ? "aspect-[3/5]" : "aspect-[3/4]")}><Image src={image} alt="" fill sizes="(max-width: 1024px) 28vw, 15vw" className="object-cover" /><span>{`0${index + 1}`}</span></div>)}
          </div>
        </section>
      )}

      {step === 3 && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="mirava-dark-panel relative min-h-[26rem] overflow-hidden">
            {referencePreview ? <img src={referencePreview} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <Image src={selected.image} alt="" fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />}
            <div className="mirava-media-overlay absolute inset-0" />
            <div className="absolute inset-x-5 bottom-5">
              <p className="mirava-label">{referenceFile ? (locale === "fr" ? "RÉFÉRENCE PERSONNELLE" : "REFERENCIA PERSONAL") : selected.eyebrow[locale]}</p>
              <h2 className="mt-2 font-jakarta text-3xl font-semibold">{referenceFile?.name ?? selected.name[locale]}</h2>
            </div>
          </div>
          <Surface className="flex flex-col">
            <p className="mirava-label">{locale === "fr" ? "RÉCAPITULATIF" : "RESUMEN"}</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Source créative" : "Fuente creativa"}</dt><dd className="mt-1 font-semibold">{referenceFile ? (locale === "fr" ? "Référence personnelle" : "Referencia personal") : selected.name[locale]}</dd></div>
              <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Format" : "Formato"}</dt><dd className="mt-1 font-semibold">{options.seriesSize ? `${options.seriesSize} ${locale === "fr" ? "photo(s)" : "foto(s)"}` : "—"}</dd></div>
              <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Direction" : "Dirección"}</dt><dd className="mt-1 font-semibold">{referenceFile ? (options.referenceMode === "variations" ? (locale === "fr" ? `Variations : ${variationLabels.join(", ") || "à préciser"}` : `Variaciones: ${variationLabels.join(", ") || "por precisar"}`) : (locale === "fr" ? "Fidèle à la référence" : "Fiel a la referencia")) : selected.creativeDirection.photoStyle[locale]}</dd></div>
              {!referenceFile && <div><dt className="mirava-muted text-xs">{locale === "fr" ? "Ajustements" : "Ajustes"}</dt><dd className="mt-1 font-semibold">{activeAdjustments.length ? activeAdjustments.join(" · ") : (locale === "fr" ? "Direction MIRAVA, sans modification" : "Dirección MIRAVA, sin cambios")}</dd></div>}
              <div><dt className="mirava-muted text-xs">{t.profile}</dt><dd className="mt-1 flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-mirava-success" />{identityProfile?.assetCount ?? 0}/6</dd></div>
            </dl>
            <button onClick={() => onCreate(referenceFile ? null : selected.id, undefined, referenceFile)} disabled={!options.seriesSize || !identityReady || pending === "create"} className="mirava-button mirava-button-primary mt-8 w-full gap-2 px-5 text-sm lg:mt-auto">
              {pending === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {locale === "fr" ? "Créer mes photos" : "Crear mis fotos"}
            </button>
            {!identityReady && <p className="mirava-muted mt-3 text-xs leading-5">{locale === "fr" ? "Complétez d’abord votre Profil identité à l’étape Modèle." : "Completa primero tu Perfil de identidad en la etapa Modelo."}</p>}
          </Surface>
        </div>
      )}

      <div className="mirava-journey-actions mt-7 flex items-center justify-between gap-3">
        {step > 0 ? <button onClick={back} className="mirava-button mirava-button-secondary gap-2 px-4 text-sm"><ArrowLeft className="h-4 w-4" />{locale === "fr" ? "Retour" : "Volver"}</button> : <span />}
        {step < 3 && <button onClick={next} disabled={(step === 1 && !sessionReady) || (step === 2 && !identityReady)} className="mirava-button mirava-button-primary gap-2 px-5 text-sm">{locale === "fr" ? "Continuer" : "Continuar"}<ArrowRight className="h-4 w-4" /></button>}
      </div>
    </section>
  )
}

function UniverseCard({ universe, locale, selected, onClick }: { universe: MiravaUniverse; locale: Locale; selected: boolean; onClick: () => void }) {
  return (
    <button aria-pressed={selected} onClick={onClick} className={cn("mirava-image-frame group relative min-w-[72vw] snap-center overflow-hidden border bg-mirava-canvas-raised text-left transition-[border-color,box-shadow] duration-150 sm:min-w-0", selected ? "border-mirava-ink ring-2 ring-mirava-ink/15" : "border-mirava-line")}>
      <div className="relative aspect-[4/5]">
        <Image src={universe.image} alt={universe.name[locale]} fill sizes="(max-width: 640px) 72vw, (max-width: 1024px) 45vw, 24vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
        <div className="mirava-media-overlay absolute inset-0" />
        <div className="absolute inset-x-4 bottom-4 text-mirava-ink">
          <p className="text-[9px] font-semibold tracking-[.14em] text-mirava-ink/60">{universe.eyebrow[locale]}</p>
          <p className="mt-1 font-jakarta text-xl font-semibold tracking-[-.045em]">{universe.name[locale]}</p>
          <p className="mt-1 text-xs leading-5 text-mirava-ink/65">{universe.tagline[locale]}</p>
        </div>
        {selected && <span className="mirava-control absolute right-3 top-3 grid h-9 min-h-0 w-9 place-items-center border-mirava-ink bg-mirava-ink text-mirava-canvas"><Check className="h-4 w-4" /></span>}
      </div>
    </button>
  )
}

function CreativeControls({ locale, universe, isReference, referencePreview, options, setOptions }: { locale: Locale; universe: MiravaUniverse; isReference: boolean; referencePreview: string | null; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>> }) {
  return (
    <div className="mt-7 grid gap-3">
      <SessionFormatPicker locale={locale} options={options} setOptions={setOptions} />
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

function SessionFormatPicker({ locale, options, setOptions }: { locale: Locale; options: MiravaCreativeOptions; setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>> }) {
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
          <span className="mirava-required-mark text-[10px] font-semibold uppercase tracking-[.12em]">{options.seriesSize ? (locale === "fr" ? "Choisi" : "Elegido") : (locale === "fr" ? "À choisir" : "Por elegir")}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {seriesOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setOptions((current) => ({ ...current, seriesSize: item.value, seriesStrategy: item.value > 1 ? (current.seriesStrategy ?? "single-setting") : undefined }))}
              data-selected={options.seriesSize === item.value}
              className="mirava-control min-h-20 p-3 text-left transition-[background-color,border-color,color] duration-150"
            >
              <span className="block text-xs font-semibold">{item.label}</span>
              <span className={cn("mt-1 block text-[10px]", options.seriesSize === item.value ? "text-mirava-canvas/60" : "mirava-muted")}>{item.detail}</span>
            </button>
          ))}
        </div>
        <p className="mirava-copy mt-3 text-xs leading-5">
          {locale === "fr"
            ? "Le format détermine le nombre d’images livrées et les crédits utilisés."
            : "El formato determina el número de imágenes entregadas y los créditos utilizados."}
        </p>
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
    <section className="mirava-direction-card mirava-material-spotlight overflow-hidden p-5 sm:p-6">
      <div className="relative z-10">
        <p className="mirava-label">MIRAVA / {locale === "fr" ? "DIRECTION PROPOSÉE" : "DIRECCIÓN PROPUESTA"}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-jakarta text-2xl font-semibold tracking-[-.05em]">{universe.name[locale]}</h2><p className="mirava-copy mt-2 max-w-xl text-xs leading-5">{locale === "fr" ? "Cette direction est déjà complète. Vous pouvez continuer sans rien configurer." : "Esta dirección ya está completa. Puedes continuar sin configurar nada."}</p></div>
          <span className="mirava-inherited-mark px-3 py-2 text-[10px] font-semibold uppercase tracking-[.1em]">{locale === "fr" ? "Hérité" : "Heredado"}</span>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => <div key={row.label}><dt className="mirava-muted text-[10px] font-semibold uppercase tracking-[.12em]">{row.label}</dt><dd className="mt-1 text-sm font-medium leading-5">{row.value}</dd></div>)}
        </dl>
      </div>
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
    <div className="mirava-modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <section className="mirava-modal max-h-dvh w-full max-w-xl overflow-y-auto p-5 sm:max-h-[94dvh] sm:p-7">
        <div className="flex items-start justify-between">
          <div><p className="mirava-label">MIRAVA / {locale === "fr" ? "ACCÈS PRIVÉ" : "ACCESO PRIVADO"}</p><h2 className="mirava-section-title mt-2 text-3xl">{t.consent}</h2></div>
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
        <p className="mirava-muted mt-4 text-center text-[10px] leading-4">{locale === "fr" ? "Le consentement ne contourne jamais les règles de sécurité du fournisseur." : "El consentimiento nunca elude las reglas de seguridad del proveedor."}</p>
      </section>
    </div>
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
  const status = current.creation.status
  const referenceCount = current.assets.filter((asset) => asset.kind === "REFERENCE").length
  const busy = pendingStatuses.includes(status)

  if (status === "COMPLETED" && current.resultUrl) {
    const resultUrls = current.resultUrls?.length ? current.resultUrls : [current.resultUrl]
    return (
      <section className="mx-auto max-w-3xl py-8 sm:py-14">
        <p className="mirava-label">MIRAVA / SIGNATURE</p>
        <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl">{t.result}</h1>
        <div className={cn("mirava-dark-panel mt-7 grid gap-2 p-2", resultUrls.length > 1 && "sm:grid-cols-2")}>
          {resultUrls.map((url, index) => (
            <div key={url} className={cn("mirava-image-frame relative overflow-hidden", resultUrls.length === 3 && index === 0 && "sm:col-span-2 sm:mx-auto sm:w-1/2")}>
              <img src={url} alt={`${t.result} ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
              <a href={url} download className="mirava-button mirava-button-primary absolute bottom-3 right-3 h-12 w-12 p-0 backdrop-blur" aria-label={`${t.download} ${index + 1}`}>
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {current.creation.studioProfileId && <button onClick={() => onContinue(current.creation.studioProfileId!)} disabled={pending === "reuse"} className="mirava-surface-raised min-h-24 p-5 text-left"><span className="flex items-center gap-2 font-jakarta text-lg font-semibold"><Images className="h-4 w-4 text-mirava-accent" />{t.continueShoot}</span><span className="mirava-copy mt-2 block text-xs">{t.continueHint}</span></button>}
          <div className="mirava-surface flex items-center gap-2 p-3">
            <a href={current.resultUrl} download className="mirava-button mirava-button-primary min-h-12 flex-1 px-4 text-xs"><Download className="mr-2 h-4 w-4" />{resultUrls.length > 1 ? `${t.download} 1` : t.download}</a>
            <button onClick={onDelete} disabled={pending === "delete"} className="mirava-button mirava-button-danger h-12 w-12 p-0" aria-label={t.delete}><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {status === "DRAFT" ? (locale === "fr" ? "RÉFÉRENCE" : "REFERENCIA") : status === "IDENTITY_READY" ? (locale === "fr" ? "IDENTITÉ" : "IDENTIDAD") : "STUDIO"}</p>
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl">{busy ? (status.includes("ANAL") ? t.analysing : t.generating) : t.status[status]}</h1>

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
            <h2 className="font-jakarta text-2xl font-semibold tracking-[-.04em]">{t.identity}</h2>
            <p className="mirava-copy mt-2 text-sm leading-6">{t.identityHint}</p>
            <button onClick={onOpenCapture} className="mirava-dark-panel mt-6 min-h-36 w-full p-5 text-left">
              <Camera className="h-5 w-5 text-mirava-accent" />
              <span className="mt-5 block font-jakarta text-lg font-semibold">{locale === "fr" ? "Ouvrir mon Profil identité" : "Abrir mi Perfil de identidad"}</span>
              <span className="mirava-copy mt-2 block text-xs leading-5">{locale === "fr" ? "Choisissez ensuite caméra guidée ou photothèque. Toutes les vues sont contrôlées localement." : "Elige después cámara guiada o galería. Todas las vistas se verifican localmente."}</span>
            </button>
            {isMiravaIdentityProfileReady(identityProfile) ? <p className="mirava-status-success mt-4 flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4" />{t.identityReady} · {identityProfile!.assetCount}/6</p> : null}
            <button disabled={!isMiravaIdentityProfileReady(identityProfile) || pending === "generate"} onClick={onGenerate} className="mirava-button mirava-button-primary mt-5 min-h-12 px-5">{pending === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{t.generate}</button>
          </Surface>

          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {identityGuide.map((image, index) => <div key={image} className={cn("mirava-image-frame relative overflow-hidden bg-mirava-surface-raised", index > 3 ? "aspect-[3/5]" : "aspect-[3/4]")}><Image src={image} alt="" fill sizes="16vw" className="object-cover" /></div>)}
          </div>
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
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-6xl">{t.universes}</h1>
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

function LibraryView({ locale, t, studios, creations, onReuse, onSelect }: { locale: Locale; t: Copy; studios: Studio[]; creations: Creation[]; onReuse: (id: string) => void; onSelect: (id: string) => void }) {
  return (
    <section className="py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {locale === "fr" ? "ARCHIVE PRIVÉE" : "ARCHIVO PRIVADO"}</p>
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl">{t.libraryTitle}</h1>
      <h2 className="mirava-section-title mt-10 text-2xl">{t.studiosTitle}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {studios.map((studio) => {
          const universe = getMiravaUniverse(studio.presetId)
          return <article key={studio.id} className="mirava-surface overflow-hidden">
            <div className="relative aspect-[16/10] bg-mirava-canvas-raised">{universe && <Image src={universe.image} alt="" fill sizes="33vw" className="object-cover" />}</div>
            <div className="p-5"><p className="font-jakarta text-lg font-semibold">{studio.name}</p><p className="mirava-copy mt-2 text-xs">{universe?.tagline[locale] ?? (locale === "fr" ? "Direction personnelle privée" : "Dirección personal privada")}</p><button onClick={() => onReuse(studio.id)} className="mirava-button mirava-button-primary mt-5 min-h-12 px-4 text-xs">{t.reuse}<ChevronRight className="ml-1 h-4 w-4" /></button></div>
          </article>
        })}
        {!studios.length && <p className="mirava-copy text-sm">{t.empty}</p>}
      </div>
      <h2 className="mirava-section-title mt-12 text-2xl">{t.libraryTitle}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {creations.map((creation) => <button key={creation.id} onClick={() => onSelect(creation.id)} className="mirava-surface overflow-hidden text-left"><div className="aspect-[4/5] bg-mirava-surface-raised">{creation.resultUrl && <img src={creation.resultUrl} alt="" className="h-full w-full object-cover" />}</div><p className="p-3 text-xs font-semibold">{t.status[creation.status]}</p></button>)}
      </div>
    </section>
  )
}

function AccountView({
  locale,
  t,
  account,
  identityProfile,
  pending,
  onCheckout,
  onPortal,
  onOpenCapture,
  onReplaceIdentity,
  onDeleteIdentity,
}: {
  locale: Locale
  t: Copy
  account: Account | null
  identityProfile: IdentityProfile
  pending: string | null
  onCheckout: (id: string) => void
  onPortal: () => void
  onOpenCapture: () => void
  onReplaceIdentity: () => void
  onDeleteIdentity: () => void
}) {
  const ready = isMiravaIdentityProfileReady(identityProfile)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushNotice, setPushNotice] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

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

  return (
    <section className="py-8 sm:py-14">
      <p className="mirava-label">MIRAVA / {locale === "fr" ? "ACCÈS" : "ACCESO"}</p>
      <h1 className="mirava-section-title mt-3 text-4xl sm:text-5xl">{t.accountTitle}</h1>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Surface className="flex flex-col justify-between">
          <div>
            <p className="tabular-nums font-jakarta text-4xl font-semibold">{account?.credits ?? 0}</p>
            <p className="mirava-copy mt-1 text-sm">{t.credits}</p>
          </div>
          <button onClick={onPortal} disabled={!account?.subscription || pending === "portal"} className="mirava-button mirava-button-secondary mt-6 self-start px-4 text-sm font-semibold">
            {pending === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t.portal}
          </button>
        </Surface>
        <Surface>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mirava-label">{locale === "fr" ? "MODÈLE PRIVÉ" : "MODELO PRIVADO"}</p>
              <h2 className="mirava-section-title mt-3 text-2xl">{ready ? t.identityReady : (locale === "fr" ? "Préparer mon modèle" : "Preparar mi modelo")}</h2>
            </div>
            <span className="mirava-meta px-3 py-2 text-[10px] font-semibold tabular-nums">{identityProfile?.assetCount ?? 0}/6</span>
          </div>
          <p className="mirava-copy mt-4 text-sm leading-6">{t.profilePrivacy}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onOpenCapture} disabled={identityProfile?.assetCount === MIRAVA_MAX_IDENTITY_PHOTOS} className="mirava-button mirava-button-primary px-4 text-sm font-semibold">
              <Camera className="mr-2 h-4 w-4" />{identityProfile ? (locale === "fr" ? "Ajouter une vue" : "Añadir una vista") : t.guided}
            </button>
            {identityProfile && (
              <button onClick={onReplaceIdentity} className="mirava-button mirava-button-secondary px-4 text-sm font-semibold">
                <RotateCcw className="mr-2 h-4 w-4" />{locale === "fr" ? "Refaire" : "Rehacer"}
              </button>
            )}
            {identityProfile && (
              <button onClick={onDeleteIdentity} disabled={pending === "identity-delete"} className="mirava-button mirava-button-danger px-4 text-sm font-semibold">
                {pending === "identity-delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {locale === "fr" ? "Supprimer" : "Eliminar"}
              </button>
            )}
          </div>
        </Surface>
      </div>
      <div className="mt-10">
        <h2 className="font-jakarta text-2xl font-semibold">{t.plans}</h2>
        <Offers offers={account?.plans ?? []} locale={locale} t={t} onCheckout={onCheckout} pending={pending} />
        <h2 className="mt-10 font-jakarta text-2xl font-semibold">{t.packs}</h2>
        <Offers offers={account?.packs ?? []} locale={locale} t={t} onCheckout={onCheckout} pending={pending} />
      </div>
      <div className="mt-10 max-w-lg">
        <button onClick={() => void handleNotify()} disabled={pushLoading} className="mirava-button mirava-button-secondary min-h-12 w-full gap-2 px-4 text-sm font-semibold sm:w-auto">
          {pushLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {t.notify}
        </button>
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

function Offers({ offers, locale, t, onCheckout, pending }: { offers: Offer[]; locale: Locale; t: Copy; onCheckout: (id: string) => void; pending: string | null }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {offers.map((offer) => {
        const isOfferPending = pending === `offer-${offer.id}`
        return (
          <Surface key={offer.id} className="flex flex-col justify-between p-5">
            <div>
              <p className="tabular-nums font-jakarta text-xl font-semibold">{offer.credits}</p>
              <p className="mirava-copy mt-0.5 text-xs">{offer.name}</p>
              <p className="tabular-nums mt-4 font-jakarta text-2xl font-semibold">{offer.priceEur} €</p>
            </div>
            <button
              onClick={() => onCheckout(offer.id)}
              disabled={pending !== null}
              className="mirava-button mirava-button-primary mt-5 min-h-12 w-full gap-2 text-xs font-semibold"
            >
              {isOfferPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isOfferPending ? (locale === "fr" ? "Ouverture…" : "Abriendo…") : t.choose}
            </button>
          </Surface>
        )
      })}
    </div>
  )
}

function DesktopNavButton({ active, primary = false, icon, label, onClick }: { active: boolean; primary?: boolean; icon?: ReactElement; label: string; onClick: () => void }) {
  return <button aria-current={active ? "page" : undefined} onClick={onClick} data-active={active} data-primary={primary} className="mirava-desktop-tab flex min-h-12 items-center gap-2 px-4 text-xs font-semibold">{icon && <span className="mirava-desktop-tab-icon">{icon}</span>}{label}</button>
}
