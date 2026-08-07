export type MiravaLightingPreset = Readonly<{
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
  setupPrompt: string
  subjectEffectPrompt: string
  shadowPrompt: string
  colorPrompt: string
  constraints: readonly string[]
}>

export const MIRAVA_LIGHTING_PRESETS = [
  {
    id: "soft-v1",
    version: 1,
    name: {
      fr: "Douce",
      es: "Suave",
    },
    description: {
      fr: "Lumière douce, enveloppante et naturelle.",
      es: "Luz suave, envolvente y natural.",
    },
    setupPrompt:
      "large diffused key light positioned close to the subject with broad soft fill",
    subjectEffectPrompt:
      "smooth flattering illumination with gentle facial modelling and controlled highlights",
    shadowPrompt:
      "very soft gradual shadows with low edge definition",
    colorPrompt:
      "neutral accurate color rendering with natural skin tones",
    constraints: [
      "no hard direct flash",
      "no dramatic rim lighting",
      "no strongly colored light",
    ],
  },
  {
    id: "clean-v1",
    version: 1,
    name: {
      fr: "Clean",
      es: "Clean",
    },
    description: {
      fr: "Précise, lumineuse et très propre.",
      es: "Precisa, luminosa y muy limpia.",
    },
    setupPrompt:
      "controlled commercial studio lighting with balanced key and fill illumination",
    subjectEffectPrompt:
      "bright precise subject rendering with clean dimensional separation and high material readability",
    shadowPrompt:
      "controlled subtle shadows with moderate softness",
    colorPrompt:
      "neutral white balance with highly accurate skin, fabric and product colors",
    constraints: [
      "no moody underexposure",
      "no dramatic color cast",
      "no uncontrolled hard shadows",
    ],
  },
  {
    id: "direct-flash-v1",
    version: 1,
    name: {
      fr: "Flash direct",
      es: "Flash directo",
    },
    description: {
      fr: "Flash frontal net, contrasté et éditorial.",
      es: "Flash frontal nítido, contrastado y editorial.",
    },
    setupPrompt:
      "direct frontal flash positioned close to the camera axis",
    subjectEffectPrompt:
      "bright crisp illumination with pronounced subject separation and immediate editorial presence",
    shadowPrompt:
      "defined compact shadows consistent with near-camera direct flash",
    colorPrompt:
      "neutral flash white balance with accurate skin and garment color",
    constraints: [
      "no golden-hour appearance",
      "no soft window-light appearance",
      "no cinematic rim-light substitution",
    ],
  },
  {
    id: "dramatic-v1",
    version: 1,
    name: {
      fr: "Dramatique",
      es: "Dramática",
    },
    description: {
      fr: "Contraste marqué, relief et ombres assumées.",
      es: "Contraste marcado, volumen y sombras definidas.",
    },
    setupPrompt:
      "directional fashion key light with restrained fill and deliberate contrast",
    subjectEffectPrompt:
      "sculpted dimensional illumination emphasizing silhouette, facial structure and garment form",
    shadowPrompt:
      "deep intentional shadows with controlled hard-to-medium edge definition",
    colorPrompt:
      "neutral-to-slightly-cool professional color rendering without stylized color contamination",
    constraints: [
      "no flat commercial lighting",
      "no uncontrolled crushed facial detail",
      "no colored nightclub lighting",
    ],
  },
] as const satisfies readonly MiravaLightingPreset[]

export type MiravaLightingPresetId =
  (typeof MIRAVA_LIGHTING_PRESETS)[number]["id"]

export function getMiravaLightingPreset(
  id: string | null | undefined,
) {
  return MIRAVA_LIGHTING_PRESETS.find(
    (preset) => preset.id === id,
  )
}

export function isMiravaLightingPresetId(
  value: unknown,
): value is MiravaLightingPresetId {
  return (
    typeof value === "string" &&
    MIRAVA_LIGHTING_PRESETS.some(
      (preset) => preset.id === value,
    )
  )
}
