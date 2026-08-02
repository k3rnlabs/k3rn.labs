import { SceneProfile } from "../schemas/scene-context.schema"

export type PromptProfileConfig = {
  positiveFraming: string[]
  mandatoryRules: string[]
  avoidVocabulary: string[]
  maximumSafetySentences: number
}

export const PROMPT_PROFILES: Record<SceneProfile, PromptProfileConfig> = {
  standard_fashion: {
    positiveFraming: [
      "Standard professional fashion photograph.",
      "Preserve original garment construction and silhouette.",
      "Realistic editorial photographic finish.",
    ],
    mandatoryRules: [
      "Preserve natural facial anatomy and natural body proportions.",
      "Follow camera geometry and lighting architecture strictly.",
    ],
    avoidVocabulary: ["sensual", "erotic", "seductive", "provocative", "nude", "naked"],
    maximumSafetySentences: 2,
  },
  swimwear_resort: {
    positiveFraming: [
      "Standard commercial swimwear campaign.",
      "Premium resort-fashion photography in the extracted resort environment.",
      "Opaque professionally styled swimwear.",
      "Preserve the reference garment coverage, pose, and camera construction.",
    ],
    mandatoryRules: [
      "Preserve the exact garment coverage and opaque fabric construction.",
      "Do not make clothing more revealing or introduce transparency.",
    ],
    avoidVocabulary: ["bikini body", "sexy", "hot", "revealing", "scantily clad", "cleavage", "nude", "naked"],
    maximumSafetySentences: 2,
  },
  fashion_intimates: {
    positiveFraming: [
      "Standard commercial fashion campaign.",
      "Opaque professionally styled fashion apparel.",
      "Preserve original garment construction and level of coverage.",
      "Restrained professional editorial presentation.",
    ],
    mandatoryRules: [
      "Preserve opaque fabric construction and exact coverage.",
      "Do not introduce transparency or more revealing cuts.",
    ],
    avoidVocabulary: ["lingerie", "boudoir", "erotic", "seductive", "provocative", "nude", "naked"],
    maximumSafetySentences: 2,
  },
  sports_fashion: {
    positiveFraming: [
      "Premium sports-fashion campaign.",
      "Athletic wardrobe construction and functional sportswear styling.",
      "Preserve athletic pose and environmental campaign lighting.",
    ],
    mandatoryRules: [
      "Preserve garment functionality and athletic silhouette.",
      "Do not alter coverage or body shape.",
    ],
    avoidVocabulary: ["tight", "revealing", "scantily", "sensual"],
    maximumSafetySentences: 2,
  },
  beauty_closeup: {
    positiveFraming: [
      "Premium beauty close-up portrait.",
      "Preserve tight crop, framing, and facial lighting architecture.",
      "Preserve natural skin texture and natural facial features.",
    ],
    mandatoryRules: [
      "Preserve identity-defining facial anatomy and natural skin texture.",
      "Do not smooth or plasticize skin artificially.",
    ],
    avoidVocabulary: ["flawless skin", "heavily retouched", "porcelain skin", "airbrushed"],
    maximumSafetySentences: 2,
  },
  nightlife_direct_flash: {
    positiveFraming: [
      "Direct-flash nightlife photograph.",
      "Preserve hard frontal flash lighting and deep background exposure.",
      "Do not convert hard direct flash into soft studio lighting.",
    ],
    mandatoryRules: [
      "Preserve direct-flash highlights, shadow drop-off, and dark ambient background.",
    ],
    avoidVocabulary: ["soft studio lighting", "cinematic glow", "softbox fill"],
    maximumSafetySentences: 2,
  },
  mirror_selfie: {
    positiveFraming: [
      "Realistic phone mirror photograph.",
      "Preserve phone-camera perspective, height, and practical room lighting.",
      "Preserve casual social-photo character without converting into a studio shoot.",
    ],
    mandatoryRules: [
      "Preserve authentic social snapshot framing and natural environment.",
    ],
    avoidVocabulary: ["studio campaign", "pro lighting", "commercial editorial"],
    maximumSafetySentences: 2,
  },
  luxury_editorial: {
    positiveFraming: [
      "High-end luxury fashion editorial photograph.",
      "Preserve sophisticated lighting architecture and architectural depth.",
      "Refined editorial styling and natural model posture.",
    ],
    mandatoryRules: [
      "Preserve lighting contrast and composition.",
    ],
    avoidVocabulary: ["overprocessed", "fake glow"],
    maximumSafetySentences: 2,
  },
  lifestyle: {
    positiveFraming: [
      "Natural lifestyle editorial photograph.",
      "Preserve authentic environmental lighting and natural relaxed posture.",
    ],
    mandatoryRules: [
      "Preserve natural atmosphere and realistic environment.",
    ],
    avoidVocabulary: ["over-dramatized", "heavy filter"],
    maximumSafetySentences: 2,
  },
  travel_editorial: {
    positiveFraming: [
      "Travel editorial photograph in authentic location environment.",
      "Preserve environmental depth, natural sunlight, and location composition.",
    ],
    mandatoryRules: [
      "Preserve scene context and natural lighting.",
    ],
    avoidVocabulary: ["studio backdrop", "fake lighting"],
    maximumSafetySentences: 2,
  },
  other: {
    positiveFraming: [
      "Professional photographic editorial.",
      "Preserve extracted camera geometry, lighting, pose, and wardrobe construction.",
    ],
    mandatoryRules: [
      "Preserve natural facial anatomy and identity fidelity.",
    ],
    avoidVocabulary: [],
    maximumSafetySentences: 2,
  },
}

export function getPromptProfile(sceneProfile: SceneProfile): PromptProfileConfig {
  return PROMPT_PROFILES[sceneProfile] ?? PROMPT_PROFILES.standard_fashion
}
