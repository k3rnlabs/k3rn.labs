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
      /\b(?:arched back|back arched|pelvis projected|hips projected|hips pushed|pelvis pushed|pronounced hip thrust)\b/i,
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

const SAFE_DIRECTION_KEYWORDS =
  /\b(?:environment|setting|interior|exterior|background|wall|marble|stone|wood|glass|architecture|surface|texture|studio|window|lighting|light|flash|shadow|exposure|camera|lens|perspective|depth of field|palette|color|colour|contrast|tone|finish|digital|editorial|grain|sharpness|white balance|highlight|reflection)\b/i

const UNSAFE_DIRECTION_CONTENT =
  /(?:\b(?:penthouse|playboy|adult magazine|pornographic|pornography|xxx|erotic|seductive|provocative|boudoir|thong|g-string|string bottom|micro brief|micro bikini|nipples?|genitals?|buttocks?|seat cleavage|crotch|pelvis projected|hips projected|arched back|back (?:is )?arched|pelvis (?:is )?projected|hips? (?:are )?projected|chest[-–— ]to[-–— ]pelvis)\b|\b(?:finger(?:tip)?|hand)\b[^.!?\n]{0,100}\b(?:lip|mouth)s?\b)/i

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
}

function rewriteCoverageConstruction(
  source: string,
  mode: MiravaCoverageSafetyMode,
): string {
  let prompt = source

  const replacements:
    Array<[RegExp, string]> = [
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
        /\bgather(?:ed|ing)?\s+(?:the\s+)?(?:back|rear)\s+of\s+(?:the\s+)?(?:robe|dress|skirt|fabric)\b/gi,
        "arranging the side panel of the garment while preserving full rear coverage",
      ],
      [
        /\bopen below the waist\b/gi,
        "closed and continuously draped below the waist",
      ],
      [
        /\brear-facing garment coverage\b/gi,
        "rear-facing garment construction with full seat coverage",
      ],
      [
        /\bhips? sharply resolved and subtly projected backward\b/gi,
        "garment construction sharply resolved with a natural balanced rear three-quarter stance",
      ],
      [
        /\bhips? sharply resolved\b/gi,
        "garment construction and pose sharply resolved",
      ],
      [
        /\bhips? subtly projected backward\b/gi,
        "a natural balanced rear three-quarter stance",
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
    ]

  for (const [pattern, replacement] of
    replacements) {
    prompt = prompt.replace(
      pattern,
      replacement,
    )
  }

  if (mode === "conservative") {
    prompt = prompt
      .replace(
        /\b(?:sheer|transparent|semi-transparent)\b/gi,
        "opaque layered",
      )
      .replace(
        /\b(?:lifted|lifting|raised|pulled up)\b/gi,
        "kept continuously draped",
      )
      .replace(
        /\bopen beneath the waist\b/gi,
        "closed beneath the waist",
      )
  }

  return prompt
}

function extractSafeReferenceDirection(
  prompt: string,
): string {
  const { positive } =
    splitPositiveAndNegative(prompt)

  const candidates = positive
    .replace(
      /\bTRANSFER_MODE\s*=\s*(?:FIDELITY|POLISHED|CAMPAIGN_SAFE_TRANSFER)\b/gi,
      "",
    )
    .split(
      /(?:\n{2,}|(?<=[.!?])\s+)/,
    )
    .map((segment) =>
      segment
        .replace(
          /^(?:[A-Z][A-Z /&-]{2,40})\s*[—:-]\s*/,
          "",
        )
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .filter((segment) =>
      SAFE_DIRECTION_KEYWORDS.test(
        segment,
      ),
    )
    .filter((segment) =>
      !UNSAFE_DIRECTION_CONTENT.test(
        segment,
      ),
    )
    .filter((segment) =>
      !COMMERCIAL_INTIMATE_CATEGORY.test(
        segment,
      ),
    )
    .slice(0, 8)

  if (candidates.length === 0) {
    return "Preserve the approved environment, architectural materials, lighting direction, shadow structure, palette, contrast, lens perspective, and photographic finish from the extracted reference direction."
  }

  return candidates.join(" ")
}

export function buildMiravaCampaignSafeTransferPrompt(
  prompt: string,
  mode: MiravaCampaignSafetyMode =
    "standard",
): string {
  const safeReferenceDirection =
    extractSafeReferenceDirection(
      prompt,
    )

  const wardrobe =
    mode === "conservative"
      ? "Use a premium fully opaque black lingerie set with structured lined cups, a conventional neckline, and a high-waisted full-coverage brief. Lace may appear only as an opaque-backed decorative layer. Keep seams, straps, cup construction, front panel, side panels, and rear panel physically coherent."
      : "Use a premium black retail lingerie set with structured fully lined opaque cups and a high-waisted brief with complete front and rear panels. Lace or mesh may be used as decorative texture only when backed by opaque fabric. Preserve realistic seams, straps, fabric weight, and product construction."

  const pose =
    mode === "conservative"
      ? "Use a neutral balanced standing pose with relaxed shoulders, a slight three-quarter torso turn, one hand resting naturally at the waist and the other relaxed alongside the body. Keep the posture stable, composed, and suitable for a retail lookbook."
      : "Use a confident balanced three-quarter standing pose with relaxed shoulders, natural weight distribution, one hand at the waist and the other relaxed alongside the body. Keep the gesture composed and product-focused."

  const composition =
    mode === "conservative"
      ? "Use an eye-level camera and a three-quarter or full-body vertical composition. Frame the face, complete garment silhouette, and styling as one balanced retail image with natural perspective."
      : "Use an eye-level camera and a waist-up, three-quarter, or full-body vertical composition. Give balanced visual priority to the face, garment construction, and complete silhouette."

  return [
    "TRANSFER_MODE = CAMPAIGN_SAFE_TRANSFER",
    "COMMERCIAL INTENT — Create one premium retail campaign photograph for a consenting adult model presenting a lingerie collection. The result must read as polished fashion merchandising and brand imagery.",
    "IDENTITY — Use the uploaded identity photographs as the sole identity source. Preserve the same adult model’s recognizable face, natural age appearance, skin tone, hairline, body type, and natural anatomical proportions.",
    `SAFE REFERENCE DIRECTION — ${safeReferenceDirection}`,
    `WARDROBE — ${wardrobe}`,
    `POSE — ${pose}`,
    `CAMERA AND COMPOSITION — ${composition}`,
    "LIGHTING — Preserve the extracted key-light direction, hardness, exposure relationship, shadow placement, background brightness, and specular behavior. Do not replace the approved lighting system with generic cinematic relighting.",
    "COLOR AND FINISH — Preserve the extracted palette, white balance, contrast, black point, highlight roll-off, texture, sharpness, and digital editorial character.",
    "OUTPUT — Produce one realistic premium vertical commercial lingerie campaign photograph with coherent hands, garment seams, straps, jewelry, shadows, reflections, and natural body proportions.",
  ].join("\n\n")
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
