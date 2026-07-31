export const MIRAVA_ANALYSIS_MODEL = process.env.MIRAVA_ANALYSIS_MODEL ?? "gpt-5.6-sol"
// Alma only needs concise bilingual direction and validated JSON actions. Keep the
// image-analysis model separate from this low-latency, cost-sensitive interaction.
export const MIRAVA_CREATIVE_DIRECTOR_MODEL = process.env.MIRAVA_CREATIVE_DIRECTOR_MODEL ?? "gpt-5-mini"
export const MIRAVA_IMAGE_MODEL = process.env.MIRAVA_IMAGE_MODEL ?? "gpt-image-2"
export const MIRAVA_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_MIRAVA_PUSH_PUBLIC_KEY

export function isMiravaPublicLaunchEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.MIRAVA_PUBLIC_LAUNCH_ENABLED !== "false"
}
