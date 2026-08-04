import { createHash } from "crypto"
import { miravaCreativeOptionsSchema } from "@/lib/mirava/creative-options"
import {
  buildPoseVariationContinuityContract,
  poseVariationRequestSchema,
  regenerationRequestSchema,
  type PoseVariationRequest,
  type RegenerationRequest,
} from "@/lib/mirava/pose-variation"

export type PostGenerationIntent = "REGENERATE" | "POSE_VARIATION"

export type PostGenerationSource = {
  id: string
  userId: string
  dossierId: string | null
  studioProfileId?: string | null
  identityProfileId?: string | null
  presetId?: string | null
  creativeOptions?: Record<string, unknown>
  creativeDirectionSummary: string | null
  masterPrompt: string | null
  negativePrompt: string | null
  rootCreationId?: string | null
}

export type PostGenerationChildDraft = {
  id: string
  userId: string
  dossierId: string | null
  studioProfileId: string | null
  identityProfileId: string
  presetId: string | null
  generationIntent: PostGenerationIntent
  parentCreationId: string
  rootCreationId: string
  sourceResultIndex: number
  variationRequest: Record<string, unknown> | null
  clientIdempotencyKey: string
  creativeOptions: Record<string, unknown>
  status: "MASTER_PROMPT_READY"
  creativeDirectionSummary: string | null
  masterPrompt: string
  negativePrompt: string | null
}

type ReplayCandidate = {
  userId: string
  generationIntent?: string | null
  parentCreationId?: string | null
  rootCreationId?: string | null
  sourceResultIndex?: number | null
  variationRequest?: unknown
  clientIdempotencyKey?: string | null
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`
}

export function postGenerationCreationId(userId: string, idempotencyKey: string): string {
  const digest = createHash("sha256")
    .update(`${userId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 24)
  return `pg_${digest}`
}

export function postGenerationReservationKey(creationId: string): string {
  return `mirava-post-generation-reservation:${creationId}`
}

function normalizedSingleResultOptions(value: unknown): Record<string, unknown> {
  const parsed = miravaCreativeOptionsSchema.safeParse(value)
  return {
    ...(parsed.success ? parsed.data : {}),
    seriesSize: 1,
  }
}

function baseDraft(
  source: PostGenerationSource,
  intent: PostGenerationIntent,
  sourceResultIndex: number,
  idempotencyKey: string,
): Omit<PostGenerationChildDraft, "variationRequest"> {
  if (!source.identityProfileId) {
    throw new Error("IDENTITY_PROFILE_REQUIRED")
  }
  if (!source.masterPrompt?.trim()) {
    throw new Error("MASTER_PROMPT_REQUIRED")
  }

  return {
    id: postGenerationCreationId(source.userId, idempotencyKey),
    userId: source.userId,
    dossierId: source.dossierId,
    studioProfileId: source.studioProfileId ?? null,
    identityProfileId: source.identityProfileId,
    presetId: source.presetId ?? null,
    generationIntent: intent,
    parentCreationId: source.id,
    rootCreationId: source.rootCreationId ?? source.id,
    sourceResultIndex,
    clientIdempotencyKey: idempotencyKey,
    creativeOptions: normalizedSingleResultOptions(source.creativeOptions),
    status: "MASTER_PROMPT_READY",
    creativeDirectionSummary: source.creativeDirectionSummary,
    masterPrompt: source.masterPrompt,
    negativePrompt: source.negativePrompt,
  }
}

export function buildRegenerationChildDraft(
  source: PostGenerationSource,
  input: RegenerationRequest,
): PostGenerationChildDraft {
  const request = regenerationRequestSchema.parse(input)
  return {
    ...baseDraft(source, "REGENERATE", request.sourceResultIndex, request.idempotencyKey),
    variationRequest: null,
  }
}

export function buildPoseVariationChildDraft(
  source: PostGenerationSource,
  input: PoseVariationRequest,
): PostGenerationChildDraft {
  const request = poseVariationRequestSchema.parse(input)
  const continuityContract = buildPoseVariationContinuityContract({
    sourceCreationId: source.id,
    identityProfileId: source.identityProfileId ?? "",
    minorCropAdjustment: request.poseDelta?.minorCropAdjustment ?? false,
  })

  return {
    ...baseDraft(source, "POSE_VARIATION", request.sourceResultIndex, request.idempotencyKey),
    variationRequest: {
      version: "1.0.0",
      ...(request.presetId ? { presetId: request.presetId } : {}),
      ...(request.userInstruction ? { userInstruction: request.userInstruction } : {}),
      ...(request.poseDelta ? { poseDelta: request.poseDelta } : {}),
      continuityContract,
    },
  }
}

export function isMatchingPostGenerationReplay(
  existing: ReplayCandidate,
  draft: PostGenerationChildDraft,
): boolean {
  return existing.userId === draft.userId
    && existing.generationIntent === draft.generationIntent
    && existing.parentCreationId === draft.parentCreationId
    && existing.rootCreationId === draft.rootCreationId
    && existing.sourceResultIndex === draft.sourceResultIndex
    && existing.clientIdempotencyKey === draft.clientIdempotencyKey
    && stableJson(existing.variationRequest ?? null) === stableJson(draft.variationRequest)
}
