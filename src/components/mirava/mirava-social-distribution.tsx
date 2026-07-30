"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Share2, Smartphone, Linkedin, Instagram, Twitter, Download, Check, Sparkles, ArrowRight } from "lucide-react"

interface MiravaSocialDistributionProps {
  locale: "fr" | "es"
}

const SOCIAL_RATIOS = [
  {
    id: "portrait-45",
    name: "4:5 Portrait",
    platform: "LinkedIn & Instagram Feed",
    aspectRatioClass: "aspect-[4/5]",
    description: {
      fr: "Format idéal pour captiver l'attention dans le fil d'actualité LinkedIn et Instagram.",
      es: "Formato ideal para captar la atención en el feed de LinkedIn e Instagram.",
    },
    image: "/visual-engine/univers/escapade-solaire.webp",
    badge: "FEED ENGAGEMENT",
  },
  {
    id: "vertical-916",
    name: "9:16 Vertical",
    platform: "Instagram Stories, TikTok & Reels",
    aspectRatioClass: "aspect-[9/16]",
    description: {
      fr: "Immersion mobile plein écran pour vos stories, reels et contenus verticaux.",
      es: "Inmersión móvil a pantalla completa para tus historias, reels y contenidos verticales.",
    },
    image: "/visual-engine/univers/editorial-mode.webp",
    badge: "MOBILE FULLSCREEN",
  },
  {
    id: "square-11",
    name: "1:1 Carré",
    platform: "Carrousel & Galerie",
    aspectRatioClass: "aspect-square",
    description: {
      fr: "Équilibre classique universel pour vos carrousels et publications carrées.",
      es: "Equilibrio clásico universal para tus carruseles y publicaciones cuadradas.",
    },
    image: "/visual-engine/univers/beauty-close-up.webp",
    badge: "UNIVERSAL SQUARE",
  },
  {
    id: "banner-169",
    name: "16:9 Bannière",
    platform: "Header LinkedIn, X & Web",
    aspectRatioClass: "aspect-[16/9]",
    description: {
      fr: "Format panoramique éditorial pour vos en-têtes de profil et bannières de marque.",
      es: "Formato panorámico editorial para tus encabezados de perfil y banners de marca.",
    },
    image: "/visual-engine/univers/destination-iconique.webp",
    badge: "BANNER PANORAMIC",
  },
]

export function MiravaSocialDistribution({ locale }: MiravaSocialDistributionProps) {
  const [selectedRatioId, setSelectedRatioId] = useState<string>(SOCIAL_RATIOS[0].id)
  const activeRatio = SOCIAL_RATIOS.find((r) => r.id === selectedRatioId) || SOCIAL_RATIOS[0]
  const [copied, setCopied] = useState(false)

  const copy = {
    fr: {
      eyebrow: "DÉCLINAISON MULTI-RÉSEAUX · KIT COMPLET",
      title: "Prêt pour Instagram, LinkedIn & vos campagnes.",
      intro:
        "Chaque séance générée par MIRAVA Studio se décline instantanément dans tous les ratios officiels. Exportez des visuels optimisés pour chaque réseau sans recadrage manuel.",
      selectFormat: "Format & Ratio de publication :",
      exportKit: "Prêt à publier sur :",
      exportCta: "Générer mon kit multi-formats",
      previewBadge: "PRÉVISUALISATION DU FORMAT",
    },
    es: {
      eyebrow: "DESPLIEGUE MULTI-REDES · KIT COMPLETO",
      title: "Listo para Instagram, LinkedIn y tus campañas.",
      intro:
        "Cada sesión generada por MIRAVA Studio se adapta al instante a todos los ratios oficiales. Exporta imágenes optimizadas para cada red sin recorte manual.",
      selectFormat: "Formato y Ratio de publicación:",
      exportKit: "Listo para publicar en:",
      exportCta: "Generar mi kit multiformato",
      previewBadge: "PREVISUALIZACIÓN DEL FORMATO",
    },
  }[locale]

  const handleCopyLink = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mirava-surface-raised grid overflow-hidden rounded-[var(--mirava-radius-lg)] border border-mirava-line lg:grid-cols-[1.1fr_.9fr]">
      {/* Left Column: Ratio Selector & Explanation */}
      <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
        <div>
          <p className="mirava-label inline-flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-mirava-accent" />
            {copy.eyebrow}
          </p>
          <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{copy.title}</h2>
          <p className="mirava-copy mt-4 text-sm leading-relaxed sm:text-base">{copy.intro}</p>

          {/* Ratios selection tabs */}
          <div className="mt-8">
            <p className="font-jakarta text-xs font-semibold uppercase tracking-wider text-mirava-accent">
              {copy.selectFormat}
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {SOCIAL_RATIOS.map((ratio) => {
                const isSelected = ratio.id === selectedRatioId
                return (
                  <button
                    key={ratio.id}
                    onClick={() => setSelectedRatioId(ratio.id)}
                    className={`mirava-choice-card flex flex-col justify-between p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-mirava-ink bg-mirava-surface-raised shadow-md"
                        : "bg-mirava-surface/60 hover:bg-mirava-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-jakarta text-xs font-bold text-mirava-ink">
                        {ratio.name}
                      </span>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-mirava-accent shadow-[0_0_8px_var(--mirava-accent)]" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-mirava-ink-muted">{ratio.platform}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-8 border-t border-mirava-line pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-mirava-ink-secondary">{copy.exportKit}</span>
              <div className="flex gap-2 text-mirava-ink-secondary">
                <Linkedin className="h-4 w-4 hover:text-mirava-ink transition-colors" />
                <Instagram className="h-4 w-4 hover:text-mirava-ink transition-colors" />
                <Twitter className="h-4 w-4 hover:text-mirava-ink transition-colors" />
              </div>
            </div>

            <Link
              href="/visual-engine/studio"
              className="mirava-button mirava-button-primary min-h-12 gap-2 px-6 text-sm"
            >
              {copy.exportCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: Live Ratio Visualizer Frame */}
      <div className="relative border-t border-mirava-line bg-mirava-canvas-raised p-6 flex flex-col items-center justify-center sm:p-8 lg:border-l lg:border-t-0">
        <div className="mb-4 flex w-full items-center justify-between border-b border-mirava-line pb-3">
          <span className="font-jakarta text-[10px] font-bold uppercase tracking-widest text-mirava-accent">
            {copy.previewBadge}
          </span>
          <span className="tabular-nums font-mono text-xs text-mirava-ink-secondary">
            {activeRatio.name}
          </span>
        </div>

        {/* Dynamic Aspect Ratio Container */}
        <div className="relative flex h-full max-h-[26rem] w-full items-center justify-center p-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRatio.id}
              initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`mirava-image-frame relative w-full max-w-sm overflow-hidden rounded-lg shadow-2xl ${activeRatio.aspectRatioClass}`}
              style={{
                outline: "1px solid rgba(255, 255, 255, 0.16)",
                outlineOffset: "-1px",
              }}
            >
              <Image
                src={activeRatio.image}
                alt={activeRatio.name}
                fill
                sizes="(max-width: 1024px) 100vw, 35vw"
                className="object-cover"
              />
              <div className="mirava-media-overlay absolute inset-0" />

              {/* Overlay Badge */}
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 font-jakarta text-[9px] font-bold tracking-wider text-mirava-accent backdrop-blur-md border border-white/10">
                  <Sparkles className="h-3 w-3" />
                  {activeRatio.badge}
                </span>
              </div>

              {/* Bottom Details */}
              <div className="absolute inset-x-4 bottom-4 text-mirava-ink">
                <p className="font-jakarta text-xs font-bold">{activeRatio.platform}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-mirava-ink-secondary">
                  {activeRatio.description[locale]}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
