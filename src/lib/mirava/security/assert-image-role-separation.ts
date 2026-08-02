import { MiravaPipelineError } from "../pipeline/pipeline-errors"

export type GenerationPayloadCheck = {
  artisticReferenceImage?: unknown
  artisticReferencePersonName?: unknown
  artisticReferenceFaceEmbedding?: unknown
  assets?: Array<{ kind?: string; mimeType?: string }>
}

/**
 * ABSOLUTE ARCHITECTURAL RULE:
 * The artistic reference image and the identity profile images MUST NEVER
 * be sent in the same analysis or generation call.
 */
export function assertNoArtisticReferenceInGenerationPayload(payload: GenerationPayloadCheck): void {
  if (payload.artisticReferenceImage || payload.artisticReferencePersonName || payload.artisticReferenceFaceEmbedding) {
    throw new MiravaPipelineError(
      "SECURITY VIOLATION: Artistic reference image or person identity was passed into generation payload.",
      "PIPELINE_CONTRACT_VIOLATION"
    )
  }

  if (payload.assets && payload.assets.some((asset) => asset.kind === "REFERENCE")) {
    throw new MiravaPipelineError(
      "SECURITY VIOLATION: Assets list for image generation contains an artistic REFERENCE asset.",
      "PIPELINE_CONTRACT_VIOLATION"
    )
  }
}

/**
 * Ensures that at least one validated identity image is present for generation.
 */
export function assertAtLeastOneValidatedIdentityImage(identityImages: unknown[]): void {
  if (!Array.isArray(identityImages) || identityImages.length === 0) {
    throw new MiravaPipelineError(
      "No validated identity profile images provided for image generation.",
      "IDENTITY_IMAGES_MISSING"
    )
  }
}
