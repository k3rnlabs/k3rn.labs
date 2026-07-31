"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ArrowRight, Instagram, Linkedin, Globe, CheckCircle2 } from "lucide-react"
import { InstagramMockup } from "./mockups/instagram-mockup"
import { LinkedInMockup } from "./mockups/linkedin-mockup"
import { CampaignMockup } from "./mockups/campaign-mockup"

type Props = {
  locale: "fr" | "es"
}

type Channel = "instagram" | "linkedin" | "campaign"

export function MiravaChannelShowcase({ locale }: Props) {
  const [activeTab, setActiveTab] = useState<Channel>("instagram")
  const prefersReducedMotion = useReducedMotion()
  const isFr = locale === "fr"

  const sectionRef = React.useRef<HTMLElement>(null)
  const hasTrackedView = React.useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || hasTrackedView.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true
          if (typeof window !== "undefined" && (window as any).posthog) {
            ;(window as any).posthog.capture("channel_showcase_viewed", { locale })
          }
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [locale])

  const handleTabChange = (tab: Channel) => {
    setActiveTab(tab)
    if (typeof window !== "undefined" && (window as any).posthog) {
      ;(window as any).posthog.capture("channel_selected", {
        channel: tab,
        locale,
      })
    }
  }

  const handleCtaClick = () => {
    if (typeof window !== "undefined" && (window as any).posthog) {
      ;(window as any).posthog.capture("channel_cta_clicked", {
        channel: activeTab,
        locale,
      })
    }
  }

  const content = {
    fr: {
      eyebrow: "DÉPLOIEMENT MULTI-CANAL",
      title: "Une identité.\nTous vos espaces.",
      subtitle:
        "Transformez une même direction éditoriale en contenus prêts pour vos réseaux, votre profil professionnel et vos campagnes.",
      tabs: {
        instagram: "Instagram",
        linkedin: "LinkedIn",
        campaign: "Campagnes & Web",
      },
      narratives: {
        instagram: {
          tag: "Réseaux & Formats Verticaux",
          heading: "Alimentez votre feed et vos réels sans retourner en studio.",
          bullet1: "Publication Feed au format natif 4:5",
          bullet2: "Couverture Reel & Story en vertical 9:16",
          bullet3: "Grain et colorimétrie 100% cohérents",
          cta: "Générer mon feed Instagram",
        },
        linkedin: {
          tag: "Présence Professionnelle",
          heading: "Construisez une présence cohérente, du portrait à la bannière.",
          bullet1: "Photo de profil recadrée dynamiquement",
          bullet2: "Bannière de marque construite en HTML/CSS",
          bullet3: "Supports de publications d'expertise",
          cta: "Créer ma bannière LinkedIn",
        },
        campaign: {
          tag: "Site Web & Publicité",
          heading: "Déployez votre direction visuelle sur vos annonces et votre site.",
          bullet1: "Hero de site web en 16:9 haute définition",
          bullet2: "Zone d'espace négatif réservée aux titres HTML",
          bullet3: "Déclinaisons publicitaires Display & Macro",
          cta: "Lancer une campagne",
        },
      },
    },
    es: {
      eyebrow: "DESPLIEGUE MULTICANAL",
      title: "Una identidad.\nTodos tus espacios.",
      subtitle:
        "Transforma una misma dirección editorial en contenidos listos para tus redes, tu perfil profesional y tus campañas.",
      tabs: {
        instagram: "Instagram",
        linkedin: "LinkedIn",
        campaign: "Campañas y Web",
      },
      narratives: {
        instagram: {
          tag: "Redes y Formatos Verticales",
          heading: "Alimenta tu feed y tus reels sin volver al estudio.",
          bullet1: "Publicación Feed en formato nativo 4:5",
          bullet2: "Portada Reel y Story en vertical 9:16",
          bullet3: "Grano y colorimetría 100% coherentes",
          cta: "Generar mi feed Instagram",
        },
        linkedin: {
          tag: "Presencia Profesional",
          heading: "Construye una presencia coherente, del retrato a la cabecera.",
          bullet1: "Foto de perfil recortada dinámicamente",
          bullet2: "Cabecera de marca construida en HTML/CSS",
          bullet3: "Imágenes para publicaciones de experiencia",
          cta: "Crear mi cabecera LinkedIn",
        },
        campaign: {
          tag: "Sitio Web y Publicidad",
          heading: "Despliega tu dirección visual en tus anuncios y tu web.",
          bullet1: "Hero para sitio web en 16:9 de alta definición",
          bullet2: "Zona de espacio negativo reservada para textos HTML",
          bullet3: "Variaciones publicitarias Display y Macro",
          cta: "Lanzar una campaña",
        },
      },
    }
  }

  const t = isFr ? content.fr : content.es
  const activeNarrative = t.narratives[activeTab]

  return (
    <section ref={sectionRef} className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      {/* Header Section */}
      <div className="max-w-3xl">
        <span className="mirava-label">{t.eyebrow}</span>
        <h2 className="mirava-section-title mt-4 whitespace-pre-line text-3xl sm:text-5xl">
          {t.title}
        </h2>
        <p className="mirava-copy mt-4 text-base leading-7 sm:text-lg sm:leading-8">
          {t.subtitle}
        </p>
      </div>

      {/* Accessible Tabs Navigation */}
      <div
        role="tablist"
        aria-label={t.eyebrow}
        className="mt-8 flex max-w-md items-center gap-1.5 rounded-xl border border-mirava-line bg-mirava-surface p-1.5 sm:max-w-lg"
      >
        {(["instagram", "linkedin", "campaign"] as const).map((tabKey) => {
          const isActive = activeTab === tabKey
          const label = t.tabs[tabKey]
          const Icon =
            tabKey === "instagram" ? Instagram : tabKey === "linkedin" ? Linkedin : Globe

          return (
            <button
              key={tabKey}
              role="tab"
              id={`tab-${tabKey}`}
              aria-selected={isActive}
              aria-controls={`panel-${tabKey}`}
              onClick={() => handleTabChange(tabKey)}
              className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-jakarta text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mirava-accent ${
                isActive ? "text-mirava-canvas" : "text-mirava-ink-secondary hover:text-mirava-ink"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="channelTabHighlight"
                  className="absolute inset-0 rounded-lg bg-mirava-accent"
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 30 }
                  }
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {tabKey === "campaign" ? "Web" : label}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Main Grid: Mockup (60%) vs Narrative (40%) */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        {/* Active Channel Mockup Panel */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="relative min-h-[420px] w-full"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              {activeTab === "instagram" && <InstagramMockup locale={locale} />}
              {activeTab === "linkedin" && <LinkedInMockup locale={locale} />}
              {activeTab === "campaign" && <CampaignMockup locale={locale} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Narrative & Details Column */}
        <div className="mirava-surface relative flex flex-col justify-between rounded-2xl border border-mirava-line p-6 sm:p-8">
          <div>
            <span className="font-jakarta text-xs font-bold uppercase tracking-wider text-mirava-accent">
              {activeNarrative.tag}
            </span>
            <h3 className="mt-4 font-jakarta text-xl font-extrabold text-mirava-ink sm:text-2xl">
              {activeNarrative.heading}
            </h3>

            <ul className="mt-6 space-y-3">
              {[
                activeNarrative.bullet1,
                activeNarrative.bullet2,
                activeNarrative.bullet3,
              ].map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-mirava-ink-secondary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-mirava-line/60">
            <Link
              href="/visual-engine/studio"
              onClick={handleCtaClick}
              className="mirava-button mirava-button-primary inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-6 text-xs font-semibold font-jakarta shadow-md sm:w-auto"
            >
              {activeNarrative.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
