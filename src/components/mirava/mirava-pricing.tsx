"use client"

import { useState } from "react"
import Link from "next/link"
import posthog from "posthog-js"
import { ArrowRight, Check, Sparkles, ShieldCheck, RefreshCw, Zap, ChevronDown } from "lucide-react"

interface MiravaPricingProps {
  locale: "fr" | "es"
}

export function MiravaPricing({ locale }: MiravaPricingProps) {
  const [tab, setTab] = useState<"subscription" | "pack">("subscription")
  const [showAllMobile, setShowAllMobile] = useState(false)

  const copy = {
    fr: {
      eyebrow: "TARIFICATION CLAIRE · SANS FRAIS CACHÉS",
      title: "Des tarifs simples, ajustés à votre rythme d'édition.",
      subtitle: "Chaque séance consomme 1 crédit par image générée. Commencez gratuitement avec 3 créations offertes.",
      switchSub: "Abonnements mensuels",
      switchPack: "Packs de recharges",
      popularBadge: "RECOMMANDÉ",
      monthly: "/ mois",
      oneTime: "achat unique",
      creditsLabel: "crédits inclus",
      ctaSub: "Choisir cet abonnement",
      ctaPack: "Acheter ce pack",
      trialOffer: "3 créations offertes à l'activation · Sans CB",
      showMorePlans: "Voir toutes les options de recharges & abonnements",
      showLessPlans: "Masquer les options secondaires",
      features: {
        identity: "Profil privé : 3 vues essentielles + options",
        universes: "Accès illimité aux 7 Univers créatifs",
        alma: "Directrice créative Alma intégrée",
        social: "Images signature verticales 4:5 dans votre galerie privée",
        custom: "Création de studio depuis photo de référence",
        priority: "Génération prioritaire & support VIP",
      },
      guarantees: [
        { icon: ShieldCheck, title: "Sécurité Stripe", desc: "Paiement 100% chiffré et sécurisé" },
        { icon: RefreshCw, title: "Sans engagement", desc: "Modifiez ou résiliez à tout moment en 1 clic" },
        { icon: Zap, title: "Crédits immédiats", desc: "Disponibles à la seconde après validation" },
      ],
    },
    es: {
      eyebrow: "TARIFAS CLARAS · SIN COSTES OCULTOS",
      title: "Precios simples, adaptados a tu ritmo de edición.",
      subtitle: "Cada sesión consume 1 crédito por imagen generada. Empieza gratis con 3 creaciones incluidas.",
      switchSub: "Suscripciones mensuales",
      switchPack: "Packs de recarga",
      popularBadge: "RECOMENDADO",
      monthly: "/ mes",
      oneTime: "pago único",
      creditsLabel: "créditos incluidos",
      ctaSub: "Elegir esta suscripción",
      ctaPack: "Comprar este pack",
      trialOffer: "3 creaciones incluidas al activar · Sin tarjeta",
      showMorePlans: "Ver todas las opciones de recargas y suscripciones",
      showLessPlans: "Ocultar opciones secundarias",
      features: {
        identity: "Perfil privado: 3 vistas esenciales + opciones",
        universes: "Acceso ilimitado a los 7 Universos",
        alma: "Directora creativa Alma integrada",
        social: "Imágenes insignia verticales 4:5 en tu galería privada",
        custom: "Creación de estudio desde foto de referencia",
        priority: "Generación prioritaria y soporte VIP",
      },
      guarantees: [
        { icon: ShieldCheck, title: "Seguridad Stripe", desc: "Pago 100% encriptado y seguro" },
        { icon: RefreshCw, title: "Sin compromiso", desc: "Modifica o cancela cuando quieras en 1 clic" },
        { icon: Zap, title: "Créditos inmediatos", desc: "Disponibles al instante tras la confirmación" },
      ],
    },
  }[locale]

  const subscriptions = [
    {
      id: "mirava-20",
      name: "Esencia — 20",
      price: 49,
      credits: 20,
      popular: false,
      features: [copy.features.identity, copy.features.universes, copy.features.alma, copy.features.social],
    },
    {
      id: "mirava-60",
      name: "Aura — 60",
      price: 119,
      credits: 60,
      popular: true,
      features: [copy.features.identity, copy.features.universes, copy.features.alma, copy.features.social, copy.features.custom],
    },
    {
      id: "mirava-150",
      name: "Círculo — 150",
      price: 249,
      credits: 150,
      popular: false,
      features: [copy.features.identity, copy.features.universes, copy.features.alma, copy.features.social, copy.features.custom, copy.features.priority],
    },
  ]

  const packs = [
    {
      id: "mirava-10",
      name: "Recarga Esencia",
      price: 29,
      credits: 10,
      popular: false,
      features: [copy.features.identity, copy.features.universes, copy.features.social],
    },
    {
      id: "mirava-30",
      name: "Recarga Aura",
      price: 79,
      credits: 30,
      popular: true,
      features: [copy.features.identity, copy.features.universes, copy.features.alma, copy.features.social],
    },
    {
      id: "mirava-100",
      name: "Recarga Casa",
      price: 199,
      credits: 100,
      popular: false,
      features: [copy.features.identity, copy.features.universes, copy.features.alma, copy.features.social, copy.features.custom],
    },
  ]

  const items = tab === "subscription" ? subscriptions : packs

  const handleTabChange = (newTab: "subscription" | "pack") => {
    setTab(newTab)
    try {
      posthog.capture("pricing_plan_viewed", { plan_type: newTab })
    } catch (_) {}
  }

  const handleCtaClick = (planId: string, planName: string, price: number) => {
    try {
      posthog.capture("pricing_cta_clicked", { plan_id: planId, plan_name: planName, price })
      posthog.capture("checkout_started", { plan_id: planId, price })
    } catch (_) {}
  }

  return (
    <div className="relative mx-auto max-w-7xl">
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="mirava-label inline-flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[.18em]">
          <Sparkles className="h-3 w-3 text-mirava-accent" />
          {copy.eyebrow}
        </span>
        <h2 className="mirava-section-title mt-4 text-3xl sm:text-6xl">{copy.title}</h2>
        <p className="mirava-copy mt-4 text-sm leading-relaxed sm:text-lg">{copy.subtitle}</p>

        {/* Switch toggle */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-xl border border-mirava-line bg-mirava-canvas-raised p-1.5">
          <button
            type="button"
            onClick={() => handleTabChange("subscription")}
            className={`min-h-[44px] rounded-lg px-5 py-2.5 text-xs font-semibold font-jakarta transition-all duration-200 ${
              tab === "subscription"
                ? "bg-mirava-surface-raised text-mirava-ink shadow-sm"
                : "text-mirava-ink-muted hover:text-mirava-ink-secondary"
            }`}
          >
            {copy.switchSub}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("pack")}
            className={`min-h-[44px] rounded-lg px-5 py-2.5 text-xs font-semibold font-jakarta transition-all duration-200 ${
              tab === "pack"
                ? "bg-mirava-surface-raised text-mirava-ink shadow-sm"
                : "text-mirava-ink-muted hover:text-mirava-ink-secondary"
            }`}
          >
            {copy.switchPack}
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="mt-10 grid gap-6 md:grid-cols-3 items-stretch">
        {items.map((item, index) => {
          const isHiddenOnMobile = !showAllMobile && !item.popular && index !== 1
          return (
            <div
              key={item.id}
              className={`mirava-surface relative flex flex-col justify-between p-6 sm:p-8 transition-all duration-300 ${
                isHiddenOnMobile ? "hidden md:flex" : "flex"
              } ${
                item.popular
                  ? "border-mirava-accent/60 bg-mirava-surface-raised ring-1 ring-mirava-accent/30 shadow-xl"
                  : "border-mirava-line hover:border-mirava-ink-muted/30"
              }`}
              style={{ borderRadius: "var(--mirava-radius-lg, 16px)" }}
            >
              {item.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-mirava-accent bg-mirava-accent px-3.5 py-1 font-jakarta text-[9px] font-bold tracking-[.15em] text-mirava-canvas">
                  {copy.popularBadge}
                </div>
              )}

              <div>
                <h3 className="font-jakarta text-xl font-bold text-mirava-ink">{item.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-jakarta text-4xl font-extrabold text-mirava-ink sm:text-5xl">
                    {item.price}€
                  </span>
                  <span className="text-xs text-mirava-ink-muted">
                    {tab === "subscription" ? copy.monthly : copy.oneTime}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-mirava-accent font-jakarta">
                  {item.credits} {copy.creditsLabel}
                </p>

                <div className="mt-6 border-t border-mirava-line pt-6 space-y-3">
                  {item.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-mirava-ink-secondary">
                      <Check className="h-4 w-4 shrink-0 text-mirava-accent mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href={`/visual-engine/studio?view=account&offer=${item.id}`}
                  onClick={() => handleCtaClick(item.id, item.name, item.price)}
                  className={`mirava-button w-full min-h-[44px] justify-center gap-2 px-5 py-3 text-xs font-semibold font-jakarta ${
                    item.popular
                      ? "mirava-button-primary"
                      : "mirava-button-secondary"
                  }`}
                >
                  {tab === "subscription" ? copy.ctaSub : copy.ctaPack}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-2 text-center text-[10px] text-mirava-ink-muted font-medium">
                  {copy.trialOffer}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile Toggle to Show All Pricing Options */}
      <div className="mt-4 text-center md:hidden">
        <button
          type="button"
          onClick={() => setShowAllMobile(!showAllMobile)}
          className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-mirava-accent hover:underline font-jakarta px-4 py-2"
        >
          <span>{showAllMobile ? copy.showLessPlans : copy.showMorePlans}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showAllMobile ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Trust Guarantees */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {copy.guarantees.map((g, idx) => {
          const Icon = g.icon
          return (
            <div key={idx} className="mirava-notice flex items-center gap-4 p-4 rounded-xl border border-mirava-line/60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mirava-canvas-raised text-mirava-accent border border-mirava-line">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-jakarta text-xs font-bold text-mirava-ink">{g.title}</p>
                <p className="text-[11px] text-mirava-ink-muted mt-0.5 leading-snug">{g.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
