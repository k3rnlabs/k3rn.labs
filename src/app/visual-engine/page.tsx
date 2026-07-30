"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Camera, Check, LockKeyhole, ShieldCheck, Sparkles, Sliders, Layers, UserCheck, CheckCircle2 } from "lucide-react"
import { MiravaInstallButton } from "@/components/mirava/mirava-pwa"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"
import { MiravaUniverseShowcase } from "@/components/mirava/mirava-universe-showcase"
import { MiravaAgentSimulator } from "@/components/mirava/mirava-agent-simulator"
import { MiravaSocialDistribution } from "@/components/mirava/mirava-social-distribution"
import { MiravaFaq } from "@/components/mirava/mirava-faq"
import { MiravaPricing } from "@/components/mirava/mirava-pricing"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"

const identityGuide = [
  "/visual-engine/identity-guide/01-face.webp",
  "/visual-engine/identity-guide/02-left.webp",
  "/visual-engine/identity-guide/03-right.webp",
  "/visual-engine/identity-guide/04-hair.webp",
  "/visual-engine/identity-guide/05-body-front.webp",
  "/visual-engine/identity-guide/06-body-angle.webp",
]

const copy = {
  fr: {
    open: "Créer",
    eyebrow: "ÉNERGIE ÉDITORIALE · IDENTITÉ PRÉSERVÉE",
    title: "Votre studio photo éditorial. Votre identité préservée.",
    intro: "Accédez à une direction artistique complète — photographe, styliste, décors d'exception et retouche Haute Couture — pour créer des campagnes où vous restez l'héroïne centrale.",
    cta: "Créer ma séance gratuitement",
    secondaryCta: "Explorer les 7 univers",
    offer: "3 créations offertes à l'activation · Sans carte de crédit",
    heroSourceLabel: "PORTRAIT SOURCE",
    heroResultLabel: "SÉANCE ÉDITORIALE · LUZ DE ORO",
    
    // Proof metrics
    metrics: [
      { number: "3", label: "Créations offertes à l'activation" },
      { number: "7", label: "Univers photographiques signés" },
      { number: "100%", label: "Traitement local & privé du visage" },
      { number: "4:5 / 9:16", label: "Ratios d'export réseaux prêts" },
    ],

    // Method steps
    methodBadge: "PROCESSUS DE CRÉATION",
    methodTitle: "Une séance éditoriale en trois gestes simples.",
    steps: [
      ["01", "Inspirez", "Choisissez parmi 7 univers photographiques signés ou importez une photo de référence personnelle."],
      ["02", "Affinez", "Formulez vos intentions artistiques avec votre Directrice créative Alma ou sélectionnez vos cadrages."],
      ["03", "Incarnez", "MIRAVA compose l'image finale autour de votre Profil identité privé, préservant votre regard et votre carnation."],
    ],

    // Custom studio from reference
    customBadge: "STUDIO SUR-MESURE",
    customTitle: "Votre photo d'inspiration devient votre studio permanent.",
    customText: "Importez l'image d'un magazine, d'une campagne de mode ou d'un lieu qui vous inspire. L'IA analyse la lumière, le grain et le cadrage pour construire un studio réutilisable pour vos propres séances.",
    customCta: "Créer depuis ma référence",

    // Identity profile
    identityBadge: "TECHNOLOGIE PROPRIÉTAIRE",
    identityTitle: "Votre identité unique au cœur de chaque image.",
    identityText: "Créez votre Profil identité avec 3 à 6 portraits guidés (face, 3/4 gauche, 3/4 droit, cheveux, silhouette). MIRAVA préserve fidèlement vos traits, votre texture de peau et votre présence sur chaque décor.",
    camera: "Prévisualisation vidéo 100% locale",
    cameraText: "L'analyse vidéo s'effectue directement dans votre navigateur. Aucune image brute n'est transmise avant votre validation explicite.",

    // Confidentiality & Rights
    privacyBadge: "VOTRE VIE PRIVÉE",
    privacyTitle: "Confidentialité absolue & respect strict des droits.",
    private: "Vos images de référence sont supprimées immédiatement après analyse. Votre Profil identité reste strictement privé et supprimable en un clic.",
    adult: "MIRAVA est exclusivement réservé aux personnes majeures détenant les droits et consentements sur les visages importés.",

    // Final CTA
    finalEyebrow: "ACCÈS STUDIO MIRAVA",
    finalTitle: "Prête à lancer votre première séance éditoriale ?",
    foot: "MIRAVA Studio · Votre studio éditorial personnel, conçu pour rester privé.",
  },
  es: {
    open: "Crear",
    eyebrow: "ENERGÍA EDITORIAL · IDENTIDAD PRESERVADA",
    title: "Tu estudio fotográfico editorial. Tu identidad preservada.",
    intro: "Accede a una dirección artística completa — fotografía, estilismo, escenarios excepcionales y retoque de Alta Costura — para crear campañas donde sigues siendo la protagonista.",
    cta: "Crear mi sesión gratis",
    secondaryCta: "Explorar los 7 universos",
    offer: "3 creaciones incluidas al activar · Sin tarjeta de crédito",
    heroSourceLabel: "RETRATO FUENTE",
    heroResultLabel: "SESIÓN EDITORIAL · LUZ DE ORO",

    // Proof metrics
    metrics: [
      { number: "3", label: "Creaciones incluidas al activar" },
      { number: "7", label: "Universos fotográficos de autor" },
      { number: "100%", label: "Procesamiento local y privado" },
      { number: "4:5 / 9:16", label: "Formatos listos para redes" },
    ],

    // Method steps
    methodBadge: "PROCESO DE CREACIÓN",
    methodTitle: "Una sesión editorial en tres sencillos pasos.",
    steps: [
      ["01", "Inspira", "Elige entre 7 universos fotográficos o sube una foto de referencia personal."],
      ["02", "Afina", "Formula tus intenciones artísticas con tu Directora creativa Alma o selecciona tus encuadres."],
      ["03", "Encarna", "MIRAVA compone la imagen final alrededor de tu Perfil de identidad privado, conservando tu mirada."],
    ],

    // Custom studio from reference
    customBadge: "ESTUDIO A MEDIDA",
    customTitle: "Tu foto de inspiración se convierte en tu estudio permanente.",
    customText: "Sube la imagen de una revista, campaña o lugar que te inspire. La IA analiza la luz, el grano y el encuadre para construir un estudio reutilizable para tus propias sesiones.",
    customCta: "Crear desde mi referencia",

    // Identity profile
    identityBadge: "TECNOLOGÍA PROPIETARIA",
    identityTitle: "Tu identidad única en el centro de cada imagen.",
    identityText: "Crea tu Perfil de identidad con 3 a 6 retratos guiados (frente, 3/4 izquierdo, 3/4 derecho, cabello, silueta). MIRAVA preserva fielmente tus rasgos y textura de piel.",
    camera: "Vista previa de vídeo 100% local",
    cameraText: "El análisis de vídeo se ejecuta directamente en tu navegador. Ninguna imagen bruta se transmite sin tu validación explícita.",

    // Confidentiality & Rights
    privacyBadge: "TU PRIVACIDAD",
    privacyTitle: "Confidencialidad absoluta y respeto de derechos.",
    private: "Tus imágenes de referencia se eliminan tras el análisis. Tu Perfil de identidad permanece privado y eliminable en 1 clic.",
    adult: "MIRAVA está reservado a personas mayores de edad con los derechos y consentimientos sobre cada imagen.",

    // Final CTA
    finalEyebrow: "ACCESO ESTUDIO MIRAVA",
    finalTitle: "¿Lista para lanzar tu primera sesión editorial?",
    foot: "MIRAVA Studio · Tu estudio editorial personal, diseñado para permanecer privado.",
  },
} as const

export default function MiravaLandingPage() {
  const { locale, setLocale } = useMiravaLocale()
  const reduceMotion = useReducedMotion()
  const t = copy[locale]

  return (
    <main className="mirava-theme min-h-dvh overflow-hidden bg-mirava-canvas text-mirava-ink">
      <MiravaGrain />
      <div className="mirava-ambient pointer-events-none fixed inset-0" />

      {/* 1. Header & Navigation */}
      <header className="relative z-20 border-b border-mirava-line/50 bg-mirava-canvas/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/visual-engine" aria-label="Accueil MIRAVA Studio">
            <MiravaWordmark />
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={locale === "fr" ? "Passer en espagnol" : "Cambiar al francés"}
              onClick={() => setLocale(locale === "fr" ? "es" : "fr")}
              className="mirava-button mirava-button-secondary min-h-11 min-w-12 px-3 text-xs font-semibold font-jakarta"
            >
              {locale.toUpperCase()}
            </button>
            <Link
              href="/visual-engine/studio"
              className="mirava-button mirava-button-primary min-h-11 gap-2 px-5 text-xs font-semibold font-jakarta"
            >
              {t.open}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* 2. Hero with Authentic Input/Output Demo */}
      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div className="relative z-10">
          <p className="mirava-meta inline-flex items-center gap-2 px-3.5 py-2 font-jakarta text-[10px] font-semibold tracking-[.18em]">
            <Camera className="h-3.5 w-3.5 text-mirava-accent" />
            {t.eyebrow}
          </p>
          <h1 className="mirava-title mt-6 max-w-2xl text-[2.85rem] leading-[1.08] sm:text-6xl lg:text-[4.75rem]">
            {t.title}
          </h1>
          <p className="mirava-copy mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
            {t.intro}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/visual-engine/studio"
              className="mirava-button mirava-button-primary min-h-13 gap-2 px-7 text-sm font-semibold font-jakarta shadow-lg"
            >
              {t.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <MiravaInstallButton locale={locale} />
          </div>
          <p className="mirava-muted mt-4 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-mirava-accent" />
            {t.offer}
          </p>
        </div>

        {/* Hero Interactive Split Frame: Source vs Output */}
        <motion.div
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-2xl"
        >
          <div className="absolute -inset-10 bg-mirava-ink/5 blur-3xl pointer-events-none" />
          <div className="mirava-surface-raised relative grid grid-cols-[.42fr_.58fr] gap-3 p-3 rounded-2xl border border-mirava-line">
            {/* Input Face */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-mirava-surface border border-mirava-line p-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src="/visual-engine/identity-guide/01-face.webp"
                  alt={t.heroSourceLabel}
                  fill
                  priority
                  sizes="(max-width: 1024px) 35vw, 20vw"
                  className="object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="mt-2.5 px-1 pb-1">
                <span className="font-jakarta text-[9px] font-bold tracking-[.15em] text-mirava-accent block">
                  {t.heroSourceLabel}
                </span>
                <p className="text-[11px] text-mirava-ink-secondary mt-0.5 leading-snug">
                  Profil d'identité validé
                </p>
              </div>
            </div>

            {/* Output Editorial Shoot */}
            <div className="mirava-image-frame relative aspect-[4/5] overflow-hidden rounded-xl">
              <Image
                src="/visual-engine/univers/escapade-solaire.webp"
                alt={t.heroResultLabel}
                fill
                priority
                sizes="(max-width: 1024px) 55vw, 32vw"
                className="object-cover"
              />
              <div className="mirava-media-overlay absolute inset-0" />
              <div className="absolute inset-x-4 bottom-4 text-mirava-ink">
                <span className="text-[8px] font-bold tracking-[.18em] text-mirava-ink/75 block">
                  ESCAPADE SOLAIRE
                </span>
                <p className="mt-1 font-jakarta text-lg font-bold tracking-[-.02em] sm:text-2xl">
                  Luz de Oro
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. Real Product Proof Metrics Bar */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 md:grid-cols-4">
          {t.metrics.map((m, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="font-jakarta text-3xl font-extrabold text-mirava-ink sm:text-4xl">
                {m.number}
              </span>
              <span className="mt-1 text-xs text-mirava-ink-muted leading-snug">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 3-Step Creation Method */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <span className="mirava-label">{t.methodBadge}</span>
          <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.methodTitle}</h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.steps.map(([number, title, body]) => (
            <article
              key={number}
              className="mirava-surface relative flex flex-col justify-between p-6 sm:p-8"
              style={{ borderRadius: "var(--mirava-radius-lg, 16px)" }}
            >
              <div>
                <span className="font-jakarta text-sm font-bold text-mirava-accent">
                  {number}
                </span>
                <h3 className="mt-6 font-jakarta text-xl font-bold text-mirava-ink">{title}</h3>
                <p className="mirava-copy mt-3 text-sm leading-6">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Authentic Product Showcase — Alma Creative Director */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-16 sm:px-8 sm:py-24">
        <MiravaAgentSimulator locale={locale} />
      </section>

      {/* 6. Identity Profile & Camera Privacy */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <span className="mirava-label">{t.identityBadge}</span>
            <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.identityTitle}</h2>
            <p className="mirava-copy mt-5 text-base leading-7">{t.identityText}</p>
            <div className="mirava-notice mt-8 p-5 rounded-xl border border-mirava-line">
              <p className="flex items-center gap-2 font-jakarta text-sm font-bold text-mirava-ink">
                <Camera className="h-4 w-4 text-mirava-accent" />
                {t.camera}
              </p>
              <p className="mt-2 text-xs leading-6 text-mirava-ink-secondary">{t.cameraText}</p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {identityGuide.map((src, index) => (
              <div
                key={src}
                className={`mirava-image-frame relative overflow-hidden bg-mirava-surface ${
                  index < 4 ? "col-span-3 aspect-[3/4] sm:col-span-2" : "col-span-3 aspect-[3/4]"
                }`}
                style={{ borderRadius: "var(--mirava-radius-md, 12px)" }}
              >
                <Image
                  src={src}
                  alt={`Angle ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 45vw, 20vw"
                  className="object-cover"
                />
                <span className="mirava-control absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-mirava-accent text-mirava-canvas border border-mirava-canvas">
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Creative Universes Showcase (Unique Images) */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-16 sm:px-8 sm:py-24">
        <MiravaUniverseShowcase locale={locale} />
      </section>

      {/* 8. Studio from Reference Image */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mirava-surface-raised grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center rounded-2xl border border-mirava-line">
          <div>
            <span className="mirava-label">{t.customBadge}</span>
            <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.customTitle}</h2>
            <p className="mirava-copy mt-4 text-base leading-7">{t.customText}</p>
            <div className="mt-8">
              <Link
                href="/visual-engine/studio"
                className="mirava-button mirava-button-primary inline-flex min-h-12 items-center gap-2 px-6 text-xs font-semibold font-jakarta"
              >
                {t.customCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-mirava-line">
            <Image
              src="/visual-engine/univers/destination-iconique.webp"
              alt="Studio sur-mesure"
              fill
              sizes="(max-width: 1024px) 90vw, 40vw"
              className="object-cover"
            />
            <div className="mirava-media-overlay absolute inset-0" />
            <div className="absolute inset-x-4 bottom-4 text-mirava-ink">
              <span className="text-[9px] font-bold tracking-[.15em] text-mirava-accent">
                STUDIO D'INSPIRATION ANALYSÉ
              </span>
              <p className="mt-0.5 text-xs text-mirava-ink-muted">
                Atmosphère, lumière et texture reproduites à l'identique
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Social Media Multi-Format Export */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-16 sm:px-8 sm:py-24">
        <MiravaSocialDistribution locale={locale} />
      </section>

      {/* 10. Confidentiality & Rights */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-3xl">
          <span className="mirava-label">{t.privacyBadge}</span>
          <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.privacyTitle}</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="mirava-notice flex items-start gap-4 p-6 rounded-xl border border-mirava-line">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-mirava-accent" />
            <div>
              <h3 className="font-jakarta text-sm font-bold text-mirava-ink">Données d'identité protégées</h3>
              <p className="mt-2 text-xs leading-6 text-mirava-ink-secondary">{t.private}</p>
            </div>
          </div>
          <div className="mirava-notice flex items-start gap-4 p-6 rounded-xl border border-mirava-line">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-mirava-accent" />
            <div>
              <h3 className="font-jakarta text-sm font-bold text-mirava-ink">Consentement & Majorité</h3>
              <p className="mt-2 text-xs leading-6 text-mirava-ink-secondary">{t.adult}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Transparent Pricing Grid */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-16 sm:px-8 sm:py-24">
        <MiravaPricing locale={locale} />
      </section>

      {/* 12. FAQ & Objections */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <MiravaFaq locale={locale} />
      </section>

      {/* 13. Final CTA Banner */}
      <section className="relative px-5 pb-16 sm:px-8 sm:pb-24">
        <div
          className="mirava-surface-raised mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 p-8 sm:flex-row sm:items-center sm:p-12 rounded-2xl border border-mirava-line shadow-2xl"
        >
          <div>
            <span className="mirava-label">{t.finalEyebrow}</span>
            <h2 className="mirava-section-title mt-2 text-3xl sm:text-4xl">{t.finalTitle}</h2>
            <p className="mt-2 text-xs text-mirava-ink-muted">{t.offer}</p>
          </div>
          <Link
            href="/visual-engine/studio"
            className="mirava-button mirava-button-primary shrink-0 gap-2 px-7 py-3.5 text-sm font-semibold font-jakarta shadow-lg"
          >
            {t.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 14. Full Editorial Footer */}
      <footer className="relative border-t border-mirava-line bg-mirava-canvas-raised px-5 py-10 text-center text-xs leading-6 text-mirava-ink-muted">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <MiravaWordmark />
          <p className="text-[11px]">{t.foot}</p>
          <div className="flex gap-4 text-[11px]">
            <Link href="/visual-engine/studio/login" className="hover:text-mirava-ink transition-colors">
              Connexion Studio
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
