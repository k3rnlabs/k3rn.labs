"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Sparkles, Scan, ShieldCheck, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Locale = "fr" | "es"

interface PipelineDemoProps {
  locale: Locale
  className?: string
}

const GENERATED_STUDIO_PHOTOS = [
  "/visual-engine/univers/dubai-glamour.png",
  "/visual-engine/univers/retro-lounge.png",
  "/visual-engine/univers/night-glamour.png",
  "/visual-engine/univers/escapade-solaire.webp",
]

const STAGES = [
  {
    id: "capture",
    badge: { fr: "1. ANALYSE DU VISAGE", es: "1. ANÁLISIS FACIAL" },
    title: { fr: "Analyse biométrique neutre", es: "Análisis biométrico neutro" },
    status: { fr: "Visage neutre de face validé sur votre appareil", es: "Rostro neutro de frente validado en su dispositivo" },
    image: "/visual-engine/univers/face_neutre.png",
    icon: Scan,
    checks: [
      { fr: "Visage de face neutre", es: "Rostro neutro frontal" },
      { fr: "Éclairage & netteté validés", es: "Iluminación y nitidez validadas" },
    ],
  },
  {
    id: "identity",
    badge: { fr: "2. CRÉATION DE L'IDENTITÉ", es: "2. CREACIÓN DE IDENTIDAD" },
    title: { fr: "Synthèse de votre Profil Identité", es: "Síntesis de su Perfil de Identidad" },
    status: { fr: "Création sécurisée de votre signature visuelle privée", es: "Creación segura de su firma visual privada" },
    image: "/visual-engine/univers/face_neutre.png",
    icon: UserCheck,
    checks: [
      { fr: "Empreinte visage chiffrée", es: "Huella facial cifrada" },
      { fr: "Clé d'identité unique", es: "Clave de identidad única" },
    ],
  },
  {
    id: "studio",
    badge: { fr: "3. GÉNÉRATION DU STUDIO", es: "3. GENERACIÓN DEL ESTUDIO" },
    title: { fr: "Rendus Studio personnalisés", es: "Resultados de Estudio personalizados" },
    status: { fr: "4 univers uniques générés selon vos critères", es: "4 universos únicos generados según sus criterios" },
    image: "/visual-engine/univers/dubai-glamour.png",
    icon: Sparkles,
    checks: [
      { fr: "Rendus 100% réalistes", es: "Resultados 100% realistas" },
      { fr: "Qualité App Native 4K", es: "Calidad App Nativa 4K" },
    ],
  },
]

export function OnboardingPipelineDemo({ locale, className }: PipelineDemoProps) {
  const [activeStage, setActiveStage] = useState(0)
  const [resultPhotoIndex, setResultPhotoIndex] = useState(0)

  // Cycle main stages automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length)
    }, 4200)
    return () => clearInterval(interval)
  }, [])

  // Sub-cycle through all 4 generated studio photos when on stage 2 (Génération Studio)
  useEffect(() => {
    if (activeStage !== 2) return
    const subInterval = setInterval(() => {
      setResultPhotoIndex((prev) => (prev + 1) % GENERATED_STUDIO_PHOTOS.length)
    }, 1350)
    return () => clearInterval(subInterval)
  }, [activeStage])

  const current = STAGES[activeStage]
  const IconComponent = current.icon
  const displayImage = activeStage === 2 ? GENERATED_STUDIO_PHOTOS[resultPhotoIndex] : current.image

  return (
    <div className={cn("relative overflow-hidden rounded-[24px] border border-white/15 bg-black/80 shadow-2xl backdrop-blur-2xl flex flex-col", className)}>
      {/* Top Animated Progress Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/5 shrink-0 z-30">
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
      <div className="relative aspect-[9/13.5] w-full overflow-hidden rounded-b-[24px] bg-black flex flex-col justify-end">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.id}-${displayImage}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <img
              src={displayImage}
              alt=""
              className={cn(
                "h-full w-full object-cover object-center transition-all duration-700",
                activeStage === 1 ? "scale-105 filter blur-[2px] brightness-[0.75]" : "brightness-[0.92]"
              )}
            />

            {/* STAGE 0: Biometric Scanner Target Perfectly Aligned on face_neutre.png */}
            {activeStage === 0 && (
              <>
                {/* Vertical Scanning Laser Beam */}
                <motion.div
                  initial={{ top: "18%" }}
                  animate={{ top: ["18%", "72%", "18%"] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ede8df] to-transparent shadow-[0_0_18px_#ede8df] z-20 pointer-events-none"
                />

                {/* Oval Facial Reticle Encompassing Full Face & Head */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 -translate-y-12 sm:-translate-y-16">
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative h-56 w-44 sm:h-64 sm:w-52 rounded-[50%] border-2 border-dashed border-[#ede8df]/90 shadow-[0_0_40px_rgba(213,198,176,0.35)]"
                  >
                    <div className="absolute -top-3 -left-3 h-5 w-5 border-t-2 border-l-2 border-[#ede8df]" />
                    <div className="absolute -top-3 -right-3 h-5 w-5 border-t-2 border-r-2 border-[#ede8df]" />
                    <div className="absolute -bottom-3 -left-3 h-5 w-5 border-b-2 border-l-2 border-[#ede8df]" />
                    <div className="absolute -bottom-3 -right-3 h-5 w-5 border-b-2 border-r-2 border-[#ede8df]" />
                  </motion.div>
                </div>
              </>
            )}

            {/* STAGE 1: Identity Creation Shimmer */}
            {activeStage === 1 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-sm z-20 p-4 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="relative flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-[#ede8df] bg-[#ede8df]/15 text-[#ede8df] shadow-lg"
                >
                  <UserCheck className="h-6 w-6" />
                </motion.div>
                <p className="mt-3 font-jakarta text-sm font-semibold text-white drop-shadow-md">
                  {current.title[locale]}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-[10px] font-semibold text-white/90 backdrop-blur-md shadow-md">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ede8df]" />
                  <span>Conservation 100% privée & chiffrée</span>
                </div>
              </div>
            )}

            {/* STAGE 2: Studio Generation Flare */}
            {activeStage === 2 && (
              <motion.div
                initial={{ opacity: 0, x: "-100%" }}
                animate={{ opacity: [0, 0.45, 0], x: ["-100%", "100%", "200%"] }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent z-20 pointer-events-none"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Ambient Dark Gradient Bottom Background for Badges */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none z-20" />

        {/* Bottom Verification Badges Container */}
        <div className="relative z-30 p-3.5 pb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {current.checks.map((check, idx) => (
              <motion.span
                key={`${current.id}-${check[locale]}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + idx * 0.08 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur-md shadow-md"
              >
                <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                <span>{check[locale]}</span>
              </motion.span>
            ))}
          </div>

          <p className="font-jakarta text-xs leading-tight text-white/95 font-semibold drop-shadow-md">
            {current.status[locale]}
          </p>
        </div>
      </div>
    </div>
  )
}
