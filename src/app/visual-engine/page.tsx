"use client"

import Image from "next/image"
import Link from "next/link"
import posthog from "posthog-js"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Camera, Check, LockKeyhole, ShieldCheck, Sparkles, Sliders, Layers, UserCheck, CheckCircle2, Sparkle } from "lucide-react"
import { MiravaInstallButton } from "@/components/mirava/mirava-pwa"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"
import { MiravaUniverseShowcase } from "@/components/mirava/mirava-universe-showcase"
import { MiravaAgentSimulator } from "@/components/mirava/mirava-agent-simulator"
import { MiravaChannelShowcase } from "@/components/mirava/mirava-channel-showcase"
import { MiravaFaq } from "@/components/mirava/mirava-faq"
import { MiravaPricing } from "@/components/mirava/mirava-pricing"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"

const identityGuide = [
  { src: "/visual-engine/identity-guide/01-face.webp", label: { fr: "Face neutre", es: "Rostro de frente" } },
  { src: "/visual-engine/identity-guide/02-left.webp", label: { fr: "3/4 Gauche", es: "Tres cuartos izquierdo" } },
  { src: "/visual-engine/identity-guide/03-right.webp", label: { fr: "3/4 Droit", es: "Tres cuartos derecho" } },
  { src: "/visual-engine/identity-guide/04-hair.webp", label: { fr: "Cheveux & Port", es: "Cabello y porte" } },
  { src: "/visual-engine/identity-guide/05-body-front.webp", label: { fr: "Silhouette face", es: "Silueta de frente" } },
  { src: "/visual-engine/identity-guide/06-body-angle.webp", label: { fr: "Silhouette angle", es: "Silueta de perfil" } },
]

const copy = {
  fr: {
    open: "Créer",
    eyebrow: "ÉNERGIE ÉDITORIALE · IDENTITÉ PRÉSERVÉE",
    title: "Votre studio photo éditorial. Votre identité préservée.",
    intro: "Commencez par 3 portraits guidés essentiels, puis ajoutez si vous le souhaitez vos cheveux et votre silhouette. MIRAVA compose vos séances photo tout en préservant fidèlement votre regard, votre carnation et la texture naturelle de votre peau.",
    cta: "Créer ma première séance",
    secondaryCta: "Explorer les 7 univers",
    offer: "3 créations offertes à l'activation · Sans carte de crédit · Profil 100% privé",
    heroSourceLabel: "PORTRAIT SOURCE (VOUS)",
    heroSourceDescription: "Profil d'identité validé",
    heroResultLabel: "RENDU ÉDITORIAL · LUZ DE ORO",
    heroUniverse: "ESCAPADE SOLAIRE",
    
    // Proof metrics
    metrics: [
      { number: "3", label: "Créations offertes à l'activation" },
      { number: "7", label: "Univers éditoriaux de référence" },
      { number: "Local", label: "Guide caméra et contrôle avant envoi" },
      { number: "4:5", label: "Format vertical signature" },
    ],

    // Method steps
    methodBadge: "MÉCANISME ET PROCESSUS",
    methodTitle: "Une séance éditoriale complète en trois gestes simples.",
    steps: [
      ["01", "Préparez votre Profil identité", "Capturez ou choisissez 3 portraits guidés essentiels : face, 3/4 gauche et 3/4 droit. Vous pouvez ensuite ajouter vos cheveux et jusqu’à deux vues silhouette. Le guide caméra et ses contrôles restent sur votre appareil ; seules les photos que vous validez sont envoyées dans votre espace privé."],
      ["02", "Sélectionnez votre univers", "Choisissez parmi 7 univers signés (Escapade Solaire, Éditorial Mode...) ou importez une photo d'inspiration pour créer votre propre studio."],
      ["03", "Obtenez vos images", "Choisissez une image signature ou une série cohérente. Chaque résultat est livré en vertical 4:5, dans votre galerie privée, avec une direction conçue autour de votre identité."],
    ],

    // Custom studio from reference
    customBadge: "STUDIO SUR-MESURE",
    customTitle: "Votre photo d'inspiration devient votre studio permanent.",
    customText: "Importez l'image d'un magazine, d'une campagne de mode ou d'un lieu qui vous inspire. MIRAVA crée un studio réutilisable pour vos propres séances, sans jamais afficher sa direction interne.",
    customCta: "Créer mon studio depuis une référence",

    // Identity profile
    identityBadge: "FIDÉLITÉ PRÉSERVÉE",
    identityTitle: "Vos traits et votre carnation préservés sur chaque décor.",
    identityText: "Créez votre Profil identité privé à partir de 3 portraits essentiels. Ajoutez vos cheveux ou votre silhouette si vous souhaitez renforcer la fidélité. MIRAVA préserve votre regard, votre carnation et la texture naturelle de votre peau, sans filtre générique.",
    camera: "Prévisualisation vidéo 100% locale",
    cameraText: "L'analyse vidéo s'effectue directement dans votre navigateur. Aucune image brute n'est transmise avant votre validation explicite.",

    // Confidentiality & Rights
    privacyBadge: "VOTRE VIE PRIVÉE",
    privacyTitle: "Vos photos sources restent strictement privées et effaçables en 1 clic.",
    identityDataTitle: "Données d'identité protégées",
    consentTitle: "Consentement & Majorité",
    studioLogin: "Connexion Studio",
    private: "Votre image de référence est supprimée après son analyse. Votre Profil identité reste dans un stockage privé et peut être supprimé à tout moment.",
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
    intro: "Empieza con 3 retratos guiados esenciales y, si lo deseas, añade tu cabello y tu silueta. MIRAVA compone tus sesiones conservando fielmente tu mirada, tono y textura natural de piel.",
    cta: "Crear mi primera sesión",
    secondaryCta: "Explorar los 7 universos",
    offer: "3 creaciones incluidas al activar · Sin tarjeta de crédito · Perfil 100% privado",
    heroSourceLabel: "RETRATO FUENTE (TÚ)",
    heroSourceDescription: "Perfil de identidad validado",
    heroResultLabel: "RESULTADO EDITORIAL · LUZ DE ORO",
    heroUniverse: "ESCAPADA SOLAR",

    // Proof metrics
    metrics: [
      { number: "3", label: "Creaciones incluidas al activar" },
      { number: "7", label: "Universos editoriales de autor" },
      { number: "Local", label: "Guía de cámara y control antes del envío" },
      { number: "4:5", label: "Formato vertical distintivo" },
    ],

    // Method steps
    methodBadge: "MECANISMO Y PROCESO",
    methodTitle: "Una sesión editorial completa en tres sencillos pasos.",
    steps: [
      ["01", "Prepara tu Perfil de identidad", "Captura o elige 3 retratos guiados esenciales: frente, tres cuartos izquierdo y derecho. Después puedes añadir tu cabello y hasta dos vistas de silueta. La guía de cámara y sus controles permanecen en tu dispositivo; solo las fotos que validas se envían a tu espacio privado."],
      ["02", "Selecciona tu universo", "Elige entre 7 universos de autor (Escapada Solar, Editorial Moda...) o sube una foto de inspiración para crear tu propio estudio."],
      ["03", "Obtén tus imágenes", "Elige una imagen insignia o una serie coherente. Cada resultado se entrega en vertical 4:5, en tu galería privada, con una dirección creada alrededor de tu identidad."],
    ],

    // Custom studio from reference
    customBadge: "ESTUDIO A MEDIDA",
    customTitle: "Tu foto de inspiración se convierte en tu estudio permanente.",
    customText: "Sube la imagen de una revista, campaña o lugar que te inspire. MIRAVA crea un estudio reutilizable para tus propias sesiones, sin mostrar nunca su dirección interna.",
    customCta: "Crear mi estudio desde una referencia",

    // Identity profile
    identityBadge: "FIDELIDAD PRESERVADA",
    identityTitle: "Tus rasgos y tono de piel preservados en cada escenario.",
    identityText: "Crea tu Perfil de Identidad privado a partir de 3 retratos esenciales. Añade tu cabello o silueta si deseas reforzar la fidelidad. MIRAVA preserva tu mirada, tono de piel y textura natural sin filtros genéricos.",
    camera: "Vista previa de vídeo 100% local",
    cameraText: "El análisis de vídeo se ejecuta directamente en tu navegador. Ninguna imagen bruta se transmite sin tu validación explícita.",

    // Confidentiality & Rights
    privacyBadge: "TU PRIVACIDAD",
    privacyTitle: "Tus fotos fuente permanecen privadas y borrables en 1 clic.",
    identityDataTitle: "Datos de identidad protegidos",
    consentTitle: "Consentimiento y mayoría de edad",
    studioLogin: "Acceso al Studio",
    private: "Tu imagen de referencia se elimina tras su análisis. Tu Perfil de identidad permanece en almacenamiento privado y puedes eliminarlo en cualquier momento.",
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

  const trackHeroCta = () => {
    try {
      posthog.capture("hero_cta_clicked", { location: "hero" })
    } catch (_) {}
  }

  return (
    <main className="mirava-theme min-h-dvh overflow-hidden bg-mirava-canvas text-mirava-ink">
      <MiravaGrain />
      <div className="mirava-ambient pointer-events-none fixed inset-0" />

      {/* 1. Header & Navigation */}
      <header className="relative z-20 border-b border-mirava-line/50 bg-mirava-canvas/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/visual-engine" aria-label={locale === "fr" ? "Accueil MIRAVA Studio" : "Inicio MIRAVA Studio"}>
            <MiravaWordmark />
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={locale === "fr" ? "Passer en espagnol" : "Cambiar al francés"}
              onClick={() => setLocale(locale === "fr" ? "es" : "fr")}
              className="mirava-button mirava-button-secondary min-h-[44px] min-w-12 px-3 text-xs font-semibold font-jakarta"
            >
              {locale.toUpperCase()}
            </button>
            <Link
              href="/visual-engine/studio"
              onClick={trackHeroCta}
              className="mirava-button mirava-button-primary min-h-[44px] gap-2 px-5 text-xs font-semibold font-jakarta"
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
          <h1 className="mirava-title mt-6 max-w-2xl text-[2.75rem] leading-[1.08] sm:text-6xl lg:text-[4.5rem]">
            {t.title}
          </h1>
          <p className="mirava-copy mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
            {t.intro}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/visual-engine/studio"
              onClick={trackHeroCta}
              className="mirava-button mirava-button-primary min-h-[48px] gap-2 px-7 text-sm font-semibold font-jakarta shadow-lg"
            >
              {t.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <MiravaInstallButton locale={locale} />
          </div>
          <p className="mirava-muted mt-4 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-mirava-accent shrink-0" />
            <span>{t.offer}</span>
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
                  {t.heroSourceDescription}
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
                  {t.heroUniverse}
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

      {/* 4. 3-Step Creation Method — Composition Style 1: Editorial Open */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <span className="mirava-label">{t.methodBadge}</span>
          <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.methodTitle}</h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {t.steps.map(([number, title, body]) => (
            <article
              key={number}
              className="relative flex flex-col justify-between border-t border-mirava-line pt-6 sm:pt-8"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-jakarta text-3xl font-extrabold tracking-tight text-mirava-accent/90">
                    {number}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-mirava-accent/40" />
                </div>
                <h3 className="mt-4 font-jakarta text-xl font-bold text-mirava-ink">{title}</h3>
                <p className="mirava-copy mt-3 text-sm leading-relaxed text-mirava-ink-secondary">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Personal studio from a private reference */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-16 sm:px-8 sm:py-24">
        <MiravaAgentSimulator locale={locale} />
      </section>

      {/* 6. Identity Profile & Camera Privacy — Composition Style 3: Preuve & Matrix */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <span className="mirava-label">{t.identityBadge}</span>
            <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.identityTitle}</h2>
            <p className="mirava-copy mt-5 text-base leading-7">{t.identityText}</p>
            <div className="mirava-notice mt-8 p-5 rounded-xl border border-mirava-line/80 bg-mirava-canvas-raised">
              <p className="flex items-center gap-2 font-jakarta text-sm font-bold text-mirava-ink">
                <Camera className="h-4 w-4 text-mirava-accent" />
                {t.camera}
              </p>
              <p className="mt-2 text-xs leading-6 text-mirava-ink-secondary">{t.cameraText}</p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {identityGuide.map((item, index) => (
              <div
                key={item.src}
                className={`mirava-image-frame group relative overflow-hidden bg-mirava-surface border border-mirava-line ${
                  index < 4 ? "col-span-3 aspect-[3/4] sm:col-span-2" : "col-span-3 aspect-[3/4]"
                }`}
                style={{ borderRadius: "var(--mirava-radius-md, 12px)" }}
              >
                <Image
                  src={item.src}
                  alt={item.label[locale]}
                  fill
                  sizes="(max-width: 640px) 45vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between">
                  <span className="font-jakarta text-[9px] font-semibold text-white/90">
                    {item.label[locale]}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mirava-accent text-mirava-canvas">
                    <Check className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Creative Universes Showcase (Unique Images) */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-5 py-16 sm:px-8 sm:py-24">
        <MiravaUniverseShowcase locale={locale} />
      </section>

      {/* 8. Multi-Channel Brand Deployment (V4 Editorial Showcase) */}
      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised">
        <MiravaChannelShowcase locale={locale} />
      </section>

      {/* 10. Confidentiality & Rights */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-3xl">
          <span className="mirava-label">{t.privacyBadge}</span>
          <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{t.privacyTitle}</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="mirava-notice flex items-start gap-4 p-6 rounded-xl border border-mirava-line bg-mirava-canvas-raised">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-mirava-accent" />
            <div>
              <h3 className="font-jakarta text-sm font-bold text-mirava-ink">{t.identityDataTitle}</h3>
              <p className="mt-2 text-xs leading-6 text-mirava-ink-secondary">{t.private}</p>
            </div>
          </div>
          <div className="mirava-notice flex items-start gap-4 p-6 rounded-xl border border-mirava-line bg-mirava-canvas-raised">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-mirava-accent" />
            <div>
              <h3 className="font-jakarta text-sm font-bold text-mirava-ink">{t.consentTitle}</h3>
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
            onClick={trackHeroCta}
            className="mirava-button mirava-button-primary shrink-0 gap-2 px-7 py-3.5 min-h-[48px] text-sm font-semibold font-jakarta shadow-lg"
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
            <Link href="/visual-engine/studio/login" className="hover:text-mirava-ink transition-colors min-h-[44px] inline-flex items-center">
              {t.studioLogin}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
