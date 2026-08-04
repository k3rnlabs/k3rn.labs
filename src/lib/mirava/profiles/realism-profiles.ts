import type {
  SceneContextClassification,
  SceneProfile,
} from "../schemas/scene-context.schema"

export type AdaptiveRealismProfile = {
  cameraBehavior: string
  realismSignals: string[]
  materialFidelity: string
  negativeGuardrails: string[]
}

const AUTHENTIC_PHONE_CAMERA_BEHAVIOR =
  "AUTHENTIC SMARTPHONE CAMERA BEHAVIOR — Use plausible handheld phone-camera perspective, slightly imperfect but intentional framing, natural wide-angle perspective falloff, restrained computational sharpening, subtle sensor grain, realistic exposure variation and physically plausible highlight clipping. The result must feel captured rather than rendered."

const IDENTITY_SAFE_REALISM =
  "IDENTITY-SAFE IMPERFECTIONS — Preserve only natural skin characteristics, age cues, facial asymmetries, marks, scars, freckles, piercings, tattoos and body details that are supported by the validated identity photographs. Do not create new identity-defining details for the sake of realism."

const COMMON_REALISM_NEGATIVES = [
  "waxy skin",
  "plastic skin",
  "uniform repeated pore pattern",
  "artificial beauty-filter smoothing",
  "excessive micro-contrast",
  "over-sharpened skin",
  "fake HDR",
  "synthetic fabric texture",
  "plastic-looking materials",
  "physically impossible reflections",
  "invented freckles",
  "invented scars",
  "invented piercings",
  "invented tattoos",
  "invented tan lines",
  "invented skin marks",
  "invented age cues",
  "false sweat",
  "false wetness",
  "random dirt added for realism",
]

export const ADAPTIVE_REALISM_PROFILES: Record<
  SceneProfile,
  AdaptiveRealismProfile
> = {
  standard_fashion: {
    cameraBehavior:
      "EDITORIAL CAMERA REALISM — Use physically plausible lens depth, controlled photographic lighting, natural highlight roll-off, restrained professional retouching and subtle optical softness.",
    realismSignals: [
      "restrained natural pore detail",
      "subtle skin-tone variation",
      "individual hair strands",
      "realistic fabric weave",
      "natural garment tension",
    ],
    materialFidelity:
      "Preserve fabric weave, seams, hems, stitching, folds, garment weight and material-specific reflections without turning clothing into smooth synthetic surfaces.",
    negativeGuardrails: [
      "generic CGI fashion render",
      "airbrushed editorial skin",
    ],
  },

  swimwear_resort: {
    cameraBehavior:
      "RESORT CAMERA REALISM — Preserve direct or natural resort lighting, believable sun direction, realistic shadow density, restrained highlight clipping and authentic environmental reflections.",
    realismSignals: [
      "natural sunlit skin variation",
      "realistic shadow transitions",
      "opaque swimwear fabric tension",
      "environmental color reflection",
      "physically plausible water highlights when present",
    ],
    materialFidelity:
      "Keep swimwear opaque and constructionally accurate, with realistic elastic tension, seams, fabric compression and environmental reflections. Do not add wetness unless the approved scene explicitly requires it.",
    negativeGuardrails: [
      "invented wet skin",
      "transparent swimwear",
      "oil-like artificial skin shine",
      "exaggerated tanning",
    ],
  },

  fashion_intimates: {
    cameraBehavior:
      "CONTROLLED FASHION CAMERA REALISM — Use restrained editorial lighting, natural lens depth, smooth but non-plastic tonal transitions and realistic garment-to-skin interaction.",
    realismSignals: [
      "natural skin texture",
      "subtle tonal variation",
      "fine fabric weave",
      "realistic garment compression",
      "accurate metal hardware reflections",
    ],
    materialFidelity:
      "Preserve opaque fabric construction, stitching, elastic tension, hardware, folds and exact garment coverage.",
    negativeGuardrails: [
      "transparent fabric",
      "invented garment openings",
      "beauty-filter skin",
    ],
  },

  sports_fashion: {
    cameraBehavior:
      "SPORTS CAMERA REALISM — Use believable outdoor or venue lighting, physically plausible motion sharpness, natural perspective and campaign-level clarity without artificial HDR.",
    realismSignals: [
      "functional fabric stretch",
      "seam tension",
      "natural muscle definition without reshaping",
      "realistic environmental light",
      "subtle exertion sheen only when implied by the action",
    ],
    materialFidelity:
      "Preserve technical fabric weave, functional seams, garment stretch, footwear construction and equipment materials.",
    negativeGuardrails: [
      "invented sweat",
      "exaggerated muscle definition",
      "rubber-like skin",
      "plastic sports equipment",
    ],
  },

  beauty_closeup: {
    cameraBehavior:
      "BEAUTY MACRO REALISM — Use precise facial focus, realistic optical depth, natural catchlights, restrained beauty lighting and high detail without aggressive sharpening.",
    realismSignals: [
      "visible but restrained pore structure",
      "subtle natural tonal variation",
      "real eye moisture and catchlights",
      "natural lip texture",
      "fine facial hair where supported",
    ],
    materialFidelity:
      "Render makeup, eyelashes, eyebrows, lips, jewelry and individual hair strands with physically plausible texture and reflections.",
    negativeGuardrails: [
      "porcelain skin",
      "airbrushed pores",
      "repeated skin texture",
      "painted eyelashes",
      "synthetic iris detail",
      "over-defined lip texture",
    ],
  },

  nightlife_direct_flash: {
    cameraBehavior:
      "DIRECT-FLASH CAMERA REALISM — Preserve hard frontal flash, rapid shadow drop-off, bright near-camera highlights, dark ambient background exposure, subtle high-ISO sensor noise and realistic mixed-color contamination.",
    realismSignals: [
      "direct-flash skin highlights",
      "deep background exposure",
      "natural flash shadow edges",
      "subtle sensor noise",
      "realistic reflective accessories",
    ],
    materialFidelity:
      "Preserve metallic reflections, glossy materials, fabric response to flash and realistic separation from the dark background.",
    negativeGuardrails: [
      "softbox relighting",
      "cinematic fill light",
      "glowing skin",
      "noise-free artificial darkness",
    ],
  },

  mirror_selfie: {
    cameraBehavior: AUTHENTIC_PHONE_CAMERA_BEHAVIOR,
    realismSignals: [
      "realistic mirror perspective",
      "natural phone-camera distortion",
      "practical room-light reflections",
      "subtle sensor grain",
      "casual framing imperfections",
    ],
    materialFidelity:
      "Preserve mirror reflections, phone edges, room materials, clothing folds and practical-light reflections with coherent geometry.",
    negativeGuardrails: [
      "studio relighting",
      "impossible mirror geometry",
      "missing phone reflection",
      "perfect commercial framing",
    ],
  },

  luxury_editorial: {
    cameraBehavior:
      "LUXURY EDITORIAL CAMERA REALISM — Use sophisticated but physically plausible lighting, realistic lens depth, controlled highlight transitions, subtle optical softness and restrained high-end retouching.",
    realismSignals: [
      "natural skin microtexture",
      "precise fabric weave",
      "accurate jewelry reflections",
      "individual hair strands",
      "realistic architectural depth",
    ],
    materialFidelity:
      "Render luxury textiles, leather, metal, glass, stone and architectural surfaces according to their real optical and tactile properties.",
    negativeGuardrails: [
      "fake luxury gloss",
      "overprocessed skin",
      "plastic jewelry",
      "synthetic architecture",
    ],
  },

  lifestyle: {
    cameraBehavior: AUTHENTIC_PHONE_CAMERA_BEHAVIOR,
    realismSignals: [
      "natural handheld framing",
      "subtle exposure variation",
      "restrained skin texture",
      "loose individual hair strands",
      "authentic environmental reflections",
    ],
    materialFidelity:
      "Preserve everyday fabric texture, object wear, seams, condensation and material reflections only when supported by the approved scene.",
    negativeGuardrails: [
      "over-produced studio finish",
      "perfectly symmetrical framing",
      "invented dirt",
      "invented condensation",
    ],
  },

  travel_editorial: {
    cameraBehavior:
      "TRAVEL PHOTOGRAPHIC REALISM — Preserve authentic location depth, believable sunlight, atmospheric perspective, natural environmental contrast and realistic handheld or editorial lens behavior.",
    realismSignals: [
      "natural environmental depth",
      "realistic sunlight transitions",
      "subtle atmospheric haze",
      "plausible fabric movement",
      "location-specific material reflections",
    ],
    materialFidelity:
      "Preserve stone, sand, water, vegetation, architecture, clothing and accessories with location-appropriate texture and scale.",
    negativeGuardrails: [
      "fake travel backdrop",
      "synthetic sky",
      "excessive HDR landscape",
      "impossible environmental reflections",
    ],
  },

  other: {
    cameraBehavior:
      "PHOTOGRAPHIC CAMERA REALISM — Use physically plausible lighting, natural lens behavior, restrained image processing and coherent material response.",
    realismSignals: [
      "natural skin texture",
      "subtle tonal variation",
      "individual hair strands",
      "material-specific texture",
      "realistic reflections",
    ],
    materialFidelity:
      "Render each visible material according to its physical construction, surface texture, weight, compression and reflective properties.",
    negativeGuardrails: [
      "generic CGI rendering",
      "synthetic microtexture",
    ],
  },
}

const PHONE_GENRES = new Set<
  SceneContextClassification["photographicGenre"]
>([
  "phone_photo",
  "social_snapshot",
  "mirror_selfie",
])

export function getAdaptiveRealismProfile(
  sceneProfile: SceneProfile,
): AdaptiveRealismProfile {
  return (
    ADAPTIVE_REALISM_PROFILES[sceneProfile] ??
    ADAPTIVE_REALISM_PROFILES.standard_fashion
  )
}

export function buildAdaptiveRealismLayer(
  sceneContext: SceneContextClassification,
): string {
  const profile = getAdaptiveRealismProfile(
    sceneContext.sceneProfile,
  )

  const cameraBehavior = PHONE_GENRES.has(
    sceneContext.photographicGenre,
  )
    ? AUTHENTIC_PHONE_CAMERA_BEHAVIOR
    : profile.cameraBehavior

  const selectedSignals = profile.realismSignals
    .slice(0, 5)
    .join("; ")

  return [
    "ADAPTIVE PHOTOGRAPHIC REALISM — Render a physically plausible photograph rather than a polished CGI interpretation.",
    cameraBehavior,
    `SCENE-APPROPRIATE REALISM SIGNALS — Prioritize: ${selectedSignals}.`,
    `MATERIAL FIDELITY — ${profile.materialFidelity}`,
    IDENTITY_SAFE_REALISM,
  ].join(" ")
}

export function buildAdaptiveRealismNegativeGuardrails(
  sceneContext: SceneContextClassification,
): string {
  const profile = getAdaptiveRealismProfile(
    sceneContext.sceneProfile,
  )

  return [
    ...COMMON_REALISM_NEGATIVES,
    ...profile.negativeGuardrails,
  ].join(", ")
}
