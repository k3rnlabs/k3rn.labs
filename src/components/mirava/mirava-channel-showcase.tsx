"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ImageIcon, LayoutGrid, Sparkles } from "lucide-react"

type Props = {
  locale: "fr" | "es"
}

type UseCase = "feed" | "profile" | "campaign"

const cases = {
  fr: {
    eyebrow: "UNE IMAGE SIGNATURE · VOTRE PRÉSENCE",
    title: "Votre galerie devient votre base éditoriale.",
    subtitle: "Chaque création est livrée dans votre galerie privée au format vertical 4:5. Votre studio personnel reste disponible pour la prochaine image.",
    tabs: { feed: "Feed", profile: "Profil", campaign: "Série" },
    content: {
      feed: {
        label: "PRÊTE À PUBLIER",
        heading: "Une image verticale pensée pour votre feed.",
        bullets: ["Un format signature 4:5", "Votre identité reste au centre de l’image", "Téléchargeable depuis votre galerie privée"],
        image: "/visual-engine/univers/escapade-solaire.webp",
      },
      profile: {
        label: "IDENTITÉ COHÉRENTE",
        heading: "Le même visage, dans chaque nouvelle direction.",
        bullets: ["Votre Profil identité reste privé", "Votre studio personnel est réutilisable", "Une présence cohérente d’une séance à l’autre"],
        image: "/visual-engine/univers/beauty-close-up.webp",
      },
      campaign: {
        label: "SÉRIE ÉDITORIALE",
        heading: "Créez plusieurs images d’un même univers, à votre rythme.",
        bullets: ["Un studio mémorisé pour vos prochaines séances", "Une nouvelle image utilise un crédit", "Chaque résultat rejoint votre galerie privée"],
        image: "/visual-engine/univers/editorial-mode.webp",
      },
    },
    cta: "Créer ma séance",
    result: "RÉSULTAT MIRAVA · 4:5",
  },
  es: {
    eyebrow: "UNA IMAGEN SIGNATURE · TU PRESENCIA",
    title: "Tu galería se convierte en tu base editorial.",
    subtitle: "Cada creación se entrega en tu galería privada en formato vertical 4:5. Tu estudio personal queda disponible para la próxima imagen.",
    tabs: { feed: "Feed", profile: "Perfil", campaign: "Serie" },
    content: {
      feed: {
        label: "LISTA PARA PUBLICAR",
        heading: "Una imagen vertical pensada para tu feed.",
        bullets: ["Un formato distintivo 4:5", "Tu identidad permanece en el centro", "Descargable desde tu galería privada"],
        image: "/visual-engine/univers/escapade-solaire.webp",
      },
      profile: {
        label: "IDENTIDAD COHERENTE",
        heading: "El mismo rostro, en cada nueva dirección.",
        bullets: ["Tu Perfil de identidad permanece privado", "Tu estudio personal es reutilizable", "Una presencia coherente de una sesión a otra"],
        image: "/visual-engine/univers/beauty-closeup.webp",
      },
      campaign: {
        label: "SERIE EDITORIAL",
        heading: "Crea varias imágenes de un mismo universo, a tu ritmo.",
        bullets: ["Un estudio memorizado para tus próximas sesiones", "Cada nueva imagen usa un crédito", "Cada resultado llega a tu galería privada"],
        image: "/visual-engine/univers/editorial-mode.webp",
      },
    },
    cta: "Crear mi sesión",
    result: "RESULTADO MIRAVA · 4:5",
  },
} as const

export function MiravaChannelShowcase({ locale }: Props) {
  const [activeCase, setActiveCase] = useState<UseCase>("feed")
  const t = cases[locale]
  const selected = t.content[activeCase]

  return (
    <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="max-w-3xl">
        <span className="mirava-label">{t.eyebrow}</span>
        <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.title}</h2>
        <p className="mirava-copy mt-4 text-base leading-7 sm:text-lg sm:leading-8">{t.subtitle}</p>
      </div>

      <div role="tablist" aria-label={t.eyebrow} className="mt-8 inline-flex w-full max-w-md gap-1.5 rounded-xl border border-mirava-line bg-mirava-surface p-1.5">
        {(["feed", "profile", "campaign"] as const).map((key) => {
          const selectedTab = activeCase === key
          const Icon = key === "feed" ? ImageIcon : key === "profile" ? Sparkles : LayoutGrid
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`mirava-presence-tab-${key}`}
              aria-selected={selectedTab}
              aria-controls={`mirava-presence-panel-${key}`}
              onClick={() => setActiveCase(key)}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 font-jakarta text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mirava-accent ${selectedTab ? "bg-mirava-accent text-mirava-canvas" : "text-mirava-ink-secondary hover:text-mirava-ink"}`}
            >
              <Icon className="h-4 w-4" />
              {t.tabs[key]}
            </button>
          )
        })}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
        <div className="mirava-image-frame relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-mirava-line">
          <Image src={selected.image} alt={selected.heading} fill sizes="(max-width: 1024px) 88vw, 36vw" className="object-cover" />
          <div className="mirava-media-overlay absolute inset-0" />
          <span className="absolute inset-x-5 bottom-5 font-jakarta text-[10px] font-bold tracking-[.18em] text-mirava-ink/90">{t.result}</span>
        </div>

        <div role="tabpanel" id={`mirava-presence-panel-${activeCase}`} aria-labelledby={`mirava-presence-tab-${activeCase}`} className="mirava-surface rounded-2xl border border-mirava-line p-6 sm:p-8">
          <span className="font-jakarta text-xs font-bold uppercase tracking-wider text-mirava-accent">{selected.label}</span>
          <h3 className="mt-4 font-jakarta text-2xl font-extrabold text-mirava-ink sm:text-3xl">{selected.heading}</h3>
          <ul className="mt-6 space-y-3">
            {selected.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm leading-6 text-mirava-ink-secondary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t border-mirava-line/60 pt-6">
            <Link href="/visual-engine/studio" className="mirava-button mirava-button-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-6 text-sm font-semibold font-jakarta sm:w-auto">
              {t.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
