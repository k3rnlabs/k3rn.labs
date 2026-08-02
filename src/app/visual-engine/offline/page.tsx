"use client"

import Link from "next/link"
import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { MiravaMark } from "@/components/mirava/mirava-wordmark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"

export default function MiravaOfflinePage() {
  const { locale } = useMiravaLocale()

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <main className="mirava-theme relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#0d0e0e] px-4 py-8 text-white font-jakarta">
      {/* Background Texture & Ambient Glow */}
      <MiravaGrain />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 bottom-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-[#ede8df]/5 blur-[100px]" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-white/15 bg-white/5 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-center space-y-6">
        
        {/* Top Header Badge & Logo */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner">
            <MiravaMark className="h-6 w-6 text-[#ede8df]" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <WifiOff className="h-3.5 w-3.5" />
            <span>MIRAVA STUDIO · {locale === "fr" ? "HORS LIGNE" : "SIN CONEXIÓN"}</span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {locale === "fr" ? "Connexion requise" : "Conexión requerida"}
          </h1>
          <p className="mx-auto max-w-xs text-xs sm:text-sm leading-relaxed text-white/70">
            {locale === "fr"
              ? "Pour sécuriser vos images privées et générer vos séries avec l'IA, MIRAVA Studio nécessite une connexion Internet active."
              : "Para proteger tus imágenes privadas y generar tus series con IA, MIRAVA Studio requiere una conexión activa."}
          </p>
        </div>

        {/* Info Reassurance Badge */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-white/60 leading-snug">
          🛡️ {locale === "fr"
            ? "Vos créations et photos personnelles sont protégées et ne sont jamais stockées hors ligne."
            : "Tus creaciones y fotos personales están protegidas y nunca se guardan sin conexión."}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleRetry}
            className="group flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ede8df] px-5 text-sm font-semibold text-[#0d0e0e] shadow-lg transition-all hover:bg-white active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
            <span>{locale === "fr" ? "Réessayer la connexion" : "Reintentar conexión"}</span>
          </button>

          <Link
            href="/visual-engine/studio"
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{locale === "fr" ? "Retour au Studio" : "Volver al Studio"}</span>
          </Link>
        </div>

      </div>
    </main>
  )
}
