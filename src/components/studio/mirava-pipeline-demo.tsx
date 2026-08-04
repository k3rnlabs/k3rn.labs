"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Sparkles, Scan, ShieldCheck, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { MiravaScanOverlay } from "./mirava-scan-overlay"

type Locale = "fr" | "es"

interface PipelineDemoProps {
  locale: Locale
  className?: string
}

const GENERATED_STUDIO_PHOTOS = [
  "/visual-engine/univers/plage3.webp",
  "/visual-engine/univers/hot.webp",
  "/visual-engine/univers/sexy.webp",
  "/visual-engine/univers/lifestyle-creatrice.webp",
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
    image: "/visual-engine/univers/plage3.webp",
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

            {/* Shared MIRAVA face scanning overlay */}
            {activeStage === 0 && (
              <MiravaScanOverlay
                locale={locale}
                variant="face"
                showStatus={false}
              />
            )}

            {/* STAGE 1: Premium identity synthesis */}
            {activeStage === 1 && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/35 px-6 text-center backdrop-blur-[2px]">
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="w-full max-w-[300px] rounded-[22px] border border-white/15 bg-black/65 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-jakarta text-[9px] font-bold tracking-[0.18em] text-[#d5c6b0] uppercase">
                      {locale === "fr"
                        ? "Synthèse biométrique"
                        : "Síntesis biométrica"}
                    </span>

                    <motion.span
                      initial={{ opacity: 0.45 }}
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                      className="font-jakarta text-[9px] font-semibold text-white/60"
                    >
                      MIRAVA ID
                    </motion.span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      locale === "fr" ? "Visage" : "Rostro",
                      locale === "fr" ? "Traits" : "Rasgos",
                      locale === "fr" ? "Signature" : "Firma",
                    ].map((label, index) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0.3, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.18 + index * 0.22,
                          duration: 0.4,
                        }}
                        className="rounded-xl border border-white/10 bg-white/[0.055] px-2 py-3"
                      >
                        <motion.div
                          initial={{ scaleX: 0.25 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            delay: 0.25 + index * 0.22,
                            duration: 0.55,
                          }}
                          className="mx-auto h-px w-7 origin-left bg-[#ede8df]"
                        />

                        <span className="mt-2 block font-jakarta text-[9px] font-semibold tracking-wide text-white/75 uppercase">
                          {label}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-full bg-white/10 p-[2px]">
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
                      <motion.div
                        initial={{ width: "8%" }}
                        animate={{
                          width: ["8%", "58%", "100%"],
                        }}
                        transition={{
                          duration: 3.1,
                          times: [0, 0.58, 1],
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-[#aa9680] via-[#f4eee5] to-white shadow-[0_0_14px_rgba(244,238,229,0.75)]"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between font-jakarta text-[9px] text-white/45">
                    <span>
                      {locale === "fr"
                        ? "Analyse des repères"
                        : "Análisis de referencias"}
                    </span>
                    <span>
                      {locale === "fr"
                        ? "Profil sécurisé"
                        : "Perfil seguro"}
                    </span>
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-5 font-jakarta text-base font-semibold text-white drop-shadow-md"
                >
                  {current.title[locale]}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-3 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 font-jakarta text-[10px] font-semibold text-white/85 backdrop-blur-md"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ede8df]" />
                  <span>
                    {locale === "fr"
                      ? "Conservation privée et chiffrée"
                      : "Conservación privada y cifrada"}
                  </span>
                </motion.div>
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
