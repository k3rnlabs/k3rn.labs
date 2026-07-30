"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Cpu, Sliders, ShieldCheck, Sparkles, Check } from "lucide-react"

interface MiravaAgentSimulatorProps {
  locale: "fr" | "es"
}

const SIMULATED_REFERENCES = [
  {
    id: "editorial-sun",
    title: { fr: "Soleil Méditerranéen & Pierre", es: "Sol Mediterráneo y Piedra" },
    tagline: { fr: "Chaleur dorée rasant le relief", es: "Calor dorado bordeando el relieve" },
    image: "/visual-engine/univers/escapade-solaire.webp",
    analysis: {
      light: { fr: "Soleil rasant 45° · Température 5400K", es: "Sol rasante 45° · Temperatura 5400K" },
      palette: ["#D5C6B0", "#242626", "#8F8374", "#F1F1ED"],
      composition: { fr: "Contre-plongée · Fond minéral déglacé", es: "Contrapicado · Fondo mineral desglosado" },
      styling: { fr: "Tailoring ivoire · Or patiné", es: "Sastrería marfil · Oro envejecido" },
      agentPrompt: {
        fr: "Studio Privé construit · Directrice créative prête à composer sur votre Profil Identité",
        es: "Estudio Privado construido · Directora creativa lista para componer sobre tu Perfil de Identidad",
      },
    },
  },
  {
    id: "couture-shadow",
    title: { fr: "Haute Couture & Ombres", es: "Alta Costura y Sombras" },
    tagline: { fr: "Sculpture géométrique des volumes", es: "Escultura geométrica de volúmenes" },
    image: "/visual-engine/univers/editorial-mode.webp",
    analysis: {
      light: { fr: "Faisceau latéral dur · Ombres nettes 90°", es: "Haz lateral duro · Sombras nítidas 90°" },
      palette: ["#090A0A", "#747572", "#ABACA8", "#F1F1ED"],
      composition: { fr: "Cadre vertical centré · Géométrie brutaliste", es: "Marco vertical centrado · Geometría brutalista" },
      styling: { fr: "Silhouette sculpturale bordeaux / noir", es: "Silueta escultórica burdeos / negro" },
      agentPrompt: {
        fr: "Studio Privé construit · Adaptation immédiate à la teinte de peau & cheveux",
        es: "Estudio Privado construido · Adaptación inmediata al tono de piel y cabello",
      },
    },
  },
  {
    id: "night-flash",
    title: { fr: "Glamour Flash 35mm", es: "Glamour Flash 35mm" },
    tagline: { fr: "Spontanéité nocturne VIP", es: "Espontaneidad nocturna VIP" },
    image: "/visual-engine/univers/night-glamour.webp",
    analysis: {
      light: { fr: "Flash direct frontal · Grain argentique 400 ISO", es: "Flash directo frontal · Grano foto 400 ISO" },
      palette: ["#151717", "#D5C6B0", "#B8CDB8", "#F1F1ED"],
      composition: { fr: "Plan moyen instantané · Arrière-plan feutré", es: "Plano medio instantáneo · Fondo íntimo" },
      styling: { fr: "Velours noir · Bijoux d'oreilles précieux", es: "Terciopelo negro · Joyas de oreja preciosas" },
      agentPrompt: {
        fr: "Studio Privé construit · Confidentialité garantie & suppression après analyse",
        es: "Estudio Privado construido · Confidencialidad garantizada y borrado tras análisis",
      },
    },
  },
]

export function MiravaAgentSimulator({ locale }: MiravaAgentSimulatorProps) {
  const [activeRefId, setActiveRefId] = useState<string>(SIMULATED_REFERENCES[0].id)
  const activeRef = SIMULATED_REFERENCES.find((r) => r.id === activeRefId) || SIMULATED_REFERENCES[0]

  const copy = {
    fr: {
      eyebrow: "AGENT MIRAVA · EXTRACTION ARTISTIQUE D'UN CLIC",
      title: "Votre référence devient votre studio.",
      intro:
        "Importez n'importe quelle photo de référence. L'agent IA MIRAVA en décompose les paramètres clés (lumière, palette, cadrage, texture) pour recréer un studio éditorial sur mesure articulé autour de votre visage.",
      selectReference: "Sélectionnez un exemple d'inspiration :",
      liveAnalysis: "Analyse Agent en direct",
      lightParam: "Lumière & Température",
      compParam: "Cadrage & Perspective",
      styleParam: "Stylisme & Palette",
      paletteParam: "Palette extraite",
      privacyNotice: "Vos images de référence sont supprimées immédiatement après décomposition.",
      cta: "Créer depuis ma référence",
    },
    es: {
      eyebrow: "AGENTE MIRAVA · EXTRACCIÓN ARTÍSTICA EN UN CLIC",
      title: "Tu referencia se convierte en tu estudio.",
      intro:
        "Sube cualquier foto de referencia. El agente IA MIRAVA descompone los parámetros clave (luz, paleta, encuadre, textura) para recrear un estudio editorial a medida articulado alrededor de tu rostro.",
      selectReference: "Selecciona un ejemplo de inspiración:",
      liveAnalysis: "Análisis del Agente en directo",
      lightParam: "Luz y Temperatura",
      compParam: "Encuadre y Perspectiva",
      styleParam: "Estilismo y Paleta",
      paletteParam: "Paleta extraída",
      privacyNotice: "Tus imágenes de referencia se eliminan inmediatamente tras la descomposición.",
      cta: "Crear desde mi referencia",
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
              href="/visual-engine/studio"
              className="mirava-button mirava-button-primary min-h-12 gap-2 px-6 text-sm"
            >
              {copy.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: Simulated Live Agent Extraction Visualizer */}
      <div className="relative border-t border-mirava-line bg-mirava-canvas-raised p-6 sm:p-8 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-mirava-line pb-4">
          <div className="flex items-center gap-2 font-jakarta text-xs font-semibold uppercase tracking-widest text-mirava-accent">
            <Sliders className="h-3.5 w-3.5" />
            <span>{copy.liveAnalysis}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mirava-accent/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-mirava-accent border border-mirava-accent/30">
            <Sparkles className="h-3 w-3 animate-pulse" />
            AGENT READY
          </span>
        </div>

        {/* Dynamic Image & Extraction Breakdown */}
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

            {/* Extracted Parameters List */}
            <div className="grid gap-3 text-xs">
              <div className="mirava-surface rounded-md p-3 border border-mirava-line">
                <span className="font-jakarta text-[10px] font-bold uppercase tracking-wider text-mirava-accent">
                  {copy.lightParam}
                </span>
                <p className="mt-1 font-mono text-xs text-mirava-ink">{activeRef.analysis.light[locale]}</p>
              </div>

              <div className="mirava-surface rounded-md p-3 border border-mirava-line">
                <span className="font-jakarta text-[10px] font-bold uppercase tracking-wider text-mirava-accent">
                  {copy.compParam}
                </span>
                <p className="mt-1 font-mono text-xs text-mirava-ink">{activeRef.analysis.composition[locale]}</p>
              </div>

              <div className="mirava-surface rounded-md p-3 border border-mirava-line">
                <div className="flex items-center justify-between">
                  <span className="font-jakarta text-[10px] font-bold uppercase tracking-wider text-mirava-accent">
                    {copy.paletteParam}
                  </span>
                  <div className="flex gap-1.5">
                    {activeRef.analysis.palette.map((color, idx) => (
                      <span
                        key={idx}
                        className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Agent Output Badge */}
              <div className="mt-1 rounded-md bg-mirava-accent/10 p-3 border border-mirava-accent/30 text-[11px] leading-relaxed text-mirava-accent">
                ✨ {activeRef.analysis.agentPrompt[locale]}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
