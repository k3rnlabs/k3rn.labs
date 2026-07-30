"use client"

import Link from "next/link"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"

export default function MiravaOfflinePage() {
  const { locale } = useMiravaLocale()
  return <main className="mirava-theme flex min-h-dvh items-center justify-center bg-mirava-canvas px-6 py-[var(--mirava-safe-top)] text-center text-mirava-ink"><MiravaGrain /><div><MiravaWordmark /><p className="mirava-label mt-10">MIRAVA / {locale === "fr" ? "HORS LIGNE" : "SIN CONEXIÓN"}</p><h1 className="mirava-title mt-4 text-4xl">{locale === "fr" ? "Revenez quand la connexion sera là." : "Vuelve cuando recuperes la conexión."}</h1><p className="mirava-copy mx-auto mt-4 max-w-sm text-base leading-7">{locale === "fr" ? "Vos créations et vos images privées ne sont jamais conservées hors ligne." : "Tus creaciones e imágenes privadas nunca se guardan sin conexión."}</p><Link href="/visual-engine/studio" className="mirava-button mirava-button-primary mt-8 px-6 text-sm">{locale === "fr" ? "Réessayer" : "Volver a intentarlo"}</Link></div></main>
}
