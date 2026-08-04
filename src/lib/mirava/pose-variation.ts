import { z } from "zod"

export const studioGenerationIntentSchema = z.enum([
  "INITIAL",
  "REGENERATE",
  "POSE_VARIATION",
])

const shortInstruction = z.string().trim().min(1).max(180)

export const poseDeltaSchema = z.object({
  bodyOrientation: shortInstruction.optional(),
  weightDistribution: shortInstruction.optional(),
  armPlacement: shortInstruction.optional(),
  handPlacement: shortInstruction.optional(),
  legPlacement: shortInstruction.optional(),
  headAngle: shortInstruction.optional(),
  gazeDirection: shortInstruction.optional(),
  facialExpression: shortInstruction.optional(),
  emotionalEnergy: shortInstruction.optional(),
  hairArrangement: shortInstruction.optional(),
  minorCropAdjustment: z.boolean().default(false),
}).strip().refine(
  (value) => Object.entries(value).some(
    ([key, fieldValue]) => key !== "minorCropAdjustment" && Boolean(fieldValue),
  ),
  { message: "At least one pose variation field is required" },
)

const lockedWardrobeSchema = z.object({
  garmentIdentity: z.literal(true),
  category: z.literal(true),
  cut: z.literal(true),
  construction: z.literal(true),
  colors: z.literal(true),
  materials: z.literal(true),
  patterns: z.literal(true),
  accessories: z.literal(true),
  coverage: z.literal(true),
}).strict()

const lockedBeautySchema = z.object({
  makeup: z.literal(true),
  hairColor: z.literal(true),
  hairLength: z.literal(true),
  hairTexture: z.literal(true),
  manicure: z.literal(true),
}).strict()

const lockedSceneSchema = z.object({
  location: z.literal(true),
  architecture: z.literal(true),
  background: z.literal(true),
  surfaces: z.literal(true),
  props: z.literal(true),
  timeOfDay: z.literal(true),
  weather: z.literal(true),
}).strict()

const lockedLightingSchema = z.object({
  sourceType: z.literal(true),
  direction: z.literal(true),
  hardness: z.literal(true),
  colorTemperature: z.literal(true),
  exposureRelationship: z.literal(true),
  shadowArchitecture: z.literal(true),
  highlightBehavior: z.literal(true),
}).strict()

const lockedPhotographySchema = z.object({
  genre: z.literal(true),
  colorGrade: z.literal(true),
  contrast: z.literal(true),
  realism: z.literal(true),
  lensFeel: z.literal(true),
  aspectRatio: z.literal(true),
}).strict()

export const poseVariationContinuityContractSchema = z.object({
  sourceCreationId: z.string().cuid(),
  identityProfileId: z.string().cuid(),
  visualDirectionId: z.string().cuid().nullable(),
  locked: z.object({
    identity: z.literal(true),
    naturalFacialAnatomy: z.literal(true),
    naturalBodyProportions: z.literal(true),
    wardrobe: lockedWardrobeSchema,
    beauty: lockedBeautySchema,
    scene: lockedSceneSchema,
    lighting: lockedLightingSchema,
    photography: lockedPhotographySchema,
  }).strict(),
  variable: z.object({
    bodyPose: z.literal(true),
    torsoOrientation: z.literal(true),
    headAngle: z.literal(true),
    gazeDirection: z.literal(true),
    facialExpression: z.literal(true),
    handPlacement: z.literal(true),
    armPosition: z.literal(true),
    legPosition: z.literal(true),
    weightDistribution: z.literal(true),
    hairArrangement: z.literal(true),
    naturalGarmentFolds: z.literal(true),
    minorCropAdjustment: z.boolean(),
  }).strict(),
}).strict()

export const poseVariationRequestSchema = z.object({
  sourceResultIndex: z.number().int().min(0).max(5),
  presetId: z.string().trim().min(1).max(80).optional(),
  userInstruction: shortInstruction.optional(),
  poseDelta: poseDeltaSchema.optional(),
  idempotencyKey: z.string().trim().min(16).max(128),
}).strip().refine(
  (value) => Boolean(value.presetId || value.userInstruction || value.poseDelta),
  { message: "A preset, user instruction, or structured pose delta is required" },
)

export const regenerationRequestSchema = z.object({
  sourceResultIndex: z.number().int().min(0).max(5),
  idempotencyKey: z.string().trim().min(16).max(128),
}).strip()

export const creationLineageSchema = z.object({
  parentCreationId: z.string().cuid().nullable(),
  rootCreationId: z.string().cuid().nullable(),
  generationIntent: studioGenerationIntentSchema,
  sourceResultIndex: z.number().int().min(0).max(5).nullable(),
  variationRequest: z.unknown().nullable(),
}).strict()

export type StudioGenerationIntent = z.infer<typeof studioGenerationIntentSchema>
export type PoseDelta = z.infer<typeof poseDeltaSchema>
export type PoseVariationContinuityContract = z.infer<
  typeof poseVariationContinuityContractSchema
>
export type PoseVariationRequest = z.infer<typeof poseVariationRequestSchema>
export type RegenerationRequest = z.infer<typeof regenerationRequestSchema>
export type CreationLineage = z.infer<typeof creationLineageSchema>

export function resolveRootCreationId(source: {
  id: string
  rootCreationId: string | null
}): string {
  return source.rootCreationId ?? source.id
}

export function buildPoseVariationContinuityContract(args: {
  sourceCreationId: string
  identityProfileId: string
  minorCropAdjustment: boolean
}): PoseVariationContinuityContract {
  return poseVariationContinuityContractSchema.parse({
    sourceCreationId: args.sourceCreationId,
    identityProfileId: args.identityProfileId,
    visualDirectionId: null,
    locked: {
      identity: true,
      naturalFacialAnatomy: true,
      naturalBodyProportions: true,
      wardrobe: {
        garmentIdentity: true,
        category: true,
        cut: true,
        construction: true,
        colors: true,
        materials: true,
        patterns: true,
        accessories: true,
        coverage: true,
      },
      beauty: {
        makeup: true,
        hairColor: true,
        hairLength: true,
        hairTexture: true,
        manicure: true,
      },
      scene: {
        location: true,
        architecture: true,
        background: true,
        surfaces: true,
        props: true,
        timeOfDay: true,
        weather: true,
      },
      lighting: {
        sourceType: true,
        direction: true,
        hardness: true,
        colorTemperature: true,
        exposureRelationship: true,
        shadowArchitecture: true,
        highlightBehavior: true,
      },
      photography: {
        genre: true,
        colorGrade: true,
        contrast: true,
        realism: true,
        lensFeel: true,
        aspectRatio: true,
      },
    },
    variable: {
      bodyPose: true,
      torsoOrientation: true,
      headAngle: true,
      gazeDirection: true,
      facialExpression: true,
      handPlacement: true,
      armPosition: true,
      legPosition: true,
      weightDistribution: true,
      hairArrangement: true,
      naturalGarmentFolds: true,
      minorCropAdjustment: args.minorCropAdjustment,
    },
  })
}
