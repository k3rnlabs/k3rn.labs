import { z } from "zod"

export const sceneProfileSchema = z.enum([
  "standard_fashion",
  "swimwear_resort",
  "fashion_intimates",
  "sports_fashion",
  "beauty_closeup",
  "nightlife_direct_flash",
  "mirror_selfie",
  "luxury_editorial",
  "lifestyle",
  "travel_editorial",
  "other",
])
export type SceneProfile = z.infer<typeof sceneProfileSchema>

export const photographicGenreSchema = z.enum([
  "commercial_campaign",
  "fashion_editorial",
  "social_snapshot",
  "phone_photo",
  "mirror_selfie",
  "beauty_campaign",
  "resort_campaign",
  "sports_campaign",
  "nightlife_flash",
  "cinematic_portrait",
  "other",
])
export type PhotographicGenre = z.infer<typeof photographicGenreSchema>

export const garmentContextSchema = z.enum([
  "standard_clothing",
  "sportswear",
  "swimwear",
  "resortwear",
  "fashion_intimates",
  "eveningwear",
  "other",
])
export type GarmentContext = z.infer<typeof garmentContextSchema>

export const coverageInstructionSchema = z.enum([
  "preserve_exact_coverage",
  "not_applicable",
])
export type CoverageInstruction = z.infer<typeof coverageInstructionSchema>

export const referenceCharacterSchema = z.enum([
  "fidelity_sensitive",
  "standard",
  "polishable",
])
export type ReferenceCharacter = z.infer<typeof referenceCharacterSchema>

export const wordingProfileSchema = z.enum([
  "standard",
  "commercial_fashion_neutral",
  "social_photo_neutral",
])
export type WordingProfile = z.infer<typeof wordingProfileSchema>

export const sceneContextClassificationSchema = z.object({
  sceneProfile: sceneProfileSchema,
  photographicGenre: photographicGenreSchema,
  garmentContext: garmentContextSchema,
  coverageInstruction: coverageInstructionSchema,
  referenceCharacter: referenceCharacterSchema,
  wordingProfile: wordingProfileSchema,
  confidence: z.number().min(0).max(1),
  requiresHumanReview: z.boolean(),
})

export type SceneContextClassification = z.infer<typeof sceneContextClassificationSchema>
