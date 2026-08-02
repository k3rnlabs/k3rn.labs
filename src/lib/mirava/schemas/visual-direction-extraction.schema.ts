import { z } from "zod"

export const visualDirectionExtractionSchema = z.object({
  creativeDirectionSummary: z.string().min(20, "Creative direction summary too short"),
  baseGenerationPrompt: z.string().min(80, "Base generation prompt too short"),
  negativeGuardrails: z.string().min(10, "Negative guardrails too short"),
})

export type VisualDirectionExtraction = z.infer<typeof visualDirectionExtractionSchema>
