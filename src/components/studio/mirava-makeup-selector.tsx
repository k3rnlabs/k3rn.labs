"use client"

import type { Dispatch, SetStateAction } from "react"

import type { MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import type { MiravaMakeupIntensity, MiravaMakeupMode } from "@/lib/mirava/makeup"
import { cn } from "@/lib/utils"

type Locale = "fr" | "es"

type Props = {
  locale: Locale
  options: MiravaCreativeOptions
  setOptions: Dispatch<SetStateAction<MiravaCreativeOptions>>
}

const modes: Array<{
  id: MiravaMakeupMode
  fr: string
  es: string
  frDescription: string
  esDescription: string
  recommended?: boolean
}> = [
  {
    id: "auto_reference",
    fr: "Selon la référence",
    es: "Según la referencia",
    frDescription: "Reprend le maquillage visible. Si la référence est neutre, MIRAVA applique un fini naturel photo-ready.",
    esDescription: "Reproduce el maquillaje visible. Si la referencia es neutra, MIRAVA aplica un acabado natural listo para cámara.",
    recommended: true,
  },
  {
    id: "none",
    fr: "Sans maquillage",
    es: "Sin maquillaje",
    frDescription: "Peau, sourcils, cils et lèvres restent naturels.",
    esDescription: "La piel, las cejas, las pestañas y los labios permanecen naturales.",
  },
  {
    id: "natural",
    fr: "Naturel",
    es: "Natural",
    frDescription: "Teint léger, regard défini et rendu peau réaliste.",
    esDescription: "Tez ligera, mirada definida y textura de piel realista.",
  },
  {
    id: "soft_glam",
    fr: "Soft glam",
    es: "Soft glam",
    frDescription: "Poli, lumineux et élégant sans effet trop maquillé.",
    esDescription: "Pulido, luminoso y elegante sin verse excesivo.",
  },
  {
    id: "glam",
    fr: "Glam",
    es: "Glam",
    frDescription: "Regard, teint et lèvres plus affirmés pour un shooting premium.",
    esDescription: "Mirada, tez y labios más definidos para una sesión premium.",
  },
  {
    id: "editorial",
    fr: "Éditorial",
    es: "Editorial",
    frDescription: "Concept beauté mode cohérent avec la tenue, la lumière et la direction.",
    esDescription: "Concepto de belleza de moda coherente con el vestuario, la luz y la dirección.",
  },
]

const intensities: Array<{ id: MiravaMakeupIntensity; fr: string; es: string }> = [
  { id: "light", fr: "Léger", es: "Ligero" },
  { id: "medium", fr: "Équilibré", es: "Equilibrado" },
  { id: "strong", fr: "Marqué", es: "Marcado" },
]

export function MiravaMakeupSelector({ locale, options, setOptions }: Props) {
  const selectedMode = options.makeupMode ?? "auto_reference"
  const selectedIntensity = options.makeupIntensity ?? "medium"

  const updateMode = (mode: MiravaMakeupMode) => {
    setOptions((current) => ({
      ...current,
      makeupMode: mode,
      makeupIntensity: current.makeupIntensity ?? "medium",
    }))
  }

  const updateIntensity = (intensity: MiravaMakeupIntensity) => {
    setOptions((current) => ({ ...current, makeupIntensity: intensity }))
  }

  return (
    <section
      className="mirava-material-spotlight mt-5 overflow-hidden p-5 sm:p-6"
      aria-labelledby="mirava-makeup-title"
      data-mirava-makeup-selector
    >
      <div className="max-w-2xl">
        <p className="mirava-label">MIRAVA / {locale === "fr" ? "BEAUTÉ" : "BELLEZA"}</p>
        <h2 id="mirava-makeup-title" className="mt-2 font-jakarta text-2xl font-semibold tracking-[-.045em]">
          {locale === "fr" ? "Quel maquillage pour cette séance ?" : "¿Qué maquillaje quieres para esta sesión?"}
        </h2>
        <p className="mirava-copy mt-2 text-sm leading-6">
          {locale === "fr"
            ? "Votre Profil identité reste naturel. Le maquillage est appliqué uniquement à cette séance et ne modifie jamais votre visage."
            : "Tu Perfil de identidad permanece natural. El maquillaje se aplica solo a esta sesión y nunca modifica tu rostro."}
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={locale === "fr" ? "Style de maquillage" : "Estilo de maquillaje"}>
        {modes.map((mode) => {
          const selected = selectedMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => updateMode(mode.id)}
              className={cn(
                "mirava-choice-card relative min-h-32 p-4 text-left transition-transform duration-200",
                "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5c6b0]",
              )}
              data-selected={selected}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold">{locale === "fr" ? mode.fr : mode.es}</span>
                {mode.recommended ? (
                  <span className="rounded-full border border-[#d5c6b0]/30 bg-[#d5c6b0]/10 px-2 py-1 font-jakarta text-[9px] font-semibold uppercase tracking-[.12em] text-[#e5d7c2]">
                    {locale === "fr" ? "Recommandé" : "Recomendado"}
                  </span>
                ) : null}
              </span>
              <span className="mirava-choice-copy mt-2 block text-xs leading-5">
                {locale === "fr" ? mode.frDescription : mode.esDescription}
              </span>
            </button>
          )
        })}
      </div>

      {selectedMode !== "none" && selectedMode !== "auto_reference" ? (
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="mirava-label">{locale === "fr" ? "INTENSITÉ" : "INTENSIDAD"}</p>
          <div className="mt-3 grid max-w-lg grid-cols-3 gap-2" role="radiogroup" aria-label={locale === "fr" ? "Intensité du maquillage" : "Intensidad del maquillaje"}>
            {intensities.map((intensity) => {
              const selected = selectedIntensity === intensity.id
              return (
                <button
                  key={intensity.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateIntensity(intensity.id)}
                  className="mirava-choice-card min-h-12 px-3 py-2 text-center text-xs font-semibold"
                  data-selected={selected}
                >
                  {locale === "fr" ? intensity.fr : intensity.es}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
