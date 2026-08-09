export type MiravaCoverageSafetyMode =
  | "standard"
  | "conservative"

export type MiravaCampaignSafetyMode =
  | "standard"
  | "conservative"

export type MiravaCoverageSafetyResult = {
  prompt: string
  adapted: boolean
  riskScore: number
  reasons: string[]
}

export type MiravaCampaignRiskResult = {
  requiresCampaignSafeTransfer: boolean
  riskScore: number
  reasons: string[]
}

type RiskSignal = {
  id: string
  score: number
  pattern: RegExp
}

const AVOID_SEPARATOR = "\n\nAvoid:"

const RISK_SIGNALS: RiskSignal[] = [
  {
    id: "boudoir-framing",
    score: 3,
    pattern:
      /\b(?:adult\s+)?boudoir(?:-fashion)?\b/i,
  },
  {
    id: "explicit-intimate-exposure",
    score: 5,
    pattern:
      /\b(?:exposed|bare|visible)\s+(?:intimate anatomy|buttocks?|seat cleavage|genitals?|breasts?)\b/i,
  },
  {
    id: "transparent-intimate-garment",
    score: 2,
    pattern:
      /\b(?:sheer|transparent|semi-transparent)\b[^.!?\n]{0,140}\b(?:robe|dress|skirt|fabric|garment|skin|pelvis|seat|hips?)\b/i,
  },
  {
    id: "lifted-or-open-garment",
    score: 4,
    pattern:
      /(?:\b(?:robe|dress|skirt|fabric|garment|towel)\b[^.!?\n]{0,140}\b(?:lifted|lifting|raised|pulled up|gathered upward|open below the waist|opened around the pelvis)\b|\b(?:lifted|lifting|raised|pulled up|gathered upward)\b[^.!?\n]{0,140}\b(?:robe|dress|skirt|fabric|garment|towel)\b)/i,
  },
  {
    id: "rear-exposure-emphasis",
    score: 3,
    pattern:
      /\b(?:hips?|seat|rear)\b[^.!?\n]{0,120}\b(?:projected backward|sharply resolved|exposed|uncovered|primary visual emphasis)\b/i,
  },
  {
    id: "sexualized-framing",
    score: 3,
    pattern:
      /\b(?:erotic|seductive|sexualized|explicitly sexual)\b/i,
  },
]

const COMMERCIAL_INTIMATE_CATEGORY =
  /\b(?:lingerie|intimate apparel|underwear|bra|bralette|briefs?|panties|bodysuit|corset|swimwear|bikini|swimsuit|maillot)\b/i

const CAMPAIGN_RISK_SIGNALS: RiskSignal[] = [
  {
    id: "campaign-safe-marker",
    score: 10,
    pattern:
      /\bTRANSFER_MODE\s*=\s*CAMPAIGN_SAFE_TRANSFER\b/i,
  },
  {
    id: "adult-publication-aesthetic",
    score: 10,
    pattern:
      /\b(?:penthouse|playboy|adult magazine|adult-publication|pornographic|pornography|xxx)\b/i,
  },
  {
    id: "transparent-intimate-apparel",
    score: 4,
    pattern:
      /(?:\b(?:sheer|transparent|semi-transparent|see-through|unlined mesh|unlined lace)\b[^.!?\n]{0,180}\b(?:lingerie|bra|cups?|bodysuit|briefs?|panties|thong|string|g-string|bust|chest|pelvis|hips?)\b|\b(?:lingerie|bra|cups?|bodysuit|briefs?|panties|thong|string|g-string)\b[^.!?\n]{0,180}\b(?:sheer|transparent|semi-transparent|see-through|unlined mesh|unlined lace)\b)/i,
  },
  {
    id: "minimal-lower-garment",
    score: 3,
    pattern:
      /\b(?:thong|g-string|string bottom|string brief|micro brief|micro bikini|minimal coverage|narrow front panel|ultra high-cut bottom)\b/i,
  },
  {
    id: "chest-pelvis-framing",
    score: 4,
    pattern:
      /(?:\b(?:chest|bust|breast|cleavage)\s*[-–—to]+\s*(?:pelvis|hips?|crotch)\b|\b(?:frontal|front-facing|straight-on)\b[^.!?\n]{0,180}\b(?:chest|bust|breasts?|cleavage)\b[^.!?\n]{0,180}\b(?:pelvis|hips?|crotch)\b|\b(?:crop|framing|composition)\b[^.!?\n]{0,180}\b(?:chest|bust|breasts?)\b[^.!?\n]{0,180}\b(?:pelvis|hips?|crotch)\b)/i,
  },
  {
    id: "intimate-region-visual-priority",
    score: 3,
    pattern:
      /\b(?:primary visual emphasis|visual focus|center(?:ed)?|dominant emphasis)\b[^.!?\n]{0,140}\b(?:chest|bust|breasts?|cleavage|pelvis|hips?|crotch|lower garment)\b/i,
  },
  {
    id: "hand-to-lips-gesture",
    score: 2,
    pattern:
      /\b(?:finger|fingertip|hand)\b[^.!?\n]{0,100}\b(?:on|against|touching|resting on|near)\b[^.!?\n]{0,40}\b(?:lips?|mouth)\b/i,
  },
  {
    id: "projected-pelvis-pose",
    score: 2,
    pattern:
      /\b(?:arched back|back (?:is )?arched|pelvis (?:is )?projected(?: toward the camera)?|hips? (?:are )?projected(?: toward the camera)?|hips? pushed|pelvis pushed|pronounced hip thrust)\b/i,
  },
  {
    id: "sexualized-commercial-language",
    score: 2,
    pattern:
      /\b(?:erotic|seductive|provocative|sexually charged|explicitly sexual|boudoir)\b/i,
  },
  {
    id: "revealing-exposure-language",
    score: 5,
    pattern:
      /\b(?:exposed|visible|bare)\b[^.!?\n]{0,80}\b(?:intimate anatomy|genitals?|nipples?|buttocks?|seat cleavage)\b/i,
  },
]

const STANDARD_COVERAGE_INVARIANT = [
  "COVERAGE-SAFE COMMERCIAL EDITORIAL ADAPTATION — Preserve the approved environment, camera geometry, body orientation, hand anchors, gaze, lighting architecture, exposure relationship, palette, and photographic finish while adapting only the garment construction required for reliable coverage.",
  "Use a fully opaque, high-waisted neutral underlayer covering the pelvis, seat, and upper thighs beneath any lace, mesh, robe, dress, skirt, or translucent outer layer.",
  "Keep all rear garment panels continuously draped across the seat; fabric may be arranged at the side but must not be lifted away from covered regions.",
  "Maintain complete opaque coverage of all private areas and do not make body exposure the primary visual emphasis.",
].join(" ")

const CONSERVATIVE_COVERAGE_INVARIANT = [
  STANDARD_COVERAGE_INVARIANT,
  "CONSERVATIVE RETRY — Replace any ambiguous revealing construction with fully opaque editorial styling.",
  "Keep the robe, dress, skirt, towel, or outer garment closed and continuously covering the pelvis, seat, and upper thighs.",
  "Use only neutral commercial fashion language and omit sexualized genre labels.",
].join(" ")

function splitPositiveAndNegative(prompt: string): {
  positive: string
  negative: string
} {
  const separatorIndex =
    prompt.indexOf(AVOID_SEPARATOR)

  if (separatorIndex < 0) {
    return {
      positive: prompt,
      negative: "",
    }
  }

  return {
    positive:
      prompt.slice(0, separatorIndex),
    negative:
      prompt.slice(separatorIndex),
  }
}

function detectCoverageRisk(
  positivePrompt: string,
): {
  riskScore: number
  reasons: string[]
} {
  const reasons: string[] = []
  let riskScore = 0

  for (const signal of RISK_SIGNALS) {
    if (!signal.pattern.test(positivePrompt)) {
      continue
    }

    reasons.push(signal.id)
    riskScore += signal.score
  }

  return {
    riskScore,
    reasons,
  }
}

export function detectMiravaCampaignRisk(
  prompt: string,
): MiravaCampaignRiskResult {
  const { positive } =
    splitPositiveAndNegative(prompt)

  const reasons: string[] = []
  let riskScore = 0

  for (const signal of CAMPAIGN_RISK_SIGNALS) {
    if (!signal.pattern.test(positive)) {
      continue
    }

    reasons.push(signal.id)
    riskScore += signal.score
  }

  const hasCommercialIntimateCategory =
    COMMERCIAL_INTIMATE_CATEGORY.test(
      positive,
    )

  const hasAutomaticMarker =
    reasons.includes(
      "campaign-safe-marker",
    )

  const hasAdultPublicationSignal =
    reasons.includes(
      "adult-publication-aesthetic",
    )

  return {
    requiresCampaignSafeTransfer:
      hasAutomaticMarker ||
      hasAdultPublicationSignal ||
      (
        hasCommercialIntimateCategory &&
        riskScore >= 5
      ) ||
      riskScore >= 8,
    riskScore,
    reasons,
  }
}

function sanitizeNegativeGuardrails(
  source: string,
): string {
  return source
    .replace(
      /\bexplicit nudity\b/gi,
      "insufficient garment coverage",
    )
    .replace(
      /\bsexual content\b/gi,
      "non-editorial revealing content",
    )
    .replace(
      /\berotic intensification\b/gi,
      "revealing pose intensification",
    )
    .replace(
      /\b(?:exposed buttocks?|visible seat cleavage)\b/gi,
      "insufficient rear garment coverage",
    )
    .replace(
      /\btransparent fabric over intimate regions\b/gi,
      "insufficient opaque garment coverage",
    )
    .replace(
      /\bboudoir(?:-fashion)?\b/gi,
      "non-commercial styling",
    )
    /*
     * A raised leg or split-like leg geometry is not
     * itself a coverage failure. Do not let the safety
     * layer silently negate the reference pose.
     */
    .replace(
      /\b(?:extreme\s+)?leg raise\b/gi,
      "",
    )
    .replace(
      /\braised leg\b/gi,
      "",
    )
    .replace(
      /\bsplit pose\b/gi,
      "",
    )
    .replace(
      /\s*,\s*,+/g,
      ", ",
    )
    .replace(
      /,\s*(?=\n|$)/g,
      "",
    )
    .replace(
      /[ \t]{2,}/g,
      " ",
    )
}

function rewriteCoverageConstruction(
  source: string,
  mode: MiravaCoverageSafetyMode,
): string {
  let prompt = source

  const replacements:
    Array<[RegExp, string]> = [
      [
        /\b(?:penthouse|playboy|adult magazine|adult-publication|pornographic|pornography|xxx)\b/gi,
        "premium retail campaign",
      ],
      [
        /\bintimate adult boudoir-fashion style\b/gi,
        "intimate editorial fashion style",
      ],
      [
        /\badult boudoir-fashion\b/gi,
        "intimate editorial fashion",
      ],
      [
        /\bboudoir-fashion\b/gi,
        "editorial fashion",
      ],
      [
        /\bboudoir\b/gi,
        "intimate editorial fashion",
      ],
      [
        /\berotic\b/gi,
        "editorial",
      ],
      [
        /\bseductive\b/gi,
        "composed",
      ],
      [
        /\bprovocative\b/gi,
        "striking",
      ],
      [
        /\bsensual\b/gi,
        "expressive",
      ],

      /*
       * Garment-only adaptation.
       * Do not touch architectural transparency such
       * as windows or glass balustrades.
       */
      [
        /\b(?:(?:very\s+)?narrow\s+)?(?:thong|g-string|string bottom|string brief|micro brief|micro bikini|very narrow front panel|narrow front panel|ultra high-cut bottom)(?:\s+(?:bottom|lower construction))?\b/gi,
        "high-waisted full-coverage brief",
      ],
      [
        /\b(?:sheer|transparent|semi-transparent|see-through|unlined)\s+(lace|mesh)\s+(lingerie|bodysuit|bra|bralette|cups?|bodice|briefs?|panties|lower garment)\b/gi,
        "opaque-backed decorative $1 over fully lined $2",
      ],
      [
        /\b(?:sheer|transparent|semi-transparent|see-through|unlined)\s+(lingerie|bodysuit|bra|bralette|cups?|bodice|briefs?|panties|lower garment)\b/gi,
        "fully opaque lined $1",
      ],
      [
        /\bunlined\s+(?:mesh|lace)\s+(cups?|bodice|briefs?|panties|lower garment)\b/gi,
        "opaque-backed decorative mesh over fully lined $1",
      ],
      [
        /\b(?:long,?\s+)?sheer white lace kimono robe\b/gi,
        "long white embroidered lace kimono robe layered over a fully opaque high-waisted neutral underlayer",
      ],
      [
        /\bsheer white lace\b/gi,
        "white embroidered lace layered over an opaque underlayer",
      ],
      [
        /\bsheer lace\b/gi,
        "embroidered lace layered over an opaque underlayer",
      ],
      [
        /\bsemi-transparent where it overlays skin\b/gi,
        "layered over a fully opaque high-waisted underlayer",
      ],
      [
        /\btransparent or semi-transparent fabric over intimate regions\b/gi,
        "opaque layered fabric with reliable editorial coverage",
      ],
      [
        /\bthe robe is gathered upward at the back[^.]*\./gi,
        "The robe remains continuously draped across the seat and upper thighs, with one side panel lightly arranged by the hand without lifting the covered rear panels.",
      ],
      [
        /\bgathering and lifting the robe fabric\b/gi,
        "arranging the robe fabric at the side without lifting it from the covered regions",
      ],
      [
        /\bgather(?:ed|ing)?\s+(?:the\s+)?(?:back|rear)\s+of\s+(?:the\s+)?(?:robe|dress|skirt|fabric|garment)\b/gi,
        "arranging the side panel of the garment while preserving full rear coverage",
      ],
      [
        /\bopen below the waist\b/gi,
        "closed and continuously draped below the waist",
      ],
      [
        /\bopen beneath the waist\b/gi,
        "closed and continuously draped beneath the waist",
      ],
      [
        /\brear-facing garment coverage\b/gi,
        "rear-facing garment construction with full seat coverage",
      ],
      [
        /\bwithout increasing exposure\b/gi,
        "with full opaque coverage of the pelvis, seat, and upper thighs",
      ],
      [
        /\bexposed buttocks?\b/gi,
        "fully covered seat",
      ],
      [
        /\bvisible seat cleavage\b/gi,
        "continuous opaque seat coverage",
      ],

      /*
       * Gesture adaptation modifies only the hand,
       * not the rest of the pose.
       */
      [
        /\b(?:one\s+)?(?:finger|fingertip|hand)\b[^.!?\n]{0,100}\b(?:on|against|touching|resting on|near)\b[^.!?\n]{0,40}\b(?:lips?|mouth)\b/gi,
        "The same arm path is preserved, with only the hand repositioned neutrally away from the mouth",
      ],

      /*
       * Pelvis-led risk: preserve all other pose
       * geometry, especially leg height and anchors.
       */
      [
        /\bhips? sharply resolved and subtly projected backward\b/gi,
        "garment construction sharply resolved with neutral pelvis alignment while preserving the original leg positions and pose skeleton",
      ],
      [
        /\bhips? subtly projected backward\b/gi,
        "neutral pelvis alignment while preserving the original leg positions and pose skeleton",
      ],
      [
        /\bhips? sharply resolved\b/gi,
        "garment construction and pose sharply resolved",
      ],
      [
        /\b(?:arched back|back (?:is )?arched)\b/gi,
        "natural spinal alignment while preserving the original limb positions and pose silhouette",
      ],
      [
        /\b(?:pelvis (?:is )?projected(?: toward the camera)?|hips? (?:are )?projected(?: toward the camera)?|hips? pushed|pelvis pushed|pronounced hip thrust)\b/gi,
        "neutral pelvis alignment while preserving the original leg positions, weight distribution, and overall pose skeleton",
      ],

      /*
       * Crop/hierarchy adaptation preserves camera
       * geometry and changes only the emphasis.
       */
      [
        /\b(?:frontal\s+)?chest[-–— ]to[-–— ]pelvis framing\b/gi,
        "the original camera geometry with minimally rebalanced framing so no intimate region dominates",
      ],
      [
        /\b(?:the\s+)?(?:chest|bust|pelvis|hips?|lower garment)(?:\s+and\s+(?:the\s+)?(?:chest|bust|pelvis|hips?|lower garment))?\s+(?:are|is)\s+the\s+dominant visual emphasis\b/gi,
        "the face, garment silhouette, pose, and environment share balanced visual emphasis",
      ],
    ]

  for (
    const [pattern, replacement]
    of replacements
  ) {
    prompt = prompt.replace(
      pattern,
      replacement,
    )
  }

  if (mode === "conservative") {
    /*
     * Conservative retry increases garment coverage,
     * but still must not rewrite unrelated words like
     * "transparent glass" or "raised leg".
     */
    prompt = prompt
      .replace(
        /\btransparent cups?\b/gi,
        "fully lined opaque cups",
      )
      .replace(
        /\bunlined (?:mesh|lace) (?:cups?|bodice)\b/gi,
        "opaque-backed decorative mesh over a fully lined bodice",
      )
  }

  return prompt
}

function extractSafeReferenceDirection(
  prompt: string,
  mode: MiravaCampaignSafetyMode,
): string {
  const { positive } =
    splitPositiveAndNegative(prompt)

  const source =
    positive
      .replace(
        /\bTRANSFER_MODE\s*=\s*(?:FIDELITY|POLISHED|CAMPAIGN_SAFE_TRANSFER)\b/gi,
        "",
      )
      .trim()

  const rewritten =
    rewriteCoverageConstruction(
      source,
      mode,
    ).trim()

  if (rewritten) {
    return rewritten
  }

  return "Preserve the approved reference direction, changing only the localized element that requires safer commercial coverage."
}

export function buildMiravaCampaignSafeTransferPrompt(
  prompt: string,
  mode: MiravaCampaignSafetyMode =
    "standard",
  continuation: {
    intents?: readonly string[]
    customInstruction?: string
  } = {},
): string {
  const risk =
    detectMiravaCampaignRisk(
      prompt,
    )

  const continuationIntents =
    new Set(
      continuation.intents ?? [],
    )

  const poseUnlocked =
    continuationIntents.has("pose") ||
    continuationIntents.has("candid")

  const framingUnlocked =
    continuationIntents.has("framing")

  const subLocationUnlocked =
    continuationIntents.has(
      "sub_location",
    )

  const customInstruction =
    continuation.customInstruction
      ?.trim() ||
    ""

  const preservedDirection =
    extractSafeReferenceDirection(
      prompt,
      mode,
    )

  const {
    negative,
  } =
    splitPositiveAndNegative(
      prompt,
    )

  const wardrobe =
    mode === "conservative"
      ? "WARDROBE SAFETY — Preserve the reference garment category, silhouette, sleeves, neckline, hosiery, footwear, accessories, and non-risky material character. Where intimate apparel is present, use a premium fully opaque black lingerie set with structured fully lined opaque cups and a high-waisted full-coverage brief with complete front and rear panels. Lace or mesh may remain as decorative texture when reliably backed across covered zones."
      : "WARDROBE SAFETY — Preserve the reference garment category, silhouette, sleeves, neckline, hosiery, footwear, accessories, and non-risky material character. Adapt only unsafe coverage construction. Where intimate apparel is present, use structured fully lined opaque cups and a high-waisted brief with complete front and rear panels. Lace or mesh may remain when opaque-backed across covered zones."

  const pelvisRule =
    risk.reasons.includes(
      "projected-pelvis-pose",
    )
      ? "A pelvis-led risk was detected: neutralize only the necessary pelvis or spinal alignment while preserving the supporting leg, raised-leg height, knee and ankle geometry, torso direction, shoulder relationship, arm paths, hand anchors, and overall pose silhouette."
      : "Do not alter pelvis, spine, leg, arm, or torso geometry unless that exact element is the detected risk."

  const handRule =
    risk.reasons.includes(
      "hand-to-lips-gesture",
    )
      ? "A hand-to-mouth risk was detected: move only that hand away from the lips or mouth while preserving the same shoulder and elbow position, arm path, remaining hand anchors, and body geometry as closely as possible."
      : "Preserve every original hand anchor and support contact."

  const framingRule =
    (
      risk.reasons.includes(
        "chest-pelvis-framing",
      ) ||
      risk.reasons.includes(
        "intimate-region-visual-priority",
      )
    )
      ? "A framing or visual-hierarchy risk was detected: minimally rebalance or expand only the crop necessary to distribute attention, while retaining the original camera height, camera pitch, lens character, perspective strength, architectural geometry, pose, and subject scale as closely as possible."
      : "Preserve the exact camera height, camera pitch, crop, lens character, perspective strength, subject scale, and frame-edge relationships."

  const pose =
    poseUnlocked
      ? [
          "POSE DELTA AUTHORIZED — The client explicitly selected a pose-changing continuation axis.",
          "The previous pose skeleton is NOT a hard continuity constraint for this continuation.",
          "Create a clearly different pose as requested while preserving the same adult identity, BODY_ID proportions, approved garment coverage, environment, lighting family, photographic finish, and all non-pose elements.",
          "Safety adaptation may still neutralize only a localized unsafe gesture or pelvis-led construction; it must not cancel the authorized pose variation.",
        ].join(" ")
      : [
          "POSE FIDELITY — Preserve the reference pose skeleton as a hard constraint.",
          "Keep the original supporting leg, raised-leg geometry, knee and ankle positions, weight distribution, torso diagonal, shoulder relationship, head orientation, arm paths, support contacts, and interaction with stairs, rails, walls, chairs, or other objects.",
          "A raised leg, high leg extension, asymmetrical stance, strong body diagonal, or dramatic commercial-fashion pose is not by itself a reason to simplify the pose.",
          "Do not replace the reference with a generic standing, seated, walking, three-quarter, or lookbook pose.",
          pelvisRule,
          handRule,
        ].join(" ")

  const camera =
    framingUnlocked
      ? [
          "CAMERA DELTA AUTHORIZED — The client explicitly selected a framing variation.",
          "The previous camera height, distance, crop and lateral angle are NOT hard continuity constraints for this continuation.",
          "Execute a clearly different but coherent framing while preserving the same environment, styling, lighting family, photographic finish and all non-camera elements.",
          "Safety adaptation may still minimally rebalance a genuinely unsafe intimate-region hierarchy, but it must not cancel the authorized framing variation.",
        ].join(" ")
      : [
          "CAMERA FIDELITY — Reference camera construction remains authoritative.",
          framingRule,
          "Do not silently substitute an eye-level camera, generic portrait lens, neutral perspective, or generic retail framing.",
        ].join(" ")

  const continuationScope = [
    subLocationUnlocked
      ? "SUB-LOCATION DELTA AUTHORIZED — The subject’s exact position inside the established environment is unlocked. Move only within the same believable architectural setting; preserve the room, material system, furniture family, lighting family, photographic finish, identity and styling."
      : "",
    customInstruction
      ? `CLIENT DIRECTIVE PRECEDENCE — The client explicitly requested: ${JSON.stringify(customInstruction)}. Any non-identity visual element clearly named by this directive is unlocked from continuity and from the previous art direction. Execute that named delta precisely. Every unmentioned element remains locked. This directive cannot weaken identity, BODY_ID, consent, provider safety, or garment-coverage requirements.`
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  const sanitizedNegative =
    sanitizeNegativeGuardrails(
      negative,
    ).trim()

  return [
    "TRANSFER_MODE = CAMPAIGN_SAFE_TRANSFER",
    "COMMERCIAL INTENT — Create one premium commercial lingerie campaign or equivalent swimwear/intimate-apparel fashion image for a consenting adult model. Safety adaptation must remain subordinate to reference fidelity.",
    "IDENTITY — Use the uploaded identity photographs as the sole identity source. Preserve the same adult model’s recognizable face, natural age appearance, skin tone, hairline, body type, and natural anatomical proportions.",
    `PRESERVED ART DIRECTION — ${preservedDirection}`,
    wardrobe,
    pose,
    camera,
    continuationScope,
    "LIGHTING FIDELITY — Preserve the extracted key-light position, direction, hardness, exposure relationship, shadow placement, practical-light behavior, background brightness, and specular response. Do not replace the reference lighting with generic studio or cinematic relighting.",
    "COLOR AND FINISH FIDELITY — Preserve the extracted palette, white balance, contrast, black point, highlight roll-off, texture, sharpness, grain, and digital or filmic character.",
    "MINIMUM-CHANGE RULE — Modify only the localized element responsible for CAMPAIGN_SAFE_TRANSFER. Every unrelated architectural, pose, camera, lighting, styling, and compositional relationship remains authoritative.",
    sanitizedNegative,
  ]
    .filter(Boolean)
    .join("\n\n")
}

export function adaptMiravaCoverageForGeneration(
  prompt: string,
  mode: MiravaCoverageSafetyMode =
    "standard",
): MiravaCoverageSafetyResult {
  const {
    positive,
    negative,
  } = splitPositiveAndNegative(prompt)

  const {
    riskScore,
    reasons,
  } = detectCoverageRisk(positive)

  const shouldAdapt =
    mode === "conservative" ||
    riskScore >= 3

  if (!shouldAdapt) {
    return {
      prompt,
      adapted: false,
      riskScore,
      reasons,
    }
  }

  const rewritten =
    rewriteCoverageConstruction(
      positive,
      mode,
    ).trim()

  const invariant =
    mode === "conservative"
      ? CONSERVATIVE_COVERAGE_INVARIANT
      : STANDARD_COVERAGE_INVARIANT

  const sanitizedNegative =
    sanitizeNegativeGuardrails(
      negative,
    )

  return {
    prompt: [
      rewritten,
      invariant,
      sanitizedNegative,
    ]
      .filter(Boolean)
      .join("\n\n"),
    adapted: true,
    riskScore,
    reasons:
      reasons.length > 0
        ? reasons
        : ["conservative-safety-retry"],
  }
}
