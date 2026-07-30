import { miravaCreativeOptionsSchema } from "@/lib/mirava/creative-options"

export const MIRAVA_SERIES_SIZES = [1, 2, 3, 4, 5, 6] as const
export type MiravaSeriesSize = typeof MIRAVA_SERIES_SIZES[number]

type Shot = {
  role: string
  framing: string
  action: string
  light: string
}

const sixShotArc: Shot[] = [
  {
    role: "Destination opener",
    framing: "wide or full-body environmental portrait",
    action: "arrival, walking into the setting or a confident pause that establishes the destination",
    light: "the primary light of the approved art direction",
  },
  {
    role: "Lived-in moment",
    framing: "dynamic medium or three-quarter frame from a clearly different camera position",
    action: "a natural activity or interaction specific to this place, never a repeat of the opener",
    light: "a plausible variation created by moving through the same environment",
  },
  {
    role: "Intimate signature",
    framing: "close portrait or beauty detail",
    action: "a quieter expression and gesture that reveals personality while staying inside the same story",
    light: "controlled close light consistent with the destination palette",
  },
  {
    role: "Movement and scale",
    framing: "wide moving frame, profile or low/high angle",
    action: "a second destination-specific activity in another coherent sub-location",
    light: "stronger environmental reflections, motion or contrast without changing the campaign identity",
  },
  {
    role: "Social detail",
    framing: "candid medium frame or environmental detail with the subject clearly present",
    action: "a believable lifestyle beat such as a meal, preparation, transport or pause between activities",
    light: "a distinct but chronologically plausible light pocket within the same destination",
  },
  {
    role: "Closing frame",
    framing: "cinematic three-quarter or full-body portrait",
    action: "a relaxed concluding moment in a final coherent sub-location",
    light: "a later light beat such as golden hour, blue hour or practical night light when plausible",
  },
]

export function getMiravaSeriesSize(value: unknown): MiravaSeriesSize {
  const parsed = miravaCreativeOptionsSchema.safeParse(value)
  return parsed.success ? (parsed.data.seriesSize ?? 1) : 1
}

export function buildMiravaSeriesShotBrief(value: unknown, frameIndex: number): string {
  const size = getMiravaSeriesSize(value)
  if (size === 1) return ""
  const parsed = miravaCreativeOptionsSchema.safeParse(value)
  const settingStrategy = parsed.success && parsed.data.seriesStrategy === "varied-settings"
    ? "SETTING STRATEGY — Move through multiple distinct but visually coherent settings inside the same approved creative world."
    : "SETTING STRATEGY — Keep one main setting and vary only believable sub-locations within it."

  const selectedIndices: Record<MiravaSeriesSize, number[]> = {
    1: [0],
    2: [0, 5],
    3: [0, 1, 5],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 3, 5],
    6: [0, 1, 2, 3, 4, 5],
  }
  const safeIndex = Math.max(0, Math.min(frameIndex, size - 1))
  const shot = sixShotArc[selectedIndices[size][safeIndex]]

  return [
    `SERIES FRAME ${safeIndex + 1}/${size} — ${shot.role}.`,
    `Framing: ${shot.framing}.`,
    `Action: ${shot.action}.`,
    `Light: ${shot.light}.`,
    settingStrategy,
    "SERIES CONTINUITY — Keep the exact same adult identity, destination family, campaign palette, photographic finish and believable chronology across the series.",
    "MANDATORY VARIATION — This frame must not repeat another frame’s pose, gaze, facial expression, gesture, crop, camera height, camera angle, focal distance, activity, sub-location or light beat. Do not reuse identity-reference poses or accessories.",
    "The full set must read as one real editorial trip photographed over time, not as duplicated portraits against interchangeable backgrounds.",
  ].join("\n")
}
