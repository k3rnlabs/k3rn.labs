"use client"

import { useCallback, useEffect, useState } from "react"

export function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false)
  const update = useCallback(() => setScrolled(window.scrollY > threshold), [threshold])

  useEffect(() => {
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [update])

  return scrolled
}
