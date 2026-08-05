export type MiravaCoverageSafetyMode =
  | "standard"
  | "conservative"

export type MiravaCoverageSafetyResult = {
  prompt: string
  adapted: boolean
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
