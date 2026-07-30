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
  return <div className="relative">
    <button type="button" onClick={install} className="mirava-button mirava-button-secondary gap-2 px-4 text-sm">
      <Download className="h-4 w-4" />{locale === "fr" ? "Installer MIRAVA Studio" : "Instalar MIRAVA Studio"}
    </button>
    {showIosHint && <div role="status" className="mirava-surface-raised absolute left-0 z-20 mt-3 w-[min(18rem,calc(100vw-2rem))] p-4 text-left text-sm leading-6 text-mirava-ink/75 sm:left-auto sm:right-0">
      <Share2 className="mb-2 h-4 w-4 text-mirava-accent" />
      {locale === "fr" ? "Dans Safari, touchez Partager puis « Sur l’écran d’accueil » pour installer MIRAVA Studio." : "En Safari, toca Compartir y después « Añadir a la pantalla de inicio » para instalar MIRAVA Studio."}
    </div>}
  </div>
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
