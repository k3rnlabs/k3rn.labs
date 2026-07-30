import type { MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import { getMiravaUniverse } from "@/lib/mirava/universes"

type Locale = "fr" | "es"

const actionableKeys = [
  "location",
  "styling",
  "energy",
  "framing",
  "photoStyle",
  "beauty",
  "audacity",
  "seriesSize",
  "seriesStrategy",
] as const

type ActionableKey = typeof actionableKeys[number]

export type MiravaCreativeDirectorAction = {
  id: "light" | "energy" | "series" | "directions"
  label: string
  message: string
}

export type MiravaCreativeDirectorChange = {
  label: string
  value: string
}

const labels: Record<Locale, Record<ActionableKey, string>> = {
  fr: {
    location: "Décor",
    styling: "Look",
    energy: "Énergie",
    framing: "Cadrage",
    photoStyle: "Traitement",
    beauty: "Beauté",
    audacity: "Intensité",
    seriesSize: "Série",
    seriesStrategy: "Rythme de série",
  },
  es: {
    location: "Escenario",
    styling: "Estilismo",
    energy: "Energía",
    framing: "Encuadre",
    photoStyle: "Tratamiento",
    beauty: "Belleza",
    audacity: "Intensidad",
    seriesSize: "Serie",
    seriesStrategy: "Ritmo de la serie",
  },
}

export function getMiravaCreativeDirectorStarterActions(locale: Locale, universeId?: string | null): MiravaCreativeDirectorAction[] {
  const universe = getMiravaUniverse(universeId)
  const universeName = universe?.name[locale]

  if (locale === "es") {
    return [
      { id: "light", label: "Ajustar la luz", message: universeName ? `Propón una luz que respete ${universeName}.` : "Propón una luz que valore esta sesión." },
      { id: "energy", label: "Cambiar la actitud", message: "Haz la actitud más espontánea y natural." },
      { id: "series", label: "Preparar una serie", message: "Propón una serie coherente de cuatro imágenes." },
      { id: "directions", label: "Explorar direcciones", message: "Propón tres direcciones creativas para esta sesión." },
    ]
  }

  return [
    { id: "light", label: "Ajuster la lumière", message: universeName ? `Propose une lumière fidèle à ${universeName}.` : "Propose une lumière qui valorise cette séance." },
    { id: "energy", label: "Faire évoluer l’attitude", message: "Rends l’attitude plus spontanée et naturelle." },
    { id: "series", label: "Préparer une série", message: "Propose une série cohérente de quatre images." },
    { id: "directions", label: "Explorer des directions", message: "Propose trois directions créatives pour cette séance." },
  ]
}

export function getMiravaCreativeDirectorChanges(locale: Locale, suggestions: Partial<MiravaCreativeOptions>): MiravaCreativeDirectorChange[] {
  return actionableKeys.flatMap((key) => {
    const value = suggestions[key]
    if (value === undefined) return []

    if (key === "seriesStrategy") {
      return [{ label: labels[locale][key], value: value === "varied-settings"
        ? (locale === "fr" ? "Plusieurs décors cohérents" : "Varios escenarios coherentes")
        : (locale === "fr" ? "Un décor principal" : "Un escenario principal") }]
    }

    return [{ label: labels[locale][key], value: String(value) }]
  })
}

export function limitMiravaCreativeDirectorSuggestions(value: Partial<MiravaCreativeOptions>): Partial<MiravaCreativeOptions> {
  const selected = actionableKeys.filter((key) => value[key] !== undefined).slice(0, 3)
  return Object.fromEntries(selected.map((key) => [key, value[key]])) as Partial<MiravaCreativeOptions>
}
