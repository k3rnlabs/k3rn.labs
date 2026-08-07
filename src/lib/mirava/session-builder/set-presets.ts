export const MIRAVA_SET_PRESET_CATEGORIES = [
  "ESSENTIAL",
  "SIGNATURE",
] as const

export type MiravaSetPresetCategory =
  (typeof MIRAVA_SET_PRESET_CATEGORIES)[number]

export type MiravaSetPreset = Readonly<{
  id: string
  version: number
  name: {
    fr: string
    es: string
  }
  description: {
    fr: string
    es: string
  }
  category: MiravaSetPresetCategory
  environmentPrompt: string
  backgroundPrompt: string
  floorPrompt: string | null
  spatialPrompt: string
  constraints: readonly string[]
}>

export const MIRAVA_SET_PRESETS = [
  {
    id: "white-cyclorama-v1",
    version: 1,
    name: {
      fr: "Studio blanc",
      es: "Estudio blanco",
    },
    description: {
      fr: "Cyclorama blanc, propre et intemporel.",
      es: "Ciclorama blanco, limpio y atemporal.",
    },
    category: "ESSENTIAL",
    environmentPrompt:
      "professional controlled photography studio",
    backgroundPrompt:
      "continuous pure white seamless cyclorama backdrop",
    floorPrompt:
      "continuous matte white studio floor integrated into the cyclorama",
    spatialPrompt:
      "large clean cyclorama with generous shooting depth and no visible room architecture",
    constraints: [
      "no outdoor environment",
      "no decorative furniture",
      "no visible backdrop stands",
      "no unrelated architectural elements",
    ],
  },
  {
    id: "grey-cyclorama-v1",
    version: 1,
    name: {
      fr: "Studio gris",
      es: "Estudio gris",
    },
    description: {
      fr: "Fond gris neutre pour mode, portrait et campagne.",
      es: "Fondo gris neutro para moda, retrato y campaña.",
    },
    category: "ESSENTIAL",
    environmentPrompt:
      "professional controlled photography studio",
    backgroundPrompt:
      "continuous neutral medium-grey seamless cyclorama backdrop",
    floorPrompt:
      "matching matte grey studio floor integrated into the cyclorama",
    spatialPrompt:
      "large seamless studio space with controlled depth and no visible room architecture",
    constraints: [
      "no outdoor environment",
      "no decorative furniture",
      "no visible backdrop stands",
      "no unrelated architectural elements",
    ],
  },
  {
    id: "black-cyclorama-v1",
    version: 1,
    name: {
      fr: "Studio noir",
      es: "Estudio negro",
    },
    description: {
      fr: "Plateau noir profond pour une présence plus dramatique.",
      es: "Plató negro profundo para una presencia más dramática.",
    },
    category: "ESSENTIAL",
    environmentPrompt:
      "professional controlled photography studio",
    backgroundPrompt:
      "continuous deep black seamless cyclorama backdrop",
    floorPrompt:
      "continuous matte black studio floor integrated into the cyclorama",
    spatialPrompt:
      "large black cyclorama with controlled shooting depth and no visible room architecture",
    constraints: [
      "no outdoor environment",
      "no decorative furniture",
      "no visible backdrop stands",
      "no unrelated architectural elements",
    ],
  },
  {
    id: "pro-fashion-studio-v1",
    version: 1,
    name: {
      fr: "Studio fashion pro",
      es: "Estudio fashion pro",
    },
    description: {
      fr: "Un véritable plateau de photographe, ample et professionnel.",
      es: "Un auténtico plató fotográfico, amplio y profesional.",
    },
    category: "SIGNATURE",
    environmentPrompt:
      "high-end professional fashion photography studio",
    backgroundPrompt:
      "large neutral seamless shooting area with restrained professional studio context",
    floorPrompt:
      "clean matte professional studio floor",
    spatialPrompt:
      "spacious fashion photography stage with realistic production depth and controlled equipment placement outside the main subject area",
    constraints: [
      "no domestic interior",
      "no clutter",
      "no random furniture",
      "no event venue appearance",
    ],
  },
  {
    id: "editorial-studio-v1",
    version: 1,
    name: {
      fr: "Studio éditorial",
      es: "Estudio editorial",
    },
    description: {
      fr: "Minimal, architectural et pensé pour la mode.",
      es: "Minimalista, arquitectónico y pensado para moda.",
    },
    category: "SIGNATURE",
    environmentPrompt:
      "minimal high-fashion editorial photography studio",
    backgroundPrompt:
      "restrained architectural studio backdrop with clean geometric surfaces",
    floorPrompt:
      "matte editorial studio floor with subtle tonal continuity",
    spatialPrompt:
      "minimal sculptural studio space with deliberate negative space and strong compositional geometry",
    constraints: [
      "no outdoor environment",
      "no lifestyle furniture",
      "no decorative clutter",
      "no unrelated props",
    ],
  },
  {
    id: "daylight-studio-v1",
    version: 1,
    name: {
      fr: "Studio daylight",
      es: "Estudio daylight",
    },
    description: {
      fr: "Grand studio clair avec fenêtres et lumière naturelle maîtrisable.",
      es: "Estudio amplio y luminoso con ventanales y luz natural controlable.",
    },
    category: "SIGNATURE",
    environmentPrompt:
      "high-end daylight photography studio",
    backgroundPrompt:
      "bright restrained studio interior with pale neutral surfaces and large architectural windows",
    floorPrompt:
      "clean pale matte studio floor",
    spatialPrompt:
      "spacious daylight studio with large windows, generous ceiling height and uncluttered shooting space",
    constraints: [
      "no domestic apartment styling",
      "no excessive furniture",
      "no outdoor scene",
      "no decorative clutter",
    ],
  },
] as const satisfies readonly MiravaSetPreset[]

export type MiravaSetPresetId =
  (typeof MIRAVA_SET_PRESETS)[number]["id"]

export function getMiravaSetPreset(
  id: string | null | undefined,
) {
  return MIRAVA_SET_PRESETS.find(
    (preset) => preset.id === id,
  )
}

export function isMiravaSetPresetId(
  value: unknown,
): value is MiravaSetPresetId {
  return (
    typeof value === "string" &&
    MIRAVA_SET_PRESETS.some(
      (preset) => preset.id === value,
    )
  )
}
