import { z } from "zod"
import { photographicGenreSchema, sceneProfileSchema } from "./scene-context.schema"

export const visualDirectionBlueprintSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "review", "published", "archived"]),
  transferMode: z.enum(["FIDELITY", "POLISHED"]),

  creativeDirectionSummary: z.string(),
  baseGenerationPrompt: z.string(),
  negativeGuardrails: z.string(),

  sceneProfile: sceneProfileSchema,
  photographicGenre: photographicGenreSchema,

  extractionMetadata: z.object({
    extractorVersion: z.string(),
    classifierVersion: z.string(),
    model: z.string(),
    createdAt: z.string(),
    referenceAssetId: z.string(),
  }),

  qualityFlags: z.object({
    lightingContractPresent: z.boolean(),
    cameraContractPresent: z.boolean(),
    poseContractPresent: z.boolean(),
    wardrobeContractPresent: z.boolean(),
    identityLanguageDetected: z.boolean(),
    requiresHumanReview: z.boolean(),
  }),
})

export type VisualDirectionBlueprint = z.infer<typeof visualDirectionBlueprintSchema>
