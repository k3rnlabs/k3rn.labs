"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Camera, Check, LockKeyhole, ShieldCheck } from "lucide-react"
import { MiravaInstallButton } from "@/components/mirava/mirava-pwa"
import { MiravaGrain } from "@/components/mirava/mirava-grain"
import { MiravaWordmark } from "@/components/mirava/mirava-wordmark"
import { useMiravaLocale } from "@/components/mirava/mirava-locale"
import { MiravaUniverseShowcase } from "@/components/mirava/mirava-universe-showcase"
import { MiravaAgentSimulator } from "@/components/mirava/mirava-agent-simulator"
import { MiravaSocialDistribution } from "@/components/mirava/mirava-social-distribution"
import { MiravaFaq } from "@/components/mirava/mirava-faq"
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
    title: "Votre studio photo personnel, partout où vous voulez être vue.",
    intro: "Accédez à une équipe créative complète — photographe, styliste, direction artistique et décors d’exception — pour créer des campagnes où vous restez l’héroïne centrale.",
    cta: "Créer ma séance",
    offer: "3 créations offertes à l’activation",
    proof: "Un visage. Sept univers.",
    proofText: "Votre visage, votre carnation et votre présence restent le fil rouge. La pose, le style, l’angle et la lumière changent réellement avec chaque direction.",
    universes: "Les univers créatifs MIRAVA",
    universesText: "Chaque famille représente une intention créative complète. Choisissez un décor ou importez votre propre inspiration.",
    custom: "Votre référence devient votre studio.",
    customText: "Importez l’image qui vous inspire. MIRAVA en analyse la direction artistique en privé, puis construit autour de votre identité un studio personnel que vous pourrez réutiliser.",
    customCta: "Créer depuis ma référence",
    identity: "Votre identité unique, au centre de la séance.",
    identityText: "Créez votre Profil identité pendant l’onboarding avec trois portraits guidés. Ajoutez ensuite cheveux et silhouette pour renforcer la fidélité.",
    camera: "Capture guidée",
    cameraText: "La prévisualisation vidéo reste sur votre téléphone. Seules les photos que vous confirmez sont envoyées.",
    method: "Une séance, sans complexité.",
    steps: [
      ["01", "Inspirez", "Choisissez un univers MIRAVA ou importez une photo de référence."],
      ["02", "Affinez", "Décrivez votre intention avec des choix visuels simples ou échangez avec votre Directrice créative."],
      ["03", "Incarnez", "MIRAVA compose l’image autour de votre Profil identité privé."],
    ],
    private: "Vos références artistiques sont supprimées après analyse. Votre Profil identité reste privé jusqu’à sa suppression.",
    adult: "MIRAVA est réservé aux personnes majeures ayant les droits et consentements nécessaires sur chaque image.",
    foot: "MIRAVA Studio · Votre studio éditorial personnel, conçu pour rester privé.",
  },
  es: {
    open: "Crear",
    eyebrow: "ENERGÍA EDITORIAL · IDENTIDAD PRESERVADA",
    title: "Tu estudio fotográfico personal, estés donde quieras ser vista.",
    intro: "Accede a un equipo creativo completo — fotografía, estilismo, dirección artística y escenarios excepcionales — para crear campañas donde sigues siendo la protagonista.",
    cta: "Crear mi sesión",
    offer: "3 creaciones incluidas al activar",
    proof: "Un rostro. Siete universos.",
    proofText: "Tu rostro, tu tono de piel y tu presencia son el hilo conductor. La pose, el estilismo, el ángulo y la luz cambian de verdad con cada dirección.",
    universes: "Los universos creativos MIRAVA",
    universesText: "Cada familia representa una intención creativa completa. Elige un escenario o sube tu propia inspiración.",
    custom: "Tu referencia se convierte en tu estudio.",
    customText: "Sube la imagen que te inspira. MIRAVA analiza su dirección artística en privado y construye alrededor de tu identidad un estudio personal reutilizable.",
    customCta: "Crear desde mi referencia",
    identity: "Tu identidad única, en el centro de la sesión.",
    identityText: "Crea tu Perfil de identidad durante el onboarding con tres retratos guiados. Añade después cabello y silueta para reforzar la fidelidad.",
    camera: "Captura guiada",
    cameraText: "La vista previa del vídeo permanece en tu teléfono. Solo se envían las fotos que confirmas.",
    method: "Una sesión, sin complejidad.",
    steps: [
      ["01", "Inspira", "Elige un universo MIRAVA o sube una foto de referencia."],
      ["02", "Afina", "Describe tu intención con opciones visuales simples o habla con tu Directora creativa."],
      ["03", "Encarna", "MIRAVA compone la imagen alrededor de tu Perfil de identidad privado."],
    ],
    private: "Tus referencias artísticas se eliminan tras el análisis. Tu Perfil de identidad permanece privado hasta que lo elimines.",
    adult: "MIRAVA está reservado a personas adultas con los derechos y consentimientos necesarios para cada imagen.",
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
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 pb-4 pt-[var(--mirava-safe-top)] sm:px-8 sm:pb-5">
        <MiravaWordmark />
        <div className="flex items-center gap-2">
          <button aria-label={locale === "fr" ? "Passer en espagnol" : "Cambiar al francés"} onClick={() => setLocale(locale === "fr" ? "es" : "fr")} className="mirava-button mirava-button-secondary min-w-12 px-3 text-xs">{locale.toUpperCase()}</button>
          <Link href="/visual-engine/studio" className="mirava-button mirava-button-primary gap-2 px-4 text-sm">{t.open}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:pb-28">
        <div className="relative z-10">
          <p className="mirava-meta inline-flex items-center gap-2 px-3 py-2 font-jakarta text-[9px] font-semibold tracking-[.16em]"><Camera className="h-3.5 w-3.5 text-mirava-accent" />{t.eyebrow}</p>
          <h1 className="mirava-title mt-6 max-w-2xl text-[3.15rem] sm:text-7xl lg:text-[5.1rem]">{t.title}</h1>
          <div>
            <p className="mirava-copy mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">{t.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/visual-engine/studio" className="mirava-button mirava-button-primary min-h-13 gap-2 px-6 text-sm">{t.cta}<ArrowRight className="h-4 w-4" /></Link>
            <MiravaInstallButton locale={locale} />
            </div>
            <p className="mirava-muted mt-4 text-xs font-medium">{t.offer}</p>
          </div>
        </div>

        <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} transition={{ duration: .3, ease: "easeOut" }} className="relative mx-auto w-full max-w-2xl">
	          <div className="absolute -inset-10 bg-mirava-ink/5 blur-3xl" />
          <div className="mirava-surface-raised relative grid grid-cols-[1.14fr_.86fr] gap-2 p-2 sm:gap-3 sm:p-3">
	            <div className="mirava-image-frame relative aspect-[4/5] overflow-hidden">
              <Image src="/visual-engine/univers/escapade-solaire.webp" alt={MIRAVA_UNIVERSES[0].name[locale]} fill priority sizes="(max-width: 1024px) 58vw, 36vw" className="object-cover" />
              <div className="mirava-media-overlay absolute inset-0" />
              <div className="absolute inset-x-4 bottom-4 text-mirava-ink sm:inset-x-6 sm:bottom-6">
                <p className="text-[8px] font-semibold tracking-[.15em] text-mirava-ink/65">ESCAPADE SOLAIRE</p>
                <p className="mt-1 font-jakarta text-xl font-semibold tracking-[-.04em] sm:text-3xl">Luz de Oro</p>
              </div>
            </div>
            <div className="grid gap-2 sm:gap-3">
	              <div className="mirava-image-frame relative overflow-hidden"><Image src="/visual-engine/univers/night-glamour.webp" alt={MIRAVA_UNIVERSES[4].name[locale]} fill sizes="(max-width: 1024px) 36vw, 24vw" className="object-cover" /></div>
	              <div className="mirava-image-frame relative overflow-hidden"><Image src="/visual-engine/univers/beauty-close-up.webp" alt={MIRAVA_UNIVERSES[2].name[locale]} fill sizes="(max-width: 1024px) 36vw, 24vw" className="object-cover" /></div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-4 py-16 sm:px-8 sm:py-24">
        <MiravaUniverseShowcase locale={locale} />
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
        <MiravaAgentSimulator locale={locale} />
      </section>

      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <MiravaSocialDistribution locale={locale} />
        </div>
      </section>

      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
          <div>
	            <p className="mirava-label">MIRAVA / {locale === "fr" ? "PROFIL IDENTITÉ" : "PERFIL DE IDENTIDAD"}</p>
	            <h2 className="mirava-section-title mt-4 text-4xl sm:text-6xl">{t.identity}</h2>
	            <p className="mirava-copy mt-5 max-w-xl text-base leading-7">{t.identityText}</p>
	            <div className="mirava-notice mt-7 p-5">
	              <p className="flex items-center gap-2 font-jakarta text-sm font-semibold text-mirava-ink"><Camera className="h-4 w-4 text-mirava-accent" />{t.camera}</p>
	              <p className="mt-2 text-sm leading-6">{t.cameraText}</p>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {identityGuide.map((src, index) => (
	              <div key={src} className={`mirava-image-frame relative overflow-hidden bg-mirava-surface ${index < 4 ? "col-span-3 aspect-[3/4] sm:col-span-2" : "col-span-3 aspect-[3/5]"}`}>
                <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 24vw" className="object-cover" />
	                <span className="mirava-control absolute bottom-2 right-2 grid h-7 min-h-0 w-7 place-items-center border-mirava-ink bg-mirava-ink text-mirava-canvas"><Check className="h-3.5 w-3.5" /></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
	        <p className="mirava-label">{locale === "fr" ? "DE L’IDÉE À L’IMAGE" : "DE LA IDEA A LA IMAGEN"}</p>
	        <h2 className="mirava-section-title mt-4 text-4xl sm:text-6xl">{t.method}</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {t.steps.map(([number, title, body]) => (
	            <article key={number} className="mirava-surface p-6">
	              <span className="font-jakarta text-xs font-semibold text-mirava-accent">{number}</span>
	              <h3 className="mt-12 font-jakarta text-xl font-semibold">{title}</h3>
	              <p className="mirava-copy mt-3 text-sm leading-6">{body}</p>
            </article>
          ))}
        </div>
	        <div className="mt-10 grid gap-3 text-sm leading-6 md:grid-cols-2">
	          <p className="mirava-notice flex gap-3 p-4"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />{t.private}</p>
	          <p className="mirava-notice flex gap-3 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />{t.adult}</p>
        </div>
      </section>

      <section className="relative border-y border-mirava-line bg-mirava-canvas-raised px-4 py-16 sm:px-8 sm:py-24">
        <MiravaFaq locale={locale} />
      </section>

      <section className="relative px-4 pb-16 sm:px-8 sm:pb-24">
	        <div className="mirava-dark-panel mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-10">
	          <div><p className="mirava-label">MIRAVA / {locale === "fr" ? "STUDIO PRIVÉ" : "ESTUDIO PRIVADO"}</p><p className="mirava-section-title mt-2 text-3xl">{t.title}</p></div>
	          <Link href="/visual-engine/studio" className="mirava-button mirava-button-primary shrink-0 gap-2 px-5 text-sm">{t.cta}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="mirava-muted relative px-5 py-8 text-center text-xs leading-5">{t.foot}</footer>
    </main>
  )
}
