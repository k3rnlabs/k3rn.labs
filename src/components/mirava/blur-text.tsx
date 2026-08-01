"use client"

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type BlurTextProps = {
  text: string
  className?: string
  animateBy?: "words" | "letters"
  direction?: "top" | "bottom"
  delay?: number
  stepDuration?: number
  threshold?: number
  rootMargin?: string
  onAnimationComplete?: () => void
}

type MotionSnapshot = {
  filter: string
  opacity: number
  y: number
}

function buildKeyframes(from: MotionSnapshot, steps: MotionSnapshot[]) {
  return {
    filter: [from.filter, ...steps.map((step) => step.filter)],
    opacity: [from.opacity, ...steps.map((step) => step.opacity)],
    y: [from.y, ...steps.map((step) => step.y)],
  }
}

export function BlurText({
  text,
  className,
  animateBy = "words",
  direction = "top",
  delay = 52,
  stepDuration = 0.28,
  threshold = 0.15,
  rootMargin = "0px 0px -8%",
  onAnimationComplete,
}: BlurTextProps) {
  const segments = useMemo(() => (animateBy === "words" ? text.split(" ") : text.split("")), [animateBy, text])
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setInView(true)
      observer.unobserve(element)
    }, { threshold, rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [reducedMotion, rootMargin, threshold])

  const from = useMemo<MotionSnapshot>(() => ({
    filter: "blur(10px)",
    opacity: 0,
    y: direction === "top" ? -26 : 26,
  }), [direction])
  const to = useMemo<MotionSnapshot[]>(() => [
    { filter: "blur(3px)", opacity: 0.55, y: direction === "top" ? 3 : -3 },
    { filter: "blur(0px)", opacity: 1, y: 0 },
  ], [direction])
  const keyframes = useMemo(() => buildKeyframes(from, to), [from, to])
  const duration = stepDuration * to.length
  const times = useMemo(() => Array.from({ length: to.length + 1 }, (_, index) => index / to.length), [to.length])

  return (
    <span ref={ref} className={cn("inline-flex flex-wrap", className)}>
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          className="inline-block will-change-[transform,filter,opacity]"
          initial={reducedMotion ? false : from}
          animate={reducedMotion || inView ? keyframes : from}
          transition={{ duration, times, delay: (index * delay) / 1000, ease: "easeOut" }}
          onAnimationComplete={index === segments.length - 1 ? onAnimationComplete : undefined}
        >
          {segment || "\u00A0"}
          {animateBy === "words" && index < segments.length - 1 ? "\u00A0" : null}
        </motion.span>
      ))}
    </span>
  )
}
