"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MiravaVisionResult } from "./mirava-vision.types"

type MiravaScanOverlayProps = {
  locale: "fr" | "es"
  variant?: "face" | "body" | "detail"
  target?: MiravaVisionResult
  showStatus?: boolean
  className?: string
}

const FALLBACK_FRAME_STYLES = {
  face: "h-[66%] w-[54%] max-h-72 max-w-56",
  body: "h-[84%] w-[66%] max-h-[28rem] max-w-60",
  detail: "h-[58%] w-[74%] max-h-52 max-w-72",
} as const

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function MiravaScanOverlay({
  locale,
  variant = "face",
  target,
  showStatus = true,
  className,
}: MiravaScanOverlayProps) {
  const reducedMotion = useReducedMotion()

  const hasDetectedTarget =
    target?.centerX !== null &&
    target?.centerX !== undefined &&
    target.centerY !== null &&
    target.centerY !== undefined &&
    target.boxWidth !== null &&
    target.boxWidth !== undefined &&
    target.boxHeight !== null &&
    target.boxHeight !== undefined

  let detectedFrame:
    | {
        left: string
        top: string
        width: string
        height: string
      }
    | undefined

  if (hasDetectedTarget) {
    if (variant === "face") {
      const rawWidth = target.boxWidth! * 1.3
      const rawHeight = target.boxHeight! * 1.18

      // L’ovale suit les proportions détectées tout en restant assez large
      // pour les visages carrés ou larges.
      const ovalRatio = clamp(
        rawHeight / Math.max(0.001, rawWidth),
        1.12,
        1.32,
      )

      const width = clamp(
        Math.max(rawWidth, rawHeight / ovalRatio),
        0.3,
        0.74,
      )

      const height = clamp(
        width * ovalRatio,
        0.4,
        0.88,
      )

      const centerX = clamp(
        target.centerX!,
        width / 2 + 0.01,
        1 - width / 2 - 0.01,
      )

      const centerY = clamp(
        target.centerY!,
        height / 2 + 0.01,
        1 - height / 2 - 0.01,
      )

      detectedFrame = {
        left: `${centerX * 100}%`,
        top: `${centerY * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }
    } else if (variant === "body") {
      const width = clamp(target.boxWidth! * 1.25, 0.34, 0.78)
      const height = clamp(target.boxHeight! * 1.08, 0.62, 0.94)

      detectedFrame = {
        left: `${target.centerX! * 100}%`,
        top: `${target.centerY! * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }
    }
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-20 overflow-hidden",
        className,
      )}
    >
      <motion.div
        initial={{ top: "12%" }}
        animate={
          reducedMotion
            ? { top: "50%" }
            : { top: ["12%", "86%", "12%"] }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                repeat: Infinity,
                duration: 2.2,
                ease: "linear",
              }
        }
        className="absolute inset-x-0 z-30 h-0.5 bg-gradient-to-r from-transparent via-[#ede8df] to-transparent shadow-[0_0_18px_#ede8df]"
      />

      <div className="absolute inset-0 z-20">
        {/* Static wrapper owns positioning and translation.
            Framer Motion only animates the inner frame. */}
        <div
          style={
            detectedFrame ?? {
              left: "50%",
              top: "50%",
            }
          }
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2",
            !detectedFrame && FALLBACK_FRAME_STYLES[variant],
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
            className={cn(
              "relative h-full w-full border-2 border-dashed border-[#ede8df]/90 shadow-[0_0_40px_rgba(213,198,176,0.35)]",
              variant === "face"
                ? "rounded-[50%]"
                : variant === "body"
                  ? "rounded-[30%]"
                  : "rounded-[28px]",
            )}
          >
            <span className="absolute -left-3 -top-3 h-6 w-6 border-l-2 border-t-2 border-[#ede8df]" />
            <span className="absolute -right-3 -top-3 h-6 w-6 border-r-2 border-t-2 border-[#ede8df]" />
            <span className="absolute -bottom-3 -left-3 h-6 w-6 border-b-2 border-l-2 border-[#ede8df]" />
            <span className="absolute -bottom-3 -right-3 h-6 w-6 border-b-2 border-r-2 border-[#ede8df]" />
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 bg-black/5" />

      {showStatus && (
        <div className="absolute left-3 top-3 z-40 flex items-center gap-2 rounded-full border border-[#ede8df]/40 bg-black/80 px-3 py-1 font-jakarta text-xs font-semibold text-[#ede8df] backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            {variant === "body"
              ? locale === "fr"
                ? "Analyse de la silhouette..."
                : "Analizando la silueta..."
              : variant === "detail"
                ? locale === "fr"
                  ? "Analyse de la photo..."
                  : "Analizando la foto..."
                : locale === "fr"
                  ? "Analyse du visage..."
                  : "Analizando el rostro..."}
          </span>
        </div>
      )}
    </div>
  )
}
