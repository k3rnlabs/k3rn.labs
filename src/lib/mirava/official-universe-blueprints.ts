import type {
  MiravaStudioPresetId,
} from "@/lib/mirava/brand"
import {
  formatMiravaCreativeOptions,
} from "@/lib/mirava/creative-options"

export type MiravaOfficialUniverseBlueprint = {
  id: MiravaStudioPresetId
  version: string
  status: "published"
  name: string
  creativeDirectionSummary: string
  sceneProfile: string
  photographicGenre: string
  environmentContract: string
  wardrobeContract: string
  poseContract: string
  lightingContract: string
  cameraContract: string
  finishContract: string
  allowedVariations: string[]
  negativeGuardrails: string
}

const sharedNegativeGuardrails = [
  "minor or youthful appearance",
  "identity drift",
  "face substitution",
  "body substitution",
  "distorted anatomy",
  "extra or missing fingers",
  "fused limbs",
  "broken joints",
  "duplicated accessories",
  "plastic skin",
  "generic stock-photo expression",
  "incorrect fabric continuity",
  "floating objects",
  "visible logos",
  "watermarks",
  "captions",
  "text",
].join(", ")

export const MIRAVA_OFFICIAL_UNIVERSE_BLUEPRINTS:
  Record<
    MiravaStudioPresetId,
    MiravaOfficialUniverseBlueprint
  > = {
  "escapade-solaire": {
    id: "escapade-solaire",
    version: "1.0.0",
    status: "published",
    name: "Escapade solaire",
    creativeDirectionSummary:
      "A refined Mediterranean resort editorial built from warm mineral architecture, clear water, ivory styling and directional golden-hour light.",
    sceneProfile:
      "swimwear_resort",
    photographicGenre:
      "premium resort fashion campaign",
    environmentContract:
      "Use an elevated private Mediterranean terrace, pale limestone steps, an ivory mineral pool edge or a quiet rocky cove. Surfaces must feel sun-warmed, tactile and architecturally coherent. Water remains clear blue-green and secondary to the model.",
    wardrobeContract:
      "Use refined ivory resortwear, sculptural swimwear or relaxed warm-weather tailoring with restrained aged-gold jewelry. Preserve realistic fabric weight, coverage, seams and material response.",
    poseContract:
      "The posture is relaxed, elongated and quietly magnetic. Use natural weight distribution, confident shoulders and controlled movement rather than exaggerated glamour posing.",
    lightingContract:
      "Use low directional late-afternoon sunlight, warm highlights, long mineral shadows and a subtle golden rim. Keep facial features readable without flattening the sunlight.",
    cameraContract:
      "Create a premium vertical 4:5 editorial composition using a natural medium-format feel, restrained perspective and clear separation between the model and the architecture.",
    finishContract:
      "Use luminous natural skin, warm stone neutrals, restrained contrast, realistic highlights and a polished high-end travel campaign finish without orange oversaturation.",
    allowedVariations: [
      "private mineral terrace",
      "pale-stone pool",
      "rocky Mediterranean cove",
      "ivory resort tailoring",
      "sculptural swimwear",
      "golden backlight",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, generic tropical resort, artificial sunset, neon-blue water, excessive tan, cheap vacation aesthetic`,
  },

  "destination-iconique": {
    id: "destination-iconique",
    version: "1.0.0",
    status: "published",
    name: "Destination iconique",
    creativeDirectionSummary:
      "An international luxury travel editorial combining architectural rooftops, panoramic suites, precise tailoring and cinematic blue-hour depth.",
    sceneProfile:
      "travel_editorial",
    photographicGenre:
      "international luxury fashion campaign",
    environmentContract:
      "Use a panoramic hotel suite, architectural rooftop, refined lobby or private terrace overlooking an abstract metropolitan skyline. Architecture must remain premium, spacious and plausible.",
    wardrobeContract:
      "Use precise ivory, black or neutral tailoring, a structured travel dress or clean evening separates with restrained precious accessories. Avoid costume-like excess.",
    poseContract:
      "The model appears assured, composed and internationally sophisticated. Use controlled walking, poised standing or contemplative window-side gestures.",
    lightingContract:
      "Balance indigo blue-hour ambience with warm interior practical light or restrained architectural reflections. Preserve the face as the visual priority.",
    cameraContract:
      "Use a vertical 4:5 luxury campaign composition with architectural leading lines, moderate lens compression and clean negative space around the silhouette.",
    finishContract:
      "Use crisp tailoring detail, controlled cool-warm color separation, premium contrast and a cinematic but believable travel-magazine finish.",
    allowedVariations: [
      "rooftop skyline",
      "panoramic suite",
      "architectural lobby",
      "private hotel terrace",
      "ivory power suit",
      "black tailoring",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, tourist snapshot, generic airport, distorted skyline, excessive city lights, cheap hotel interior`,
  },

  "beauty-close-up": {
    id: "beauty-close-up",
    version: "1.0.0",
    status: "published",
    name: "Beauté rapprochée",
    creativeDirectionSummary:
      "A high-definition editorial beauty portrait centered on recognizable facial identity, honest skin texture, precise light and sculptural details.",
    sceneProfile:
      "beauty_closeup",
    photographicGenre:
      "luxury beauty campaign",
    environmentContract:
      "Use a controlled dark beauty studio, smoked mirror, ivory cyclorama or minimal wet-look set. The environment must never compete with the face.",
    wardrobeContract:
      "Keep visible wardrobe minimal and editorial. Use one restrained sculptural jewelry element, precise wet-look hair or a clean graphic beauty treatment.",
    poseContract:
      "Use a direct or subtly turned face, authentic gaze and micro-expression. Preserve exact facial geometry, age, eye shape, lips, jawline and natural asymmetry.",
    lightingContract:
      "Use a precise editorial flash, controlled frontal beauty light or a sculpted lateral source. Preserve pores, fine skin texture and dimensional facial planes.",
    cameraContract:
      "Use a very tight vertical beauty crop with exact eye focus, realistic lens rendering and no wide-angle facial distortion.",
    finishContract:
      "Use high micro-detail on eyes, lips, brows, jewelry and skin while avoiding over-sharpening, airbrushed texture or synthetic gloss.",
    allowedVariations: [
      "deep black background",
      "smoked mirror",
      "ivory cyclorama",
      "wet-look styling",
      "soft frontal flash",
      "sculpted side light",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, beauty-filter face, poreless skin, enlarged eyes, altered nose, altered lip volume, doll-like makeup`,
  },

  "editorial-mode": {
    id: "editorial-mode",
    version: "1.0.0",
    status: "published",
    name: "Éditorial mode",
    creativeDirectionSummary:
      "A sculptural high-fashion editorial driven by garment architecture, graphic shadows, controlled posture and monochromatic visual authority.",
    sceneProfile:
      "luxury_editorial",
    photographicGenre:
      "high-fashion magazine editorial",
    environmentContract:
      "Use a mineral gallery, brutalist stairwell, graphic cyclorama or architectural wall of light and shadow. Geometry must reinforce the silhouette.",
    wardrobeContract:
      "Use a sculptural gown, oversized tailoring or a monochromatic couture silhouette with credible construction, volume, seams and fabric tension.",
    poseContract:
      "Use a precise, imposed and controlled couture posture. The body may form strong graphic lines but must remain anatomically credible and balanced.",
    lightingContract:
      "Use sharply drawn geometric shadows, a lateral beam or controlled top light. Lighting should sculpt the clothing and architecture rather than merely brighten the frame.",
    cameraContract:
      "Use a deliberate vertical 4:5 magazine composition, measured perspective and strong visual hierarchy between silhouette, shadow and negative space.",
    finishContract:
      "Use restrained monochrome or deep tonal color, dense blacks, premium material detail and a polished editorial print finish.",
    allowedVariations: [
      "mineral gallery",
      "brutalist staircase",
      "graphic cyclorama",
      "architectural shadow wall",
      "sculptural gown",
      "oversized tailoring",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, costume fantasy, runway crowd, generic studio portrait, collapsed garment volume, random avant-garde accessories`,
  },

  "night-glamour": {
    id: "night-glamour",
    version: "1.0.0",
    status: "published",
    name: "Glamour nocturne",
    creativeDirectionSummary:
      "A confidential nocturnal fashion image using direct flash, black textures, private-hotel atmosphere and restrained spontaneous glamour.",
    sceneProfile:
      "nightlife_direct_flash",
    photographicGenre:
      "luxury nightlife fashion editorial",
    environmentContract:
      "Use a private hotel entrance, velvet-lined lobby, discreet arrival area or elegant night exterior. The background remains dark, selective and believable.",
    wardrobeContract:
      "Use refined black velvet, silk or evening tailoring with minimal metallic accents. Keep materials luxurious, continuous and realistically illuminated by flash.",
    poseContract:
      "Use an apparently spontaneous but controlled arrival gesture, a paused walk, an over-shoulder look or a quiet confident stance.",
    lightingContract:
      "Use direct editorial flash as the key source with rapid falloff, dark ambient surroundings and restrained warm practical lights.",
    cameraContract:
      "Use a vertical candid-editorial framing with slight immediacy, realistic flash perspective and a premium 35 mm nightlife character.",
    finishContract:
      "Use subtle grain, dense blacks, clear skin tone, crisp flash detail and no exaggerated paparazzi harshness.",
    allowedVariations: [
      "private hotel entrance",
      "velvet lobby",
      "night arrival",
      "black silk",
      "black velvet",
      "direct flash",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, nightclub crowd, intoxication cues, cheap party aesthetic, blown-out face, visible vehicle branding`,
  },

  "futuristic-muse": {
    id: "futuristic-muse",
    version: "1.0.0",
    status: "published",
    name: "Futuristic muse",
    creativeDirectionSummary:
      "A restrained future-luxury editorial using shallow water, prismatic reflection, liquid-metal tailoring and minimal neo-studio architecture.",
    sceneProfile:
      "luxury_editorial",
    photographicGenre:
      "future-luxury fashion campaign",
    environmentContract:
      "Use a minimal neo-studio, shallow reflective water, pale monolithic surfaces and controlled prismatic reflections. Keep the environment physical and photographic.",
    wardrobeContract:
      "Use liquid-metal tailoring, silver sculptural fabric or minimal reflective eveningwear with realistic seams and material behavior.",
    poseContract:
      "Use poised, calm and statuesque body language with elegant geometric lines. Avoid superhero, armor or fantasy character posing.",
    lightingContract:
      "Use cool controlled key light, soft reflected highlights and restrained spectral accents. Keep the face naturally exposed and recognizable.",
    cameraContract:
      "Use a clean vertical 4:5 campaign composition with measured symmetry, restrained low-angle options and realistic optical depth.",
    finishContract:
      "Use silver, pearl, graphite and subtle prism colors with crisp skin fidelity and premium photographic realism.",
    allowedVariations: [
      "shallow reflective water",
      "monolithic neo-studio",
      "prismatic wall reflection",
      "liquid-metal tailoring",
      "silver sculptural dress",
      "cool reflected light",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, science-fiction armor, robot body, holographic interface, fantasy environment, excessive neon, synthetic skin`,
  },

  "lifestyle-creatrice": {
    id: "lifestyle-creatrice",
    version: "1.0.0",
    status: "published",
    name: "Vie de créatrice",
    creativeDirectionSummary:
      "An elevated creator-lifestyle editorial combining luminous private interiors, authentic working gestures, refined casual styling and warm natural daylight.",
    sceneProfile:
      "lifestyle",
    photographicGenre:
      "premium creator lifestyle campaign",
    environmentContract:
      "Use a luminous private suite, refined cafe terrace, quiet creative desk or elegant window-side seating area. Props remain selective and functional.",
    wardrobeContract:
      "Use relaxed chic tailoring, soft knitwear, refined separates or a natural creator uniform with credible fabric drape and understated accessories.",
    poseContract:
      "Use authentic activity: writing in a leather notebook, reflecting by a window, holding coffee or moving naturally through the room. Avoid staged stock-photo gestures.",
    lightingContract:
      "Use warm authentic window light, soft directional shadows and realistic interior exposure. Keep the scene polished but lived-in.",
    cameraContract:
      "Use a vertical editorial lifestyle composition with candid timing, natural perspective and enough environmental context to tell a story.",
    finishContract:
      "Use warm neutrals, honest skin, subtle depth, tactile materials and a refined magazine-lifestyle finish.",
    allowedVariations: [
      "private luminous suite",
      "refined cafe terrace",
      "creative desk",
      "window-side reflection",
      "leather notebook",
      "coffee gesture",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, corporate stock photo, fake laptop typing, cluttered desk, exaggerated influencer pose, generic coworking office`,
  },

  "athleisure-chic": {
    id: "athleisure-chic",
    version: "1.0.0",
    status: "published",
    name: "Athleisure chic",
    creativeDirectionSummary:
      "A polished mirror-selfie editorial in a brushed stainless-steel elevator combining heather-purple activewear, shopping-fitness energy and realistic phone photography.",
    sceneProfile:
      "mirror_selfie",
    photographicGenre:
      "premium social mirror selfie",
    environmentContract:
      "Use a clean brushed stainless-steel elevator with coherent panels, subtle reflections and realistic ceiling light. Keep the space premium and uncluttered.",
    wardrobeContract:
      "Use a heather-purple fitted activewear romper or coordinated sculpting set with a black tote and restrained accessories. Preserve natural fit, seams and stretch.",
    poseContract:
      "Use an effortless athletic mirror-selfie stance with realistic phone grip, relaxed hips and natural shoulder alignment.",
    lightingContract:
      "Use soft elevator overhead light balanced by the phone-camera exposure. Preserve glowing but realistic skin and avoid artificial studio relighting.",
    cameraContract:
      "Render as a believable vertical smartphone mirror selfie with correct reflection logic, phone placement, hand anatomy and moderate lens perspective.",
    finishContract:
      "Use clean social-editorial sharpness, neutral stainless steel, soft violet fabric and realistic mobile-image texture.",
    allowedVariations: [
      "brushed steel elevator",
      "heather-purple romper",
      "coordinated activewear",
      "black tote",
      "front mirror stance",
      "three-quarter mirror stance",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, impossible mirror reflection, duplicated phone, warped elevator panels, gym equipment, exaggerated muscularity`,
  },

  "dubai-glamour": {
    id: "dubai-glamour",
    version: "1.0.0",
    status: "published",
    name: "Glamour Dubaï",
    creativeDirectionSummary:
      "An ultra-glamorous Dubai-night editorial using direct flash, black silk, gold details and monumental illuminated architecture.",
    sceneProfile:
      "nightlife_direct_flash",
    photographicGenre:
      "destination glamour campaign",
    environmentContract:
      "Use an elegant Dubai night exterior with the illuminated Burj Khalifa or recognizable luxury architecture placed plausibly in the distance.",
    wardrobeContract:
      "Use refined black silk styling, elegant gold jewelry and an optional silk headscarf with realistic folds, shine and continuity.",
    poseContract:
      "Use captivating but composed body language: a poised arrival, subtle turn, controlled walk or confident frontal stance.",
    lightingContract:
      "Use direct editorial flash on the model with warm gold city lights and deep night ambience behind her.",
    cameraContract:
      "Use a vertical 4:5 destination-glamour composition with clear subject priority and plausible architectural scale.",
    finishContract:
      "Use deep blacks, controlled gold highlights, crisp flash skin and premium night contrast without artificial HDR.",
    allowedVariations: [
      "Burj Khalifa exterior",
      "luxury architectural plaza",
      "black silk dress",
      "silk headscarf",
      "gold jewelry",
      "direct night flash",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, distorted landmark, fake skyline, excessive gold color cast, tourist crowd, visible luxury-brand logos`,
  },

  "sport-glow": {
    id: "sport-glow",
    version: "1.0.0",
    status: "published",
    name: "Tennis Club Glow",
    creativeDirectionSummary:
      "A sunlit tennis-club editorial combining sculptural sportswear, clay-court texture, athletic elegance and radiant directional daylight.",
    sceneProfile:
      "sports_fashion",
    photographicGenre:
      "premium tennis fashion campaign",
    environmentContract:
      "Use a well-maintained clay tennis court, coherent net, restrained club architecture and warm sunlit dust texture.",
    wardrobeContract:
      "Use a sculptural white-and-black mesh tennis dress or refined coordinated tennis styling with credible sports construction and coverage.",
    poseContract:
      "Use authentic racket handling, balanced athletic posture and elegant movement. The body should appear capable and natural rather than frozen.",
    lightingContract:
      "Use strong warm daylight, clean facial exposure, crisp racket and fabric detail and controlled sun flare.",
    cameraContract:
      "Use a dynamic vertical sports-fashion composition near the net or baseline with correct court geometry and realistic racket proportions.",
    finishContract:
      "Use warm clay, clean whites, natural skin glow and premium campaign sharpness without overprocessed fitness aesthetics.",
    allowedVariations: [
      "clay court net",
      "baseline position",
      "club-side bench",
      "white-black tennis dress",
      "racket in hand",
      "hard directional sun",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, malformed racket, incorrect tennis grip, warped court lines, generic gym scene, impossible athletic pose`,
  },

  "retro-lounge": {
    id: "retro-lounge",
    version: "1.0.0",
    status: "published",
    name: "Cinéma Rétro",
    creativeDirectionSummary:
      "A cinematic 1970s lounge editorial using a pastel hotel suite, black lace styling, vintage telephone props and warm nostalgic film light.",
    sceneProfile:
      "luxury_editorial",
    photographicGenre:
      "retro cinematic fashion editorial",
    environmentContract:
      "Use a refined pastel-pink 1970s hotel suite, velvet lounge, vintage bedside table or cinematic private room with coherent period details.",
    wardrobeContract:
      "Use a black lace top, tailored shorts and knee-high leather boots or a closely related refined retro silhouette. Keep lace, leather and hems realistic.",
    poseContract:
      "Use an alluring but controlled candid gesture with a rotary telephone, seated lounge posture or quiet movement through the suite.",
    lightingContract:
      "Use warm tungsten ambience, soft directional window spill or restrained filmic glow with natural facial readability.",
    cameraContract:
      "Use a vertical cinematic fashion frame with a subtle 35 mm perspective, deliberate crop and period-aware composition.",
    finishContract:
      "Use warm pastel color, soft highlight bloom, restrained grain and credible 1970s film character without heavy vintage filters.",
    allowedVariations: [
      "pastel hotel suite",
      "velvet lounge",
      "vintage bedside table",
      "rotary telephone",
      "black lace styling",
      "warm film light",
    ],
    negativeGuardrails:
      `${sharedNegativeGuardrails}, costume-party styling, excessive sepia, modern electronics, malformed telephone, cheap retro decor`,
  },
}

export function getMiravaOfficialUniverseBlueprint(
  id: string | null | undefined,
): MiravaOfficialUniverseBlueprint | undefined {
  if (!id) return undefined

  return MIRAVA_OFFICIAL_UNIVERSE_BLUEPRINTS[
    id as MiravaStudioPresetId
  ]
}

export function renderMiravaOfficialUniverseMasterPrompt(
  blueprint: MiravaOfficialUniverseBlueprint,
): string {
  return [
    "TRANSFER_MODE = FIDELITY",
    `OFFICIAL MIRAVA UNIVERSE — ${blueprint.name}`,
    `BLUEPRINT_ID = ${blueprint.id}@${blueprint.version}`,
    `CREATIVE DIRECTION — ${blueprint.creativeDirectionSummary}`,
    "IDENTITY CONTRACT — Use the uploaded identity photographs as the sole identity source. Preserve the consenting adult model’s exact recognizable face, natural age appearance, facial geometry, skin tone, hairline, body type and natural anatomical proportions. Do not invent, blend or substitute another identity.",
    `SCENE PROFILE — ${blueprint.sceneProfile}.`,
    `PHOTOGRAPHIC GENRE — ${blueprint.photographicGenre}.`,
    `ENVIRONMENT CONTRACT — ${blueprint.environmentContract}`,
    `WARDROBE CONTRACT — ${blueprint.wardrobeContract}`,
    `POSE CONTRACT — ${blueprint.poseContract}`,
    `LIGHTING CONTRACT — ${blueprint.lightingContract}`,
    `CAMERA AND COMPOSITION CONTRACT — ${blueprint.cameraContract}`,
    `COLOR AND FINISH CONTRACT — ${blueprint.finishContract}`,
    `AUTHORIZED VARIATION SPACE — ${blueprint.allowedVariations.join("; ")}.`,
    "ANATOMY AND MATERIAL INTEGRITY — Preserve coherent hands, fingers, limbs, joints, footwear, jewelry, garment seams, reflections, props and architectural geometry. Maintain realistic contact, gravity, occlusion and fabric continuity.",
    `NEGATIVE GUARDRAILS — ${blueprint.negativeGuardrails}.`,
    "FINAL OUTPUT — Create one realistic premium vertical fashion photograph. The result must unmistakably belong to this published MIRAVA universe while keeping the uploaded model as the sole recognizable person.",
  ].join("\n\n")
}

export function buildMiravaOfficialUniversePrimaryPrompt(
  args: {
    masterPrompt: string | null
    creativeOptions: unknown
  },
): string {
  const preferences =
    formatMiravaCreativeOptions(
      args.creativeOptions,
    )

  return [
    args.masterPrompt?.trim() ?? "",
    preferences,
    "OFFICIAL UNIVERSE PRECEDENCE — The published MIRAVA blueprint remains the visual authority. Apply client-approved choices only inside the authorized variation space. Preserve the universe’s identity, photographic language, material realism, lighting logic and premium visual hierarchy.",
  ]
    .filter(Boolean)
    .join("\n\n")
}
