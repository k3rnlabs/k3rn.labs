"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Sparkles, Scan, Camera, Wand2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Locale } from "@/lib/mirava/brand"

interface PipelineDemoProps {
  locale: Locale
  className?: string
}

const STAGES = [
  {
    id: "capture",
    badge: { fr: "1. ANALYSE DU VISAGE", es: "1. ANÁLISIS FACIAL" },
    title: { fr: "Scan de votre identité visuelle", es: "Escaner de su identidad visual" },
    status: { fr: "Visage neutre détecté & validé sur l'appareil", es: "Rostro neutro detectado y validado en el dispositivo" },
    image: "/visual-engine/univers/beauty-close-up.png",
    icon: Scan,
    checks: [
      { fr: "Visage de face neutre", es: "Rostro neutro frontal" },
      { fr: "Éclairage & netteté validés", es: "Iluminación y nitidez validadas" },
    ],
  },
  {
    id: "synthesis",
    badge: { fr: "2. DIRECTION ÉDITORIALE", es: "2. DIRECCIÓN EDITORIAL" },
    title: { fr: "Synthèse IA sur-mesure", es: "Síntesis IA a medida" },
    status: { fr: "Génération du Studio selon votre direction", es: "Generación del Estudio según su dirección" },
    image: "/visual-engine/univers/beauty-close-up.png",
    icon: Wand2,
    checks: [
      { fr: "Préservation des traits réels", es: "Preservación de rasgos reales" },
      { fr: "Rendu 4K Studio", es: "Rendimiento 4K Estudio" },
    ],
  },
  {
    id: "result",
    badge: { fr: "3. VOTRE STUDIO GÉNÉRÉ", es: "3. SU ESTUDIO GENERADO" },
    title: { fr: "Résultat éditorial final", es: "Resultado editorial final" },
    status: { fr: "Campagne personnalisée prête à diffuser", es: "Campaña personalizada lista para publicar" },
    image: "/visual-engine/univers/dubai-glamour.png",
    icon: Sparkles,
    checks: [
      { fr: "Rendus 100% réalistes", es: "Resultados 100% realistas" },
      { fr: "Qualité App Native", es: "Calidad App Nativa" },
    ],
  },
]

export function OnboardingPipelineDemo({ locale, className }: PipelineDemoProps) {
  const [activeStage, setActiveStage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length)
    }, 3600)
    return () => clearInterval(interval)
  }, [])

  const current = STAGES[activeStage]
  const IconComponent = current.icon

  return (
    <div className={cn("relative overflow-hidden rounded-[24px] border border-white/15 bg-black/70 p-1 shadow-2xl backdrop-blur-2xl", className)}>
      {/* Top Animated Progress Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/5">
        <div className="flex items-center gap-2">
          <motion.div
            key={current.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ede8df] text-black shadow-sm"
          >
            <IconComponent className="h-3.5 w-3.5" />
          </motion.div>
          <span className="font-jakarta text-[10px] font-bold tracking-[0.14em] text-[#d5c6b0] uppercase">
            {current.badge[locale]}
          </span>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Stages demo">
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={activeStage === idx}
              onClick={() => setActiveStage(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activeStage === idx ? "w-6 bg-[#ede8df]" : "w-1.5 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* Main Animation Display Canvas */}
      <div className="relative aspect-[9/12] w-full overflow-hidden rounded-[20px] bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full"
          >
            <img
              src={current.image}
              alt=""
              className={cn(
                "h-full w-full object-cover object-top transition-all duration-700",
                activeStage === 1 ? "scale-105 filter blur-[2px] brightness-[0.75]" : "brightness-[0.9]"
              )}
            />

            {/* STAGE 0: Biometric Laser Scan Overlays */}
            {activeStage === 0 && (
              <>
                {/* Vertical Scanning Laser */}
                <motion.div
                  initial={{ top: "0%" }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ede8df] to-transparent shadow-[0_0_15px_#ede8df] z-20 pointer-events-none"
                />

                {/* Facial Reticle Frame */}
                <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative h-44 w-36 rounded-full border border-dashed border-[#ede8df]/60 shadow-[0_0_30px_rgba(213,198,176,0.2)]"
                  >
                    <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-[#ede8df]" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-[#ede8df]" />
                    <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-[#ede8df]" />
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-[#ede8df]" />
                  </motion.div>
                </div>
              </>
            )}

            {/* STAGE 1: AI Synthesis Particle Wave */}
            {activeStage === 1 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20 p-4 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="relative flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-[#ede8df] bg-[#ede8df]/10 text-[#ede8df]"
                >
                  <Sparkles className="h-6 w-6" />
                </motion.div>
                <p className="mt-3 font-jakarta text-sm font-semibold text-white drop-shadow-md">
                  {current.title[locale]}
                </p>
                <div className="mt-2 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
                  <ShieldCheck className="h-3 w-3 text-[#ede8df]" />
                  <span>Traitement sécurisé sur votre appareil</span>
                </div>
              </div>
            )}

            {/* STAGE 2: Result Gold Flare Overlay */}
            {activeStage === 2 && (
              <motion.div
                initial={{ opacity: 0, x: "-100%" }}
                animate={{ opacity: [0, 0.4, 0], x: ["-100%", "100%", "200%"] }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent z-20 pointer-events-none"
              />
            )}

            {/* Ambient Dark Gradient Bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-10" />

            {/* Floating Live Verification Badges */}
            <div className="absolute inset-x-3 bottom-3 z-30 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {current.checks.map((check, idx) => (
                  <motion.span
                    key={check[locale]}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.1 }}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 backdrop-blur-md shadow-sm"
                  >
                    <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                    <span>{check[locale]}</span>
                  </motion.span>
                ))}
              </div>

              <p className="font-jakarta text-xs leading-tight text-white/90 font-medium drop-shadow-md">
                {current.status[locale]}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
