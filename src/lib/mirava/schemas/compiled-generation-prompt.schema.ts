import { z } from "zod"
import { sceneProfileSchema } from "./scene-context.schema"

export const compiledGenerationPromptSchema = z.object({
  positivePrompt: z.string().min(50, "Compiled positive prompt is too short"),
  negativeGuardrails: z.string().min(10, "Compiled negative guardrails are too short"),
  sceneProfile: sceneProfileSchema,

  metadata: z.object({
    extractorVersion: z.string(),
    classifierVersion: z.string(),
    compilerVersion: z.string(),
    compiledAt: z.string(),
  }),
})

export type CompiledGenerationPrompt = z.infer<typeof compiledGenerationPromptSchema>
