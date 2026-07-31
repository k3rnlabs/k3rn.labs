"use client"

import { Download, Share2 } from "lucide-react"
import { useEffect, useState } from "react"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
}

export function MiravaPwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    void navigator.serviceWorker.register("/visual-engine/sw.js", { scope: "/visual-engine/" })
  }, [])
  return null
}

export function MiravaInstallButton({ locale }: { locale: "fr" | "es" }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") setInstallPrompt(null)
      return
    }
    if (isIosSafari()) setShowIosHint((value) => !value)
  }

  if (!installPrompt && !isIosSafari()) return null
  return (
    <div className="relative">
      <button type="button" onClick={install} className="mirava-button mirava-button-secondary gap-2 px-4 text-sm">
        <Download className="h-4 w-4" />
        {locale === "fr" ? "Installer MIRAVA Studio" : "Instalar MIRAVA Studio"}
      </button>
      {showIosHint && (
        <div role="status" className="mirava-surface-raised absolute left-0 z-20 mt-3 w-[min(18rem,calc(100vw-2rem))] p-4 text-left text-sm leading-6 text-mirava-ink/75 sm:left-auto sm:right-0">
          <Share2 className="mb-2 h-4 w-4 text-mirava-accent" />
          {locale === "fr" ? "Dans Safari, touchez Partager puis « Sur l’écran d’accueil » pour installer MIRAVA Studio." : "En Safari, toca Compartir y después « Añadir a la pantalla de inicio » para instalar MIRAVA Studio."}
        </div>
      )}
    </div>
  )
}

export function MiravaFirstTimeInstallBanner({ locale }: { locale: "fr" | "es" }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const isIos = isIosSafari()

  useEffect(() => {
    if (typeof window === "undefined") return
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
    const isDismissed = localStorage.getItem("mirava_pwa_onboarded") === "true"
    if (!isStandalone && !isDismissed) {
      setIsVisible(true)
    }

    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") {
        localStorage.setItem("mirava_pwa_onboarded", "true")
        setIsVisible(false)
      }
    }
  }

  const handleDismiss = () => {
    localStorage.setItem("mirava_pwa_onboarded", "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div role="dialog" aria-labelledby="pwa-install-title" className="mirava-notice mb-6 rounded-2xl border border-mirava-accent/35 bg-gradient-to-br from-mirava-canvas-raised/95 via-mirava-surface-raised/90 to-mirava-canvas/95 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-mirava-accent/40 bg-mirava-accent/15 text-mirava-accent shadow-md">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 id="pwa-install-title" className="font-jakarta text-base font-bold text-mirava-ink">
              {locale === "fr" ? "Installez MIRAVA Studio sur votre écran d’accueil" : "Instala MIRAVA Studio en tu pantalla de inicio"}
            </h2>
            <p className="mt-0.5 text-xs text-mirava-ink-muted">
              {locale === "fr"
                ? "Bénéficiez de l'expérience plein écran optimale, du guidage caméra fluide et des notifications d'avancement."
                : "Disfruta de la experiencia a pantalla completa óptima, guiado de cámara fluido y notificaciones."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-medium text-mirava-ink-muted hover:text-mirava-ink"
          aria-label={locale === "fr" ? "Fermer" : "Cerrar"}
        >
          ✕
        </button>
      </div>

      {isIos ? (
        <div className="mt-4 rounded-xl border border-mirava-accent/20 bg-mirava-surface-raised/80 p-3.5 text-xs leading-5 text-mirava-ink-secondary">
          <p className="font-semibold text-mirava-accent mb-1.5 flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            {locale === "fr" ? "Instructions pour Safari iOS :" : "Instrucciones para Safari iOS:"}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px]">
            <li>{locale === "fr" ? "Touchez le bouton Partager dans le menu Safari" : "Toca el botón Compartir en el menú de Safari"}</li>
            <li>{locale === "fr" ? "Faites défiler et sélectionnez « Sur l'écran d'accueil »" : "Desplázate y selecciona « Añadir a la pantalla de inicio »"}</li>
          </ol>
        </div>
      ) : installPrompt ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="mirava-button mirava-button-primary min-h-10 gap-2 px-5 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            {locale === "fr" ? "Installer en 1 clic" : "Instalar en 1 clic"}
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-mirava-line/30 pt-3">
        <span className="text-[10px] text-mirava-muted">
          {locale === "fr" ? "Recommandé pour Safari & Chrome mobile" : "Recomendado para Safari y Chrome móvil"}
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-medium text-mirava-accent underline decoration-mirava-accent/40 underline-offset-4 hover:text-mirava-ink"
        >
          {locale === "fr" ? "Continuer dans le navigateur" : "Continuar en el navegador"}
        </button>
      </div>
    </div>
  )
}

export async function enableMiravaPush(locale: "fr" | "es"): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_MIRAVA_PUSH_PUBLIC_KEY
  if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return false
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false
  const registration = await navigator.serviceWorker.ready
  const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/")
  const key = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (char) => char.charCodeAt(0))
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  const response = await fetch("/api/visual-engine/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...subscription.toJSON(), locale }),
  })
  return response.ok
}

