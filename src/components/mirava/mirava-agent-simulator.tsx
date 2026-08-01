"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, CheckCircle2, Cpu, ShieldCheck } from "lucide-react"

interface MiravaAgentSimulatorProps {
  locale: "fr" | "es"
}

const SIMULATED_REFERENCES = [
  {
    id: "editorial-sun",
    title: { fr: "Soleil Méditerranéen & Pierre", es: "Sol Mediterráneo y Piedra" },
    tagline: { fr: "Chaleur dorée rasant le relief", es: "Calor dorado bordeando el relieve" },
    image: "/visual-engine/univers/escapade-solaire.webp",
  },
  {
    id: "couture-shadow",
    title: { fr: "Haute Couture & Ombres", es: "Alta Costura y Sombras" },
    tagline: { fr: "Sculpture géométrique des volumes", es: "Escultura geométrica de volúmenes" },
    image: "/visual-engine/univers/editorial-mode.webp",
  },
  {
    id: "night-flash",
    title: { fr: "Glamour Flash 35mm", es: "Glamour Flash 35mm" },
    tagline: { fr: "Spontanéité nocturne VIP", es: "Espontaneidad nocturna VIP" },
    image: "/visual-engine/univers/night-glamour.webp",
  },
]

export function MiravaAgentSimulator({ locale }: MiravaAgentSimulatorProps) {
  const [activeRefId, setActiveRefId] = useState<string>(SIMULATED_REFERENCES[0].id)
  const activeRef = SIMULATED_REFERENCES.find((r) => r.id === activeRefId) || SIMULATED_REFERENCES[0]

  const copy = {
    fr: {
      eyebrow: "STUDIO SUR-MESURE · DIRECTION PRIVÉE",
      title: "Votre référence devient votre studio.",
      intro: "Une seule image suffit pour créer un studio qui vous ressemble. MIRAVA conserve cette direction de façon privée et l’applique à vos prochaines séances.",
      selectReference: "Sélectionnez un exemple d'inspiration :",
      studioReady: "Votre studio reste privé",
      privateBadge: "PRIVÉ",
      studioBenefits: ["Votre référence est supprimée après création du studio.", "Votre direction artistique n’est jamais affichée ni partagée.", "Chaque nouvelle image est livrée dans votre galerie privée au format 4:5."],
      privacyNotice: "Votre image de référence est supprimée après création de votre studio.",
      cta: "Créer mon studio depuis une référence",
    },
    es: {
      eyebrow: "ESTUDIO A MEDIDA · DIRECCIÓN PRIVADA",
      title: "Tu referencia se convierte en tu estudio.",
      intro: "Una sola imagen basta para crear un estudio que se parezca a ti. MIRAVA conserva esa dirección de forma privada y la aplica a tus próximas sesiones.",
      selectReference: "Selecciona un ejemplo de inspiración:",
      studioReady: "Tu estudio permanece privado",
      privateBadge: "PRIVADO",
      studioBenefits: ["Tu referencia se elimina después de crear el estudio.", "Tu dirección artística nunca se muestra ni se comparte.", "Cada imagen nueva se entrega en tu galería privada en formato 4:5."],
      privacyNotice: "Tu imagen de referencia se elimina después de crear tu estudio.",
      cta: "Crear mi estudio desde una referencia",
    },
  }[locale]

  return (
    <div className="mirava-surface-raised grid overflow-hidden rounded-[var(--mirava-radius-lg)] border border-mirava-line lg:grid-cols-2">
      {/* Left Column: Copy & Interactive Reference Selector */}
      <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
        <div>
          <p className="mirava-label inline-flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-mirava-accent" />
            {copy.eyebrow}
          </p>
          <h2 className="mirava-section-title mt-4 text-3xl sm:text-5xl">{copy.title}</h2>
          <p className="mirava-copy mt-4 text-sm leading-relaxed sm:text-base">{copy.intro}</p>

          {/* Reference buttons */}
          <div className="mt-6">
            <p className="font-jakarta text-xs font-semibold uppercase tracking-wider text-mirava-accent">
              {copy.selectReference}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SIMULATED_REFERENCES.map((ref) => {
                const isActive = ref.id === activeRefId
                return (
                  <button
                    key={ref.id}
                    onClick={() => setActiveRefId(ref.id)}
                    className={`mirava-control inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-mirava-ink text-mirava-canvas border-mirava-ink shadow-md"
                        : "bg-mirava-surface text-mirava-ink-secondary hover:text-mirava-ink"
                    }`}
                  >
                    {isActive && <Check className="h-3.5 w-3.5 text-mirava-accent" />}
                    <span>{ref.title[locale]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-mirava-line pt-6">
          <p className="flex items-center gap-2 text-xs text-mirava-ink-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-mirava-accent" />
            <span>{copy.privacyNotice}</span>
          </p>
          <div className="mt-4">
            <Link
              href="/visual-engine/studio?source=reference"
              className="mirava-button mirava-button-primary min-h-12 gap-2 px-6 text-sm"
            >
              {copy.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: private studio outcome — internal directions never reach the client */}
      <div className="relative border-t border-mirava-line bg-mirava-canvas-raised p-6 sm:p-8 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-mirava-line pb-4">
          <div className="flex items-center gap-2 font-jakarta text-xs font-semibold uppercase tracking-widest text-mirava-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{copy.studioReady}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mirava-accent/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-mirava-accent border border-mirava-accent/30">
            <Check className="h-3 w-3" />
            {copy.privateBadge}
          </span>
        </div>

            {/* Example inspiration, without exposing its internal creative direction */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRef.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-6 grid gap-6"
          >
            {/* Image Preview with Scan Line */}
            <div className="mirava-image-frame relative aspect-[16/10] overflow-hidden rounded-lg">
              <Image
                src={activeRef.image}
                alt={activeRef.title[locale]}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="mirava-media-overlay absolute inset-0" />
              <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
                <div>
                  <p className="font-jakarta text-xs font-semibold text-mirava-ink">
                    {activeRef.title[locale]}
                  </p>
                  <p className="text-[10px] text-mirava-ink-secondary">{activeRef.tagline[locale]}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-xs">
              {copy.studioBenefits.map((benefit) => (
                <div key={benefit} className="mirava-surface flex items-start gap-2.5 rounded-md border border-mirava-line p-3 text-mirava-ink-secondary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mirava-accent" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
