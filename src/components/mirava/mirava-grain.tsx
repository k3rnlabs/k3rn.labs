"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type MiravaGrainProps = {
  className?: string
}

function nextNoise(value: number) {
  let noise = value
  noise ^= noise << 13
  noise ^= noise >>> 17
  noise ^= noise << 5
  return noise >>> 0
}

export function MiravaGrain({ className }: MiravaGrainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const seedRef = useRef(Math.floor(Math.random() * 2 ** 32))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const density = Math.min(window.devicePixelRatio || 1, 1.25)
      const width = Math.max(1, Math.min(1600, Math.round(window.innerWidth * density)))
      const height = Math.max(1, Math.min(1600, Math.round(window.innerHeight * density)))
      if (canvas.width === width && canvas.height === height) return

      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d", { alpha: true })
      if (!context) return

      const pixels = context.createImageData(width, height)
      let noise = seedRef.current
      for (let index = 0; index < pixels.data.length; index += 4) {
        noise = nextNoise(noise)
        const value = noise & 255
        if (value > 42) continue

        const luminance = 156 + ((noise >>> 8) & 95)
        pixels.data[index] = luminance
        pixels.data[index + 1] = luminance
        pixels.data[index + 2] = luminance
        pixels.data[index + 3] = 8 + ((noise >>> 16) & 15)
      }
      context.putImageData(pixels, 0, 0)
    }

    let frame = requestAnimationFrame(draw)
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    window.addEventListener("resize", onResize, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("mirava-react-grain", className)} />
}
