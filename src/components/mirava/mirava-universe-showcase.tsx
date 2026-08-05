"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { captureMiravaAnalytics } from "@/lib/mirava/analytics-consent.client"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"

interface MiravaUniverseShowcaseProps {
  locale: "fr" | "es"
}

export function MiravaUniverseShowcase({ locale }: MiravaUniverseShowcaseProps) {
  const [selectedId, setSelectedId] = useState<string>(MIRAVA_UNIVERSES[0].id)
  const activeUniverse = MIRAVA_UNIVERSES.find((u) => u.id === selectedId) || MIRAVA_UNIVERSES[0]

  const copy = {
    fr: {
      badge: "PREUVE D'IDENTITÉ · UN VISAGE, SEPT UNIVERS",
      selectLabel: "Choisir cet univers",
      keyElementsTitle: "Éléments clés de la direction :",
      briefsTitle: "Exemples de séances :",
      launchCta: "Lancer dans cet univers",
      indexLabel: "Univers",
    },
    es: {
      badge: "PRUEBA DE IDENTIDAD · UN ROSTRO, SIETE UNIVERSOS",
      selectLabel: "Elegir este universo",
      keyElementsTitle: "Elementos clave de dirección:",
      briefsTitle: "Ejemplos de sesiones:",
      launchCta: "Iniciar en este universo",
      indexLabel: "Universo",
    },
  }[locale]

  const handleSelectUniverse = (id: string, name: string) => {
    setSelectedId(id)
    try {
      captureMiravaAnalytics("style_selected", { universe_id: id, universe_name: name })
    } catch (_) {}
  }

  return (
    <div className="relative mx-auto max-w-7xl">
      {/* Selector Tabs */}
      <div className="mirava-scroll-row flex gap-2.5 overflow-x-auto pb-4 sm:grid sm:grid-cols-4 lg:grid-cols-7">
        {MIRAVA_UNIVERSES.map((universe, index) => {
          const isSelected = universe.id === selectedId
          return (
            <button
              key={universe.id}
              onClick={() => handleSelectUniverse(universe.id, universe.name.fr)}
              className={`mirava-image-frame group relative min-w-[42vw] min-h-[44px] snap-center overflow-hidden text-left transition-all duration-300 sm:min-w-0 ${
                isSelected
                  ? "ring-2 ring-mirava-accent ring-offset-2 ring-offset-mirava-canvas shadow-lg scale-[1.02]"
                  : "opacity-75 hover:opacity-100 hover:scale-[1.01]"
              }`}
              style={{ borderRadius: "var(--mirava-radius-md)" }}
            >

              <div className="relative aspect-[4/5]">
                <Image
                  src={universe.image}
                  alt={universe.name[locale]}
                  fill
                  sizes="(max-width: 640px) 42vw, 18vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="mirava-media-overlay absolute inset-0" />
                <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between">
                  <div>
                    <span className="tabular-nums font-jakarta text-[9px] font-bold text-mirava-accent">
                      0{index + 1}
                    </span>
                    <p className="font-jakarta text-xs font-semibold leading-tight text-mirava-ink">
                      {universe.name[locale]}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-mirava-accent text-mirava-canvas">
                      <Sparkles className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Featured Active Display */}
      <div className="mirava-surface-raised mt-6 grid overflow-hidden p-6 sm:p-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-8 lg:p-10">
        <div className="relative flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="mirava-label">{copy.badge}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeUniverse.id}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <h3 className="mirava-section-title mt-4 text-3xl sm:text-5xl">
                  {activeUniverse.name[locale]}
                </h3>
                <p className="mirava-copy mt-3 max-w-xl text-base leading-relaxed">
                  {activeUniverse.description[locale]}
                </p>

                {/* Key Elements & Highlights */}
                <div className="mt-6">
                  <p className="font-jakarta text-xs font-semibold uppercase tracking-wider text-mirava-accent">
                    {copy.keyElementsTitle}
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {activeUniverse.keyElements[locale].map((elem, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-mirava-ink-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-mirava-accent" />
                        <span>{elem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-mirava-line pt-6">
            <Link
              href={`/visual-engine/studio?preset=${activeUniverse.id}`}
              className="mirava-button mirava-button-primary gap-2 px-6 text-sm"
            >
              {copy.launchCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Large Image Preview Frame */}
        <div className="relative mt-8 min-h-[22rem] lg:mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeUniverse.id}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mirava-image-frame relative h-full min-h-[22rem] w-full overflow-hidden"
              style={{
                outline: "1px solid rgba(255, 255, 255, 0.14)",
                outlineOffset: "-1px",
              }}
            >
              <Image
                src={activeUniverse.image}
                alt={activeUniverse.name[locale]}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
              <div className="mirava-media-overlay absolute inset-0" />
              <div className="absolute inset-x-6 bottom-6 text-mirava-ink">
                <p className="text-[9px] font-bold tracking-[.18em] text-mirava-accent">
                  {activeUniverse.eyebrow[locale]}
                </p>
                <p className="mt-1 font-jakarta text-xl font-semibold sm:text-2xl">
                  {activeUniverse.tagline[locale]}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
