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
  id: "reference" | "campaign" | "series" | "guided"
  icon: "briefcase" | "sparkles" | "camera" | "compass"
  title: string
  subtitle: string
  kind: "reference" | "message"
  message?: string
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
      {
        id: "reference",
        icon: "briefcase",
        title: "Crear desde mi inspiración",
        subtitle: "Importa una imagen y crea un estudio personal reutilizable",
        kind: "reference",
      },
      {
        id: "campaign",
        icon: "sparkles",
        title: "Campaña para mis redes",
        subtitle: "Una dirección editorial diseñada para tu presencia social",
        kind: "message",
        message: universeName
          ? `Propón una dirección editorial impactante para una campaña de redes dentro del universo ${universeName}.`
          : "Propón una dirección editorial impactante para una campaña de redes sociales.",
      },
      {
        id: "series",
        icon: "camera",
        title: "Serie de 3 imágenes coherentes",
        subtitle: "3 encuadres variados (primer plano, plano medio y ambiente)",
        kind: "message",
        message: "Estructura una serie de 3 imágenes complementarias variando encuadres y actitudes.",
      },
      {
        id: "guided",
        icon: "compass",
        title: "Imaginar un concepto a medida",
        subtitle: "Alma propone una dirección adaptada a tu intención",
        kind: "message",
        message: "Propón un concepto creativo original y personalizado adaptado a mi sesión fotográfica.",
      },
    ]
  }

  return [
    {
      id: "reference",
      icon: "briefcase",
      title: "Créer depuis mon inspiration",
      subtitle: "Importez une image et créez un studio personnel réutilisable",
      kind: "reference",
    },
    {
      id: "campaign",
      icon: "sparkles",
      title: "Campagne pour mes réseaux",
      subtitle: "Une direction éditoriale pensée pour votre présence sociale",
      kind: "message",
      message: universeName
        ? `Propose une direction éditoriale percutante pour une campagne réseaux dans l’univers ${universeName}.`
        : "Propose une direction éditoriale percutante pour une campagne réseaux.",
    },
    {
      id: "series",
      icon: "camera",
      title: "Série de 3 images cohérentes",
      subtitle: "3 vues complémentaires : portrait serré, plan moyen & vue d’ambiance",
      kind: "message",
      message: "Structure une série de 3 visuels complémentaires en déclinant cadrages et attitudes.",
    },
    {
      id: "guided",
      icon: "compass",
      title: "Me proposer un concept sur-mesure",
      subtitle: "Alma propose une direction adaptée à votre intention",
      kind: "message",
      message: "Propose-moi un concept créatif original et sur-mesure adapté à ma séance photo.",
    },
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
