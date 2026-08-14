import { z } from "zod"

export const MIRAVA_SESSION_BUILDER_RESUME_STEPS = [
  "SET",
  "LIGHTING",
  "DIRECTION",
  "LOOK",
  "REVIEW",
] as const

export const miravaSessionBuilderResumeStepSchema =
  z.enum(
    MIRAVA_SESSION_BUILDER_RESUME_STEPS,
  )

export type MiravaSessionBuilderResumeStep =
  z.infer<
    typeof miravaSessionBuilderResumeStepSchema
  >
