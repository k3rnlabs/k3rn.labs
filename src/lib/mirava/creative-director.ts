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
  id: "branding" | "editorial" | "series" | "guided"
  icon: "briefcase" | "sparkles" | "camera" | "compass"
  title: string
  subtitle: string
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
      {
        id: "branding",
        icon: "briefcase",
        title: "Perfil Profesional y LinkedIn",
        subtitle: "Retrato profesional moderno, confiado y natural",
        message: "Deseo crear retratos profesionales limpios y elegantes para mi perfil LinkedIn y mis redes profesionales.",
      },
      {
        id: "editorial",
        icon: "sparkles",
        title: "Sesión Moda y Redes Sociales",
        subtitle: "Serie editorial estilo portada de revista con luz refinada",
        message: universeName
          ? `Propón una dirección editorial de Alta Costura impactante para el universo ${universeName}.`
          : "Propón una dirección editorial de Alta Costura impactante estilo portada de revista.",
      },
      {
        id: "series",
        icon: "camera",
        title: "Serie de 3 fotos complementarias",
        subtitle: "3 encuadres variados (primer plano, plano medio y ambiente)",
        message: "Estructura una serie de 3 imágenes complementarias variando encuadres y actitudes.",
      },
      {
        id: "guided",
        icon: "compass",
        title: "Proponer un concepto a medida",
        subtitle: "Alma elige la mejor dirección artística adaptada a tu perfil",
        message: "Propón un concepto creativo original y personalizado adaptado a mi sesión fotográfica.",
      },
    ]
  }

  return [
    {
      id: "branding",
      icon: "briefcase",
      title: "Profil Pro & LinkedIn",
      subtitle: "Portrait pro moderne, élégant, confiant & naturel",
      message: "Je souhaite créer des portraits professionnels modernes et élégants pour mon profil LinkedIn et mon image pro.",
    },
    {
      id: "editorial",
      icon: "sparkles",
      title: "Shooting Mode & Réseaux",
      subtitle: "Série éditoriale style magazine avec angles & décors déclinés",
      message: universeName
        ? `Propose une direction éditoriale Haute Couture percutante pour l'univers ${universeName}.`
        : "Propose une direction éditoriale Haute Couture percutante style couverture de magazine.",
    },
    {
      id: "series",
      icon: "camera",
      title: "Série de 3 visuels déclinés",
      subtitle: "3 vues complémentaires : portrait serré, plan moyen & vue d’ambiance",
      message: "Structure une série de 3 visuels complémentaires en déclinant cadrages et attitudes.",
    },
    {
      id: "guided",
      icon: "compass",
      title: "Me proposer un concept sur-mesure",
      subtitle: "Alma choisit la meilleure direction artistique selon votre profil",
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
