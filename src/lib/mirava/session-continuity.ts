import { z } from "zod"

export const miravaShotIntentSchema =
  z.enum([
    "pose",
    "framing",
    "sub_location",
    "candid",
  ])

export type MiravaShotIntent =
  z.infer<
    typeof miravaShotIntentSchema
  >

const intentContracts:
  Record<
    MiravaShotIntent,
    string[]
  > = {
    pose: [
      "POSE VARIATION — Create a clearly distinct editorial pose.",
      "Change body orientation, weight distribution, arm and hand placement, head angle, gaze and facial expression.",
      "Keep the same approved camera language and remain inside the same believable photographic moment.",
    ],
    framing: [
      "FRAMING VARIATION — Photograph the same session from a clearly different but coherent camera position.",
      "Change camera height, distance, crop or lateral angle without redesigning the subject, styling, environment or lighting.",
      "Keep body language compatible with the exact same moment and location.",
    ],
    sub_location: [
      "SUB-LOCATION VARIATION — Move the subject to another believable position inside the exact same room or architectural setting.",
      "Preserve the same architecture, furniture collection, materials, objects, time of day and lighting family.",
      "Do not invent a new room, building, destination or decorative style.",
    ],
    candid: [
      "CANDID VARIATION — Capture a natural in-between moment from the exact same photographic session.",
      "Use a restrained, believable action that fits the approved setting and wardrobe.",
      "Avoid theatrical acting, a new narrative, a new activity requiring new props, or a generic lifestyle substitution.",
    ],
  }

export function buildMiravaSessionContinuationPrompt(
  args: {
    masterPrompt: string
    negativePrompt?: string
    intent: MiravaShotIntent
    shotIndex: number
    hasContinuityImage: boolean
  },
): {
  positivePrompt: string
  negativeGuardrails: string
} {
  const continuityImageRole =
    args.hasContinuityImage
      ? [
          "IMAGE ROLE CONTRACT — The first attached image is the previous approved result from this session. Use it only as the continuity authority for wardrobe, jewelry, accessories, makeup, hairstyle arrangement, environment, furniture, materials, lighting and photographic finish.",
          "All remaining attached images are identity references. They are the sole authority for the consenting adult subject’s face, identity, natural age, skin tone and anatomy.",
          "Do not copy facial identity from the continuity image when it conflicts with the identity references.",
        ]
      : [
          "TEXT-ONLY CONTINUITY FALLBACK — The previous result is not attached to this retry.",
          "Reconstruct continuity exclusively from the locked session contract and the original approved art direction.",
          "The attached identity references remain the sole authority for the consenting adult subject’s identity.",
        ]

  const continuityLock = [
    `SESSION CONTINUITY LOCK — This is photograph ${Math.max(2, args.shotIndex + 1)} from the exact same real photographic session.`,
    "Preserve exactly the same wardrobe construction, colors, materials, fit, layering and approved coverage.",
    "Preserve the same jewelry, accessories, makeup, nail styling and hairstyle logic.",
    "Preserve the same architectural environment, furniture, material system, prop family and visual era.",
    "Preserve the same time of day, lighting family, exposure balance, shadow logic, palette, lens character and photographic finish.",
    "Do not redesign, replace, simplify, modernize or reinterpret any locked element.",
  ]

  const commercialSafety = [
    "COMMERCIAL FASHION SAFETY — Keep the exact approved garment coverage.",
    "Do not undress the subject, pull or lower garments, increase transparency, expose additional intimate areas, or intensify the image toward erotic content.",
    "Do not introduce bedroom-coded posing, explicit gestures, garment-touching gestures, spread-leg posing or an erotic facial expression.",
    "Keep the result inside premium commercial fashion, beauty or lingerie campaign language as applicable to the approved session.",
  ]

  const negativeGuardrails = [
    args.negativePrompt?.trim(),
    "identity drift",
    "different outfit",
    "different jewelry",
    "different hairstyle",
    "different room",
    "different architecture",
    "different time of day",
    "generic replacement background",
    "increased nudity",
    "increased transparency",
    "garment pulling",
    "erotic escalation",
    "duplicate pose",
  ]
    .filter(Boolean)
    .join(", ")

  return {
    positivePrompt: [
      args.masterPrompt.trim(),
      ...continuityImageRole,
      ...continuityLock,
      ...intentContracts[
        args.intent
      ],
      ...commercialSafety,
      "FINAL SESSION CHECK — The result must be instantly recognizable as another photograph from the same shoot, while still being a genuinely distinct frame.",
      negativeGuardrails
        ? `Avoid: ${negativeGuardrails}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    negativeGuardrails,
  }
}
