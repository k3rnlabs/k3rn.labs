"use client"

import { useEffect, useState } from "react"
import type { MiravaLocale } from "@/lib/mirava/brand"

const storageKey = "mirava:locale"

export function useMiravaLocale() {
  const [locale, setLocaleState] = useState<MiravaLocale>("fr")

  useEffect(() => {
    const remembered = window.localStorage.getItem(storageKey)
    if (remembered === "fr" || remembered === "es") {
      setLocaleState(remembered)
      return
    }
    if (navigator.language.toLowerCase().startsWith("es")) setLocaleState("es")
  }, [])

  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = locale
    return () => {
      document.documentElement.lang = previous
    }
  }, [locale])

  const setLocale = (next: MiravaLocale) => {
    setLocaleState(next)
    window.localStorage.setItem(storageKey, next)
  }

  return { locale, setLocale }
}
