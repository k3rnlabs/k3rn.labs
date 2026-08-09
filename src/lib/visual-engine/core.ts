import { createHash, randomUUID } from "crypto"
import sharp from "sharp"
import { db } from "@/lib/db"
import {
  requireMiravaOpenAiIdentityAnalysisConsent,
} from "@/lib/visual-engine/privacy"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  MIRAVA_ANALYSIS_FALLBACK_MODEL,
  MIRAVA_ANALYSIS_MODEL,
  MIRAVA_IMAGE_MODEL,
  getMiravaFaceIdentityGateMode,
} from "@/lib/mirava/server-config"
import { MIRAVA_STRIPE_PRODUCT, getMiravaStudioPreset, type MiravaStudioPresetId } from "@/lib/mirava/brand"
import { formatMiravaCreativeOptions, miravaCreativeOptionsSchema, type MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import {
  buildMiravaOfficialUniversePrimaryPrompt,
  buildMiravaOfficialUniverseSafetyFallbackPrompt,
  getMiravaOfficialUniverseBlueprint,
  renderMiravaOfficialUniverseMasterPrompt,
} from "@/lib/mirava/official-universe-blueprints"
import {
  MIRAVA_MAX_IDENTITY_PHOTOS,
  MIRAVA_MIN_IDENTITY_PHOTOS,
  MIRAVA_RECOMMENDED_IDENTITY_PHOTOS,
  MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS,
  isMiravaIdentityViewKey,
  miravaLegacyIdentityViewKey,
  type MiravaIdentityViewKey,
} from "@/lib/mirava/identity-profile"
import {
  parseMiravaIdentityFaceGeometry,
  resolveMiravaIdentityFaceCrop,
} from "@/lib/mirava/identity-face-geometry"
import {
  buildMiravaIdentityManifest,
} from "@/lib/mirava/identity-manifest"
import {
  compositeMiravaIdentityRestoration,
  resolveMiravaDetectedFaceRestorationCrop,
} from "@/lib/mirava/identity-restoration"
import { type PhysicalTrait, formatPhysicalTraitsForPrompt, parsePhysicalTraits } from "@/lib/mirava/physical-traits"
import {
  MIRAVA_IDENTITY_MORPHOLOGY_EXTRACTOR_PROMPT,
  formatIdentityMorphologyForPrompt,
  parseIdentityMorphology,
} from "@/lib/mirava/identity-morphology"
import { buildMiravaSeriesShotBrief, getMiravaSeriesSize } from "@/lib/mirava/series"
import {
  buildMiravaSessionContinuationPrompt,
  miravaContinuationDirectiveSchema,
  readMiravaContinuationDirective,
  type MiravaShotIntent,
} from "@/lib/mirava/session-continuity"
import {
  MiravaCreditError,
  debitMiravaCreditReservation,
  ensureMiravaActivation,
  grantMiravaCredits,
  releaseMiravaCreditReservation,
  reserveMiravaCredit,
} from "./credits"
import { notifyMiravaCreationReady } from "./push"
import {
  getMiravaDiscoveryAccess,
  isMiravaDiscoveryCreationLocked,
  isMiravaDiscoveryResultLocked,
} from "./discovery"
import { MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA, MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT } from "@/lib/mirava/prompts/visual-direction-extractor-v2"
import { MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_METADATA } from "@/lib/mirava/prompts/scene-context-classifier-v1"
import { parseV2Extraction } from "@/lib/mirava/pipeline/parse-v2-extraction"
import {
  classifySceneContext,
  heuristicSceneClassification,
} from "@/lib/mirava/pipeline/classify-scene-context"
import { compileGenerationPrompt } from "@/lib/mirava/pipeline/compile-generation-prompt"
import { applyMiravaMakeupDirection } from "@/lib/mirava/makeup"
import { complianceNeutralRewrite } from "@/lib/mirava/pipeline/compliance-neutral-rewrite"
import {
  buildMiravaCampaignSafeTransferPrompt,
  detectMiravaCampaignRisk,
} from "@/lib/mirava/pipeline/coverage-safety-adaptation"
import { assertAtLeastOneValidatedIdentityImage } from "@/lib/mirava/security/assert-image-role-separation"
import {
  KieProviderError,
  buildMiravaKieIdentityRestorationPrompt,
  buildMiravaKieReferencePrompt,
  runKieImageGeneration,
  shouldRouteMiravaPromptToKie,
  type MiravaKieReferenceImage,
} from "@/lib/visual-engine/kie-provider"
import {
  isMiravaKieImageProviderEnabled,
} from "@/lib/mirava/server-config"
import type { VisualDirectionBlueprint } from "@/lib/mirava/schemas/visual-direction-blueprint.schema"
import { MIRAVA_SESSION_BUILDER_VERSION, MIRAVA_SESSION_SHOT_COUNT, miravaSessionBuilderReadySchema } from "@/lib/mirava/session-builder/schema"
import { buildMiravaSessionShotGenerationContext } from "@/lib/mirava/session-builder/shot-generation-context"
import {
  selectMiravaCustomLookProviderReferences,
  selectMiravaReferenceLookProviderReferences,
  buildMiravaSessionProviderImageInputs,
  type MiravaSessionProviderReference,
} from "@/lib/mirava/session-builder/provider-visual-references"
import {
  hasMiravaExternalImageGenerationConsent,
  requireMiravaRequiredConsents,
} from "@/lib/visual-engine/privacy"
import {
  MiravaFaceIdentityGateError,
  evaluateMiravaFaceIdentity,
  type MiravaFaceIdentityGateResult,
} from "@/lib/visual-engine/face-identity-gate"

export const STUDIO_BUCKET = process.env.SUPABASE_STORAGE_VISUAL_ENGINE_BUCKET ?? "visual-engine-private"
export const STUDIO_CONSENT_VERSION = "2026-07-29"
export const MAX_STUDIO_IMAGE_BYTES = 10 * 1024 * 1024
export const MIRAVA_IMAGE_PROVIDER_TIMEOUT_MS = 120_000
export const MIRAVA_CONTINUITY_IMAGE_PROVIDER_TIMEOUT_MS = 240_000
export const MIRAVA_GENERATION_TIMEOUT_MAX_ATTEMPTS = 2
export const MIN_IDENTITY_ASSETS = MIRAVA_MIN_IDENTITY_PHOTOS
export const RECOMMENDED_IDENTITY_ASSETS = MIRAVA_RECOMMENDED_IDENTITY_PHOTOS
export const MAX_IDENTITY_ASSETS = MIRAVA_MAX_IDENTITY_PHOTOS

export function canAutoGenerateMiravaCreation(identityAssetCount: number): boolean {
  return identityAssetCount >= MIN_IDENTITY_ASSETS && identityAssetCount <= MAX_IDENTITY_ASSETS
}

export function isMiravaGenerationAlreadyDurable(status: StudioStatus): boolean {
  return status === "GENERATION_QUEUED" || status === "GENERATING" || status === "COMPLETED"
}

export type StudioCreationRecord = {
  id: string
  userId: string
  dossierId: string | null
  studioProfileId?: string | null
  identityProfileId?: string | null
  presetId?: string | null
  sessionId?: string | null
  parentCreationId?: string | null
  shotIndex?: number
  shotIntent?: MiravaShotIntent | null
  sourceResultIndex?: number | null
  creativeOptions?: Record<string, unknown>
  status: StudioStatus
  creativeDirectionSummary: string | null
  masterPrompt: string | null
  negativePrompt: string | null
  failureCode: string | null
  failureMessage: string | null
  creditReservationKey: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export type StudioPublicStatus = Exclude<StudioStatus, "MASTER_PROMPT_READY"> | "IDENTITY_READY"

export type StudioPublicFailureKind =
  | "SAFETY_REFUSAL"
  | "INVALID_IMAGE"
  | "ANALYSIS_TIMEOUT"
  | "GENERATION_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "TECHNICAL_ERROR"
  | null

export type StudioCreationPublic = Pick<StudioCreationRecord,
  | "id"
  | "studioProfileId"
  | "presetId"
  | "sessionId"
  | "parentCreationId"
  | "shotIndex"
  | "shotIntent"
  | "sourceResultIndex"
  | "failureMessage"
  | "createdAt"
  | "updatedAt"
  | "completedAt"
> & {
  status: StudioPublicStatus
  failureKind: StudioPublicFailureKind
  requestedResultCount: number
}

export type StudioAssetRecord = {
  id: string
  creationId: string
  userId: string
  kind: "REFERENCE" | "IDENTITY" | "RESULT"
  storagePath: string
  mimeType: string
  bytes: number
  referenceFaceGeometry?: unknown
  expiresAt: string | null
  deletedAt: string | null
  createdAt: string
}

type StudioIdentityAssetRecord =
  Omit<
    StudioAssetRecord,
    "creationId" |
      "kind" |
      "expiresAt" |
      "deletedAt"
  > & {
    identityProfileId: string
    viewKey?: string | null
    faceGeometry?: unknown
  }

type StudioProfileRecord = {
  id: string
  userId: string
  sourceCreationId: string | null
  presetId: string | null
  name: string
  creativeDirectionSummary: string | null
  masterPrompt: string | null
  negativePrompt: string | null
  createdAt: string
  updatedAt: string
}

export type StudioStatus =
  | "DRAFT"
  | "ANALYSIS_QUEUED"
  | "ANALYSING"
  | "MASTER_PROMPT_READY"
  | "GENERATION_QUEUED"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"

type StudioJobRecord = {
  id: string
  creationId: string
  kind: "ANALYZE" | "GENERATE" | "PURGE"
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED"
  attempts: number
  nextRunAt: string
  provider?: string | null
  providerTaskId?: string | null
  providerState?: string | null
  providerFrameIndex?: number | null
}

type CreditKind =
  | "ACTIVATION_GRANT"
  | "RESERVATION"
  | "ANALYSIS_DEBIT"
  | "RESERVATION_RELEASE"
  | "COMPENSATION"
  | "PURCHASE"

class StudioError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false
  ) {
    super(message)
  }
}

function asCreation(value: unknown): StudioCreationRecord {
  return value as StudioCreationRecord
}

function asAsset(value: unknown): StudioAssetRecord {
  return value as StudioAssetRecord
}

function asProfile(value: unknown): StudioProfileRecord { return value as StudioProfileRecord }

function studioPublicFailureKind(
  code: string | null,
): StudioPublicFailureKind {
  if (!code) return null

  /*
   * OPENAI_400_moderation_blocked permet aussi de présenter correctement
   * les créations ayant échoué avant le déploiement de la normalisation.
   */
  if (
    code === "SAFETY_REFUSAL" ||
    code === "OPENAI_400_moderation_blocked"
  ) {
    return "SAFETY_REFUSAL"
  }

  if (code === "INVALID_IMAGE") {
    return "INVALID_IMAGE"
  }

  if (code === "ANALYSIS_TIMEOUT") {
    return "ANALYSIS_TIMEOUT"
  }

  if (code === "GENERATION_TIMEOUT") {
    return "GENERATION_TIMEOUT"
  }

  /*
   * Provider-specific billing/capacity details stay
   * private. Historical Kie codes remain readable so
   * creations persisted before normalization receive
   * the same generic public treatment.
   */
  if (
    code === "PROVIDER_UNAVAILABLE" ||
    code === "KIE_BILLING" ||
    code === "KIE_CREATE_REJECTED_402"
  ) {
    return "PROVIDER_UNAVAILABLE"
  }

  return "TECHNICAL_ERROR"
}

export function studioCreationPublic(creation: StudioCreationRecord): StudioCreationPublic {
  return {
    id: creation.id,
    studioProfileId: creation.studioProfileId,
    presetId: creation.presetId,
    sessionId: creation.sessionId ?? null,
    parentCreationId: creation.parentCreationId ?? null,
    shotIndex: creation.shotIndex ?? 0,
    shotIntent: creation.shotIntent ?? null,
    sourceResultIndex: creation.sourceResultIndex ?? null,
    status: creation.status === "MASTER_PROMPT_READY" ? "IDENTITY_READY" : creation.status,
    failureKind: studioPublicFailureKind(creation.failureCode),
    failureMessage: creation.failureMessage,
    createdAt: creation.createdAt,
    updatedAt: creation.updatedAt,
    completedAt: creation.completedAt,
    requestedResultCount: getMiravaSeriesSize(creation.creativeOptions),
  }
}

function profileName(presetId?: string | null): string {
  return getMiravaStudioPreset(presetId)?.name ?? "Mon studio"
}

function nowPlus24Hours(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

function studioKey(prefix: string, creationId?: string): string {
  return `${prefix}:${creationId ?? randomUUID()}`
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  return "jpg"
}

function isImageSignatureValid(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
}

export function isStudioImageMimeType(mimeType: string): mimeType is "image/jpeg" | "image/png" | "image/webp" {
  return mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp"
}

export async function validateStudioImage(buffer: Buffer, mimeType: string): Promise<void> {
  if (!isStudioImageMimeType(mimeType)) throw new StudioError("Format image non pris en charge.", "INVALID_IMAGE")
  if (buffer.length === 0 || buffer.length > MAX_STUDIO_IMAGE_BYTES) throw new StudioError("L’image doit faire moins de 10 Mo.", "INVALID_IMAGE")
  if (!isImageSignatureValid(buffer, mimeType)) throw new StudioError("Le fichier ne correspond pas à une image valide.", "INVALID_IMAGE")

  try {
    const metadata = await sharp(buffer, { failOn: "error" }).metadata()
    if (!metadata.width || !metadata.height || metadata.width < 128 || metadata.height < 128) {
      throw new StudioError("L’image est trop petite pour une analyse fiable.", "INVALID_IMAGE")
    }
  } catch (error) {
    if (error instanceof StudioError) throw error
    throw new StudioError("Le fichier image est invalide.", "INVALID_IMAGE")
  }
}

export async function getStudioCreationForUser(userId: string, creationId: string): Promise<StudioCreationRecord> {
  const creation = await db.studioCreation.findUnique({ where: { id: creationId, userId } })
  if (!creation) throw new StudioError("Création Studio introuvable.", "NOT_FOUND")
  return asCreation(creation)
}

export async function ensureStudioActivation(userId: string): Promise<number> {
  try {
    return await ensureMiravaActivation(userId)
  } catch (error) {
    if (error instanceof MiravaCreditError) throw new StudioError(error.message, error.code)
    throw error
  }
}

export async function applyStudioCreditDelta(args: {
  userId: string
  creationId?: string
  kind: CreditKind
  amount: number
  key: string
  stripeSessionId?: string
  metadata?: Record<string, unknown>
}): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("apply_studio_credit_delta", {
    p_user_id: args.userId,
    p_creation_id: args.creationId ?? "",
    p_kind: args.kind,
    p_amount: args.amount,
    p_key: args.key,
    p_stripe_session_id: args.stripeSessionId ?? "",
    p_metadata: args.metadata ?? {},
  })
  if (error) {
    if (error.message.includes("INSUFFICIENT_STUDIO_CREDITS")) {
      throw new StudioError("Vous n’avez plus de créations Studio disponibles.", "INSUFFICIENT_CREDITS")
    }
    throw new StudioError("Impossible de mettre à jour vos crédits Studio.", "CREDIT_ERROR")
  }
  return Number(data)
}

export async function createStudioCreation(args: {
  userId: string
  ageConfirmed: boolean
  rightsConfirmed: boolean
  privacyAccepted: boolean
  openaiDisclosureAccepted: boolean
  onboardingKey?: string
  presetId?: MiravaStudioPresetId
  creativeOptions?: Record<string, unknown>
}): Promise<StudioCreationRecord> {
  if (!args.ageConfirmed || !args.rightsConfirmed || !args.privacyAccepted || !args.openaiDisclosureAccepted) {
    throw new StudioError("Le consentement complet est requis avant l’utilisation du Studio.", "CONSENT_REQUIRED")
  }

  const officialBlueprint =
    args.presetId
      ? getMiravaOfficialUniverseBlueprint(
          args.presetId,
        )
      : undefined

  const preset =
    officialBlueprint
      ? {
          creativeDirectionSummary:
            `[MIRAVA_OFFICIAL_UNIVERSE ${officialBlueprint.id}@${officialBlueprint.version}] ${officialBlueprint.creativeDirectionSummary}`,
          masterPrompt:
            renderMiravaOfficialUniverseMasterPrompt(
              officialBlueprint,
            ),
          negativePrompt:
            officialBlueprint.negativeGuardrails,
        }
      : undefined

  const identityProfile =
    await db.studioIdentityProfile.findUnique({
      where: {
        userId:
          args.userId,
      },
    })

  let studioProfileId:
    string | null = null

  if (preset && args.presetId) {
    const existingProfile =
      await db.studioProfile.findFirst({
        where: {
          userId:
            args.userId,
          presetId:
            args.presetId,
          sourceCreationId:
            null,
        },
        orderBy: {
          createdAt:
            "asc",
        },
      })

    const currentProfile =
      existingProfile
        ? asProfile(
            existingProfile,
          )
        : null

    const profileNeedsRefresh =
      Boolean(currentProfile) &&
      (
        currentProfile
          ?.creativeDirectionSummary !==
          preset.creativeDirectionSummary ||
        currentProfile
          ?.masterPrompt !==
          preset.masterPrompt ||
        currentProfile
          ?.negativePrompt !==
          preset.negativePrompt
      )

    let createdProfile:
      StudioProfileRecord |
      null = null

    if (!currentProfile) {
      try {
        createdProfile =
          asProfile(
            await db.studioProfile.create({
              data: {
                userId:
                  args.userId,
                presetId:
                  args.presetId,
                name:
                  profileName(
                    args.presetId,
                  ),
                creativeDirectionSummary:
                  preset.creativeDirectionSummary,
                masterPrompt:
                  preset.masterPrompt,
                negativePrompt:
                  preset.negativePrompt,
              },
            }),
          )
      } catch (error) {
        const concurrentProfile =
          await db.studioProfile.findFirst({
            where: {
              userId:
                args.userId,
              presetId:
                args.presetId,
              sourceCreationId:
                null,
            },
            orderBy: {
              createdAt:
                "asc",
            },
          })

        if (!concurrentProfile) {
          throw error
        }

        createdProfile =
          asProfile(
            concurrentProfile,
          )
      }
    }

    const profile =
      createdProfile
        ? createdProfile
        : !currentProfile
        ? null
        : profileNeedsRefresh
          ? asProfile(
              await db.studioProfile.update({
                where: {
                  id:
                    currentProfile.id,
                  userId:
                    args.userId,
                },
                data: {
                  name:
                    profileName(
                      args.presetId,
                    ),
                  creativeDirectionSummary:
                    preset.creativeDirectionSummary,
                  masterPrompt:
                    preset.masterPrompt,
                  negativePrompt:
                    preset.negativePrompt,
                },
              }),
            )
          : currentProfile

    if (!profile) {
      throw new StudioError(
        "Le studio officiel n’a pas pu être préparé.",
        "INVALID_STATE",
      )
    }

    studioProfileId =
      profile.id
  }

  if (args.onboardingKey) {
    if (
      !preset ||
      !identityProfile ||
      !args.presetId
    ) {
      throw new StudioError(
        "La première séance MIRAVA n’est pas prête.",
        "INVALID_STATE",
      )
    }

    const { data, error } =
      await supabaseAdmin.rpc(
        "create_mirava_onboarding_creation",
        {
          p_user_id:
            args.userId,
          p_onboarding_key:
            args.onboardingKey,
          p_studio_profile_id:
            studioProfileId,
          p_identity_profile_id:
            identityProfile.id,
          p_preset_id:
            args.presetId,
          p_creative_options:
            args.creativeOptions ?? {},
          p_creative_direction_summary:
            preset.creativeDirectionSummary,
          p_master_prompt:
            preset.masterPrompt,
          p_negative_prompt:
            preset.negativePrompt,
          p_consent_version:
            STUDIO_CONSENT_VERSION,
        },
      )

    if (error) {
      throw new StudioError(
        "La première séance MIRAVA n’a pas pu être préparée.",
        "INVALID_STATE",
      )
    }

    const row =
      Array.isArray(data)
        ? data[0]
        : data

    const result =
      row as {
        creationId?: unknown
      } | null

    const creationId =
      typeof result
        ?.creationId ===
        "string"
        ? result.creationId
        : null

    if (!creationId) {
      throw new StudioError(
        "La première séance MIRAVA est incomplète.",
        "INVALID_STATE",
      )
    }

    return getStudioCreationForUser(
      args.userId,
      creationId,
    )
  }

  const session =
    await db.studioSession.create({
      data: {
        userId:
          args.userId,
        studioProfileId,
        identityProfileId:
          identityProfile?.id ??
          null,
        presetId:
          args.presetId ??
          null,
      },
    })

  try {
    const creation =
      asCreation(
        await db.studioCreation.create({
          data: {
            userId:
              args.userId,
            status:
              preset
                ? "MASTER_PROMPT_READY"
                : "DRAFT",
            studioProfileId,
            identityProfileId:
              identityProfile?.id ??
              null,
            presetId:
              args.presetId ??
              null,
            sessionId:
              session.id,
            shotIndex:
              0,
            creativeOptions:
              args.creativeOptions ??
              {},
            creativeDirectionSummary:
              preset
                ?.creativeDirectionSummary ??
              null,
            masterPrompt:
              preset?.masterPrompt ??
              null,
            negativePrompt:
              preset?.negativePrompt ??
              null,
          },
        }),
      )

    await db.studioConsent.create({
      data: {
        creationId:
          creation.id,
        userId:
          args.userId,
        version:
          STUDIO_CONSENT_VERSION,
        ageConfirmed:
          true,
        rightsConfirmed:
          true,
        privacyAccepted:
          true,
        openaiDisclosureAccepted:
          true,
      },
    })

    return creation
  } catch (error) {
    await db.studioSession.delete({
      where: {
        id:
          session.id,
        userId:
          args.userId,
      },
    })
    throw error
  }
}

export function studioProfilePublic(profile: StudioProfileRecord) {
  return { id: profile.id, name: profile.name, presetId: profile.presetId, createdAt: profile.createdAt, updatedAt: profile.updatedAt }
}

export async function listStudioProfiles(userId: string) {
  return (await db.studioProfile.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 })).map(asProfile).map(studioProfilePublic)
}

export async function createCreationFromStudioProfile(args: {
  userId: string
  studioProfileId: string
  creativeOptions?: Record<string, unknown>
}) {
  const storedProfile =
    asProfile(
      await db.studioProfile.findUnique({
        where: {
          id:
            args.studioProfileId,
          userId:
            args.userId,
        },
      }),
    )

  if (
    !storedProfile ||
    !storedProfile.masterPrompt
  ) {
    throw new StudioError(
      "Ce studio personnel n’est pas disponible.",
      "NOT_FOUND",
    )
  }

  const officialBlueprint =
    getMiravaOfficialUniverseBlueprint(
      storedProfile.presetId,
    )

  const canonicalSnapshot =
    officialBlueprint
      ? {
          creativeDirectionSummary:
            `[MIRAVA_OFFICIAL_UNIVERSE ${officialBlueprint.id}@${officialBlueprint.version}] ${officialBlueprint.creativeDirectionSummary}`,
          masterPrompt:
            renderMiravaOfficialUniverseMasterPrompt(
              officialBlueprint,
            ),
          negativePrompt:
            officialBlueprint.negativeGuardrails,
        }
      : null

  const profileNeedsRefresh =
    Boolean(
      canonicalSnapshot,
    ) &&
    (
      storedProfile
        .creativeDirectionSummary !==
        canonicalSnapshot
          ?.creativeDirectionSummary ||
      storedProfile
        .masterPrompt !==
        canonicalSnapshot
          ?.masterPrompt ||
      storedProfile
        .negativePrompt !==
        canonicalSnapshot
          ?.negativePrompt
    )

  const profile =
    profileNeedsRefresh &&
    canonicalSnapshot
      ? asProfile(
          await db.studioProfile.update({
            where: {
              id:
                storedProfile.id,
              userId:
                args.userId,
            },
            data: {
              creativeDirectionSummary:
                canonicalSnapshot
                  .creativeDirectionSummary,
              masterPrompt:
                canonicalSnapshot
                  .masterPrompt,
              negativePrompt:
                canonicalSnapshot
                  .negativePrompt,
            },
          }),
        )
      : storedProfile

  const identityProfile =
    await db.studioIdentityProfile.findUnique({
      where: {
        userId:
          args.userId,
      },
    })

  const session =
    await db.studioSession.create({
      data: {
        userId:
          args.userId,
        studioProfileId:
          profile.id,
        identityProfileId:
          identityProfile?.id ??
          null,
        presetId:
          profile.presetId,
      },
    })

  try {
    return asCreation(
      await db.studioCreation.create({
        data: {
          userId:
            args.userId,
          studioProfileId:
            profile.id,
          identityProfileId:
            identityProfile?.id ??
            null,
          presetId:
            profile.presetId,
          sessionId:
            session.id,
          shotIndex:
            0,
          creativeOptions:
            args.creativeOptions ??
            {},
          status:
            "MASTER_PROMPT_READY",
          creativeDirectionSummary:
            profile
              .creativeDirectionSummary,
          masterPrompt:
            profile.masterPrompt,
          negativePrompt:
            profile.negativePrompt,
        },
      }),
    )
  } catch (error) {
    await db.studioSession.delete({
      where: {
        id:
          session.id,
        userId:
          args.userId,
      },
    })
    throw error
  }
}

async function ensureStudioSessionForCreation(
  creation: StudioCreationRecord,
): Promise<string> {
  if (creation.sessionId) {
    return creation.sessionId
  }

  const session =
    await db.studioSession.create({
      data: {
        userId:
          creation.userId,
        studioProfileId:
          creation.studioProfileId ??
          null,
        identityProfileId:
          creation.identityProfileId ??
          null,
        presetId:
          creation.presetId ??
          null,
      },
    })

  await db.studioCreation.update({
    where: {
      id:
        creation.id,
      userId:
        creation.userId,
    },
    data: {
      sessionId:
        session.id,
      shotIndex:
        creation.shotIndex ??
        0,
    },
  })

  return session.id
}

export async function continueStudioCreation(args: {
  userId: string
  sourceCreationId: string
  // `intent` remains for internal/backward-compatible callers.
  intent?: MiravaShotIntent
  intents?: MiravaShotIntent[]
  customInstruction?: string
  sourceResultIndex?: number
}): Promise<StudioCreationRecord> {
  const source =
    await getStudioCreationForUser(
      args.userId,
      args.sourceCreationId,
    )

  if (
    source.status !==
      "COMPLETED" ||
    !source.masterPrompt
      ?.trim()
  ) {
    throw new StudioError(
      "Cette séance doit être terminée avant de créer un nouveau cliché.",
      "INVALID_STATE",
    )
  }

  if (
    await isMiravaDiscoveryResultLocked(
      args.userId,
      source.id,
    )
  ) {
    throw new StudioError(
      "Débloquez cette séance avant de la continuer.",
      "PAYMENT_REQUIRED",
    )
  }

  const parsedDirective =
    miravaContinuationDirectiveSchema
      .safeParse({
        intents:
          args.intents ??
          (
            args.intent
              ? [args.intent]
              : []
          ),
        customInstruction:
          args.customInstruction
            ?.trim() ||
          undefined,
      })

  if (!parsedDirective.success) {
    throw new StudioError(
      "Choisissez au moins une variation ou ajoutez une directive personnalisée de 500 caractères maximum.",
      "INVALID_STATE",
    )
  }

  const continuationDirective =
    parsedDirective.data

  const sourceResults =
    await getStudioAssets(
      source.id,
      "RESULT",
    )

  const sourceResultIndex =
    args.sourceResultIndex ??
    0

  if (
    !Number.isInteger(
      sourceResultIndex,
    ) ||
    sourceResultIndex <
      0 ||
    sourceResultIndex >=
      sourceResults.length
  ) {
    throw new StudioError(
      "Le cliché de continuité est introuvable.",
      "NOT_FOUND",
    )
  }

  const sessionId =
    await ensureStudioSessionForCreation(
      source,
    )

  const latestShot =
    await db.studioCreation.findFirst({
      where: {
        userId:
          args.userId,
        sessionId,
      },
      orderBy: {
        shotIndex:
          "desc",
      },
    })

  const shotIndex =
    Number(
      latestShot
        ?.shotIndex ??
      0,
    ) + 1

  const parsedOptions =
    miravaCreativeOptionsSchema
      .strip()
      .parse(
        source.creativeOptions ??
        {},
      )

  const {
    seriesStrategy:
      _seriesStrategy,
    variationAxes:
      _variationAxes,
    ...baseOptions
  } = parsedOptions

  const sourceConsent =
    await db.studioConsent.findUnique({
      where: {
        creationId:
          source.id,
        userId:
          args.userId,
      },
    })

  const continuation =
    asCreation(
      await db.studioCreation.create({
        data: {
          userId:
            args.userId,
          studioProfileId:
            source.studioProfileId ??
            null,
          identityProfileId:
            source.identityProfileId ??
            null,
          presetId:
            source.presetId ??
            null,
          sessionId,
          parentCreationId:
            source.id,
          shotIndex,
          // Keep one primary intent in the legacy column for compatibility
          // and analytics. The composite request lives in creativeOptions.
          shotIntent:
            continuationDirective
              .intents[0] ??
            null,
          sourceResultIndex,
          creativeOptions: {
            ...baseOptions,
            seriesSize:
              1,
            referenceMode:
              "faithful",
            continuation: {
              intents:
                continuationDirective
                  .intents,
              ...(
                continuationDirective
                  .customInstruction
                  ? {
                      customInstruction:
                        continuationDirective
                          .customInstruction,
                    }
                  : {}
              ),
            },
          },
          status:
            "MASTER_PROMPT_READY",
          creativeDirectionSummary:
            source.creativeDirectionSummary,
          masterPrompt:
            source.masterPrompt,
          negativePrompt:
            source.negativePrompt,
        },
      }),
    )

  try {
    if (sourceConsent) {
      await db.studioConsent.create({
        data: {
          creationId:
            continuation.id,
          userId:
            args.userId,
          version:
            sourceConsent.version,
          ageConfirmed:
            sourceConsent.ageConfirmed,
          rightsConfirmed:
            sourceConsent.rightsConfirmed,
          privacyAccepted:
            sourceConsent.privacyAccepted,
          openaiDisclosureAccepted:
            sourceConsent.openaiDisclosureAccepted,
        },
      })
    }

    await queueStudioGeneration({
      userId:
        args.userId,
      creationId:
        continuation.id,
    })
  } catch (error) {
    await db.studioCreation.delete({
      where: {
        id:
          continuation.id,
        userId:
          args.userId,
      },
    })
    throw error
  }

  return getStudioCreationForUser(
    args.userId,
    continuation.id,
  )
}

/**
 * Applies client-approved creative choices to a creation before it enters the
 * generation queue. This is deliberately separate from the private prompts:
 * only the bounded client-facing choices are persisted here.
 */
export async function updateStudioCreationCreativeOptions(args: {
  userId: string
  creationId: string
  creativeOptions: MiravaCreativeOptions
}): Promise<StudioCreationPublic> {
  const creation = await getStudioCreationForUser(args.userId, args.creationId)
  const editableStatuses: StudioStatus[] = ["DRAFT", "ANALYSIS_QUEUED", "ANALYSING", "MASTER_PROMPT_READY"]
  if (!editableStatuses.includes(creation.status)) {
    throw new StudioError("La direction ne peut plus être modifiée après le lancement de la génération.", "INVALID_STATE")
  }

  const existingOptions = miravaCreativeOptionsSchema.strip().parse(creation.creativeOptions ?? {})
  const updated = asCreation(await db.studioCreation.update({
    where: { id: creation.id, userId: args.userId },
    data: { creativeOptions: { ...existingOptions, ...args.creativeOptions } },
  }))
  return studioCreationPublic(updated)
}

function resolveMiravaIdentityViewKey(
  value: unknown,
  fallbackIndex: number,
): MiravaIdentityViewKey {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return miravaLegacyIdentityViewKey(
      fallbackIndex,
    )
  }

  if (!isMiravaIdentityViewKey(value)) {
    throw new StudioError(
      "La vue du Profil identité est invalide.",
      "INVALID_FILE",
    )
  }

  return value
}

const MIRAVA_FACE_GEOMETRY_VIEW_KEYS =
  new Set<MiravaIdentityViewKey>([
    "front",
    "angle",
    "profile_right",
    "smile",
  ])

function normalizeMiravaIdentityFaceGeometryForView(
  value: unknown,
  viewKey:
    MiravaIdentityViewKey |
    null,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null
  }

  /*
   * Browser geometry is untrusted input.
   *
   * A body PoseLandmarker box or a traits photo must
   * never be persisted as facial geometry, even if
   * the payload itself has valid normalized numbers.
   */
  if (
    !viewKey ||
    !MIRAVA_FACE_GEOMETRY_VIEW_KEYS
      .has(viewKey)
  ) {
    throw new StudioError(
      "Cette vue du Profil identité ne peut pas contenir de géométrie faciale.",
      "INVALID_FILE",
    )
  }

  const parsed =
    parseMiravaIdentityFaceGeometry(
      value,
    )

  if (!parsed) {
    throw new StudioError(
      "La géométrie faciale de la photo identité est invalide.",
      "INVALID_FILE",
    )
  }

  return parsed
}

function normalizeMiravaIdentityAssets(
  assets: StudioIdentityAssetRecord[],
): Array<
  StudioIdentityAssetRecord & {
    viewKey: MiravaIdentityViewKey
  }
> {
  return assets.map(
    (asset, index) => ({
      ...asset,
      viewKey:
        resolveMiravaIdentityViewKey(
          asset.viewKey,
          index,
        ),
    }),
  )
}

function assertNoDuplicateSingularIdentityViews(
  viewKeys: MiravaIdentityViewKey[],
): void {
  const singular =
    viewKeys.filter(
      (viewKey) =>
        viewKey !== "tattoos",
    )

  if (
    new Set(singular).size !==
    singular.length
  ) {
    throw new StudioError(
      "Une même vue du Profil identité ne peut être enregistrée qu’une fois.",
      "INVALID_FILE",
    )
  }
}

export async function getIdentityProfilePublic(
  userId: string,
) {
  const profile =
    await db.studioIdentityProfile
      .findUnique({
        where: { userId },
      })

  if (!profile) return null

  const rawAssets =
    await db.studioIdentityAsset
      .findMany({
        where: {
          identityProfileId:
            profile.id,
          userId,
        },
        orderBy: {
          createdAt: "asc",
        },
      }) as StudioIdentityAssetRecord[]

  const assets =
    normalizeMiravaIdentityAssets(
      rawAssets,
    )

  const previews =
    await Promise.all(
      assets.map(
        async (asset) => {
          const { data } =
            await supabaseAdmin.storage
              .from(STUDIO_BUCKET)
              .createSignedUrl(
                asset.storagePath,
                600,
              )

          return data?.signedUrl
            ? {
                id: asset.id,
                url: data.signedUrl,
                createdAt:
                  asset.createdAt,
                viewKey:
                  asset.viewKey,
              }
            : null
        },
      ),
    )

  return {
    id: profile.id as string,
    assetCount: assets.length,
    updatedAt:
      profile.updatedAt as string,
    viewKeys: assets.map(
      (asset) => asset.viewKey,
    ),
    previews: previews.filter(
      (
        preview,
      ): preview is NonNullable<
        typeof preview
      > => preview !== null,
    ),
  }
}

async function invalidateMiravaIdentityManifests(
  identityProfileId: string,
  userId: string,
): Promise<void> {
  const { error } =
    await supabaseAdmin
      .from(
        "StudioIdentityManifest",
      )
      .delete()
      .eq(
        "identityProfileId",
        identityProfileId,
      )
      .eq("userId", userId)

  if (error) {
    throw new StudioError(
      "Les manifestes dérivés du Profil identité n’ont pas pu être invalidés.",
      "IDENTITY_MANIFEST_INVALIDATION_ERROR",
      true,
    )
  }
}

export async function replaceIdentityProfile(args: {
  userId: string
  creationId?: string
  ageConfirmed?: boolean
  rightsConfirmed?: boolean
  retentionAccepted?: boolean
  files: Array<{
    mimeType: string
    buffer: Buffer
    viewKey?: string | null
    faceGeometry?: unknown
  }>
}) {
  if (
    args.files.length <
      MIN_IDENTITY_ASSETS ||
    args.files.length >
      MAX_IDENTITY_ASSETS
  ) {
    throw new StudioError(
      "Ajoutez entre trois et dix photos d’identité.",
      "IDENTITY_REQUIRED",
    )
  }

  if (args.creationId) {
    await getStudioCreationForUser(
      args.userId,
      args.creationId,
    )

    const consent =
      await db.studioConsent
        .findUnique({
          where: {
            creationId:
              args.creationId,
            userId:
              args.userId,
          },
        })

    if (!consent) {
      throw new StudioError(
        "Le consentement complet est requis.",
        "CONSENT_REQUIRED",
      )
    }
  } else if (
    !args.ageConfirmed ||
    !args.rightsConfirmed ||
    !args.retentionAccepted
  ) {
    throw new StudioError(
      "Le consentement complet est requis avant la création du Profil identité.",
      "CONSENT_REQUIRED",
    )
  }

  const normalizedFiles =
    args.files.map(
      (file, index) => {
        const viewKey =
          resolveMiravaIdentityViewKey(
            file.viewKey,
            index,
          )

        return {
          ...file,
          viewKey,
          faceGeometry:
            normalizeMiravaIdentityFaceGeometryForView(
              file.faceGeometry,
              viewKey,
            ),
        }
      },
    )

  const viewKeys =
    normalizedFiles.map(
      (file) => file.viewKey,
    )

  assertNoDuplicateSingularIdentityViews(
    viewKeys,
  )

  for (
    const requiredViewKey of
      MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS
  ) {
    if (
      !viewKeys.includes(
        requiredViewKey,
      )
    ) {
      throw new StudioError(
        "Les trois vues essentielles du Profil identité sont requises.",
        "IDENTITY_REQUIRED",
      )
    }
  }

  for (const file of normalizedFiles) {
    await validateStudioImage(
      file.buffer,
      file.mimeType,
    )
  }

  const existing =
    await db.studioIdentityProfile
      .findUnique({
        where: {
          userId: args.userId,
        },
      })

  const oldAssets =
    existing
      ? await db.studioIdentityAsset
          .findMany({
            where: {
              identityProfileId:
                existing.id,
            },
          })
      : []

  if (oldAssets.length) {
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove(
        oldAssets.map(
          (
            asset:
              StudioIdentityAssetRecord,
          ) => asset.storagePath,
        ),
      )
  }

  if (existing) {
    await db.studioIdentityAsset
      .deleteMany({
        where: {
          identityProfileId:
            existing.id,
        },
      })
  }

  const profile =
    existing
      ? await db.studioIdentityProfile
          .update({
            where: {
              id: existing.id,
              userId: args.userId,
            },
            data: {
              retentionAcceptedAt:
                new Date()
                  .toISOString(),
            },
          })
      : await db.studioIdentityProfile
          .create({
            data: {
              userId: args.userId,
              retentionAcceptedAt:
                new Date()
                  .toISOString(),
            },
          })

  for (const file of normalizedFiles) {
    const id = randomUUID()
    const storagePath =
      `${args.userId}/identity-profile/` +
      `${id}.` +
      extensionForMime(
        file.mimeType,
      )

    const { error } =
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .upload(
          storagePath,
          file.buffer,
          {
            contentType:
              file.mimeType,
            upsert: false,
          },
        )

    if (error) {
      throw new StudioError(
        "Le stockage sécurisé de l’image a échoué.",
        "STORAGE_ERROR",
      )
    }

    await db.studioIdentityAsset
      .create({
        data: {
          id,
          identityProfileId:
            profile.id,
          userId: args.userId,
          viewKey: file.viewKey,
          faceGeometry:
            file.faceGeometry,
          storagePath,
          mimeType:
            file.mimeType,
          bytes:
            file.buffer.length,
        },
      })
  }

  await invalidateMiravaIdentityManifests(
    profile.id,
    args.userId,
  )

  await refreshIdentityMorphologyForProfile({
    userId:
      args.userId,
    profileId:
      profile.id,
  })

  if (args.creationId) {
    const linkedCreation =
      asCreation(
        await db.studioCreation
          .update({
            where: {
              id: args.creationId,
              userId:
                args.userId,
            },
            data: {
              identityProfileId:
                profile.id,
            },
          }),
      )

    if (
      linkedCreation.status ===
        "MASTER_PROMPT_READY" &&
      canAutoGenerateMiravaCreation(
        normalizedFiles.length,
      )
    ) {
      try {
        await queueStudioGeneration({
          userId: args.userId,
          creationId:
            linkedCreation.id,
        })
      } catch {
        // Le profil reste durable et la création récupérable.
      }
    }
  }

  return getIdentityProfilePublic(
    args.userId,
  )
}

export async function replaceIdentityProfileFromStagedUploads(args: {
  userId: string
  creationId?: string
  batchId: string
  ageConfirmed?: boolean
  rightsConfirmed?: boolean
  retentionAccepted?: boolean
  uploads: Array<{
    path: string
    mimeType: string
    bytes: number
    viewKey?: string | null
    faceGeometry?: unknown
  }>
}) {
  if (
    args.uploads.length < MIN_IDENTITY_ASSETS ||
    args.uploads.length > MAX_IDENTITY_ASSETS
  ) {
    throw new StudioError(
      "Ajoutez entre trois et dix photos d’identité.",
      "IDENTITY_REQUIRED",
    )
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      args.batchId,
    )
  ) {
    throw new StudioError(
      "La session d’envoi du Profil identité est invalide.",
      "INVALID_STATE",
    )
  }

  const prefix =
    `${args.userId}/identity-staging/` +
    `${args.batchId}/`

  const paths = args.uploads.map(
    (upload) => upload.path,
  )

  if (
    new Set(paths).size !== paths.length ||
    paths.some(
      (path) =>
        !path.startsWith(prefix) ||
        path.includes(".."),
    )
  ) {
    throw new StudioError(
      "Une référence d’image privée est invalide.",
      "FORBIDDEN",
    )
  }

  const files: Array<{
    mimeType: string
    buffer: Buffer
    viewKey?: string | null
    faceGeometry?: unknown
  }> = []

  try {
    for (const upload of args.uploads) {
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(upload.mimeType) ||
        !Number.isInteger(upload.bytes) ||
        upload.bytes < 1 ||
        upload.bytes > MAX_STUDIO_IMAGE_BYTES
      ) {
        throw new StudioError(
          "Une photo préparée est invalide.",
          "INVALID_FILE",
        )
      }

      const { data, error } =
        await supabaseAdmin.storage
          .from(STUDIO_BUCKET)
          .download(upload.path)

      if (error || !data) {
        throw new StudioError(
          "Une photo privée n’a pas été reçue complètement.",
          "STORAGE_ERROR",
          true,
        )
      }

      const buffer = Buffer.from(
        await data.arrayBuffer(),
      )

      if (
        buffer.length !== upload.bytes ||
        buffer.length >
          MAX_STUDIO_IMAGE_BYTES
      ) {
        throw new StudioError(
          "L’intégrité d’une photo privée n’a pas pu être confirmée.",
          "INVALID_FILE",
        )
      }

      files.push({
        mimeType: upload.mimeType,
        buffer,
        viewKey: upload.viewKey,
        faceGeometry:
          upload.faceGeometry,
      })
    }

    return await replaceIdentityProfile({
      userId: args.userId,
      creationId: args.creationId,
      ageConfirmed: args.ageConfirmed,
      rightsConfirmed: args.rightsConfirmed,
      retentionAccepted:
        args.retentionAccepted,
      files,
    })
  } finally {
    if (paths.length > 0) {
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .remove(paths)
    }
  }
}

export async function appendIdentityProfileFromStagedUploads(args: {
  userId: string
  creationId?: string
  batchId: string
  ageConfirmed?: boolean
  rightsConfirmed?: boolean
  retentionAccepted?: boolean
  uploads: Array<{
    path: string
    mimeType: string
    bytes: number
    viewKey?: string | null
    faceGeometry?: unknown
  }>
}) {
  if (
    args.uploads.length < 1 ||
    args.uploads.length > MAX_IDENTITY_ASSETS
  ) {
    throw new StudioError(
      "Ajoutez au moins une photo d’identité.",
      "IDENTITY_REQUIRED",
    )
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      args.batchId,
    )
  ) {
    throw new StudioError(
      "La session d’envoi est invalide.",
      "INVALID_STATE",
    )
  }

  const prefix =
    `${args.userId}/identity-staging/` +
    `${args.batchId}/`

  const paths = args.uploads.map(
    (upload) => upload.path,
  )

  if (
    new Set(paths).size !== paths.length ||
    paths.some(
      (path) =>
        !path.startsWith(prefix) ||
        path.includes(".."),
    )
  ) {
    throw new StudioError(
      "Une référence d’image privée est invalide.",
      "FORBIDDEN",
    )
  }

  const files: Array<{
    mimeType: string
    buffer: Buffer
    viewKey?: string | null
    faceGeometry?: unknown
  }> = []

  try {
    for (const upload of args.uploads) {
      const { data, error } =
        await supabaseAdmin.storage
          .from(STUDIO_BUCKET)
          .download(upload.path)

      if (error || !data) {
        throw new StudioError(
          "Une photo privée n’a pas été reçue.",
          "STORAGE_ERROR",
          true,
        )
      }

      const buffer = Buffer.from(
        await data.arrayBuffer(),
      )

      if (
        buffer.length !== upload.bytes ||
        buffer.length >
          MAX_STUDIO_IMAGE_BYTES
      ) {
        throw new StudioError(
          "L’intégrité d’une photo n’a pas pu être confirmée.",
          "INVALID_FILE",
        )
      }

      await validateStudioImage(
        buffer,
        upload.mimeType,
      )

      files.push({
        mimeType: upload.mimeType,
        buffer,
        viewKey: upload.viewKey,
        faceGeometry:
          upload.faceGeometry,
      })
    }

    return await appendIdentityProfile({
      userId: args.userId,
      creationId: args.creationId,
      ageConfirmed: args.ageConfirmed,
      rightsConfirmed: args.rightsConfirmed,
      retentionAccepted:
        args.retentionAccepted,
      files,
    })
  } finally {
    if (paths.length > 0) {
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .remove(paths)
    }
  }
}

export async function replaceIdentityAssetFromStagedUpload(args: {
  userId: string
  assetId: string
  batchId: string
  upload: {
    path: string
    mimeType: string
    bytes: number
    faceGeometry?: unknown
  }
}) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      args.batchId,
    )
  ) {
    throw new StudioError(
      "La session de remplacement est invalide.",
      "INVALID_STATE",
    )
  }

  const prefix =
    `${args.userId}/identity-staging/` +
    `${args.batchId}/`

  if (
    !args.upload.path.startsWith(prefix) ||
    args.upload.path.includes("..")
  ) {
    throw new StudioError(
      "La référence privée est invalide.",
      "FORBIDDEN",
    )
  }

  const profile =
    await db.studioIdentityProfile.findUnique({
      where: {
        userId: args.userId,
      },
    })

  if (!profile) {
    throw new StudioError(
      "Profil identité introuvable.",
      "NOT_FOUND",
    )
  }

  const asset =
    await db.studioIdentityAsset.findFirst({
      where: {
        id: args.assetId,
        userId: args.userId,
        identityProfileId: profile.id,
      },
    })

  if (!asset) {
    throw new StudioError(
      "Photo identité introuvable.",
      "NOT_FOUND",
    )
  }

  try {
    const { data, error } =
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .download(args.upload.path)

    if (error || !data) {
      throw new StudioError(
        "La nouvelle photo privée n’a pas été reçue.",
        "STORAGE_ERROR",
        true,
      )
    }

    const buffer = Buffer.from(
      await data.arrayBuffer(),
    )

    if (
      buffer.length !== args.upload.bytes ||
      buffer.length >
        MAX_STUDIO_IMAGE_BYTES
    ) {
      throw new StudioError(
        "L’intégrité de la nouvelle photo est invalide.",
        "INVALID_FILE",
      )
    }

    await validateStudioImage(
      buffer,
      args.upload.mimeType,
    )

    const assetViewKey =
      isMiravaIdentityViewKey(
        asset.viewKey,
      )
        ? asset.viewKey
        : null

    const nextFaceGeometry =
      normalizeMiravaIdentityFaceGeometryForView(
        args.upload.faceGeometry,
        assetViewKey,
      )

    const nextStoragePath =
      `${args.userId}/identity-profile/` +
      `${randomUUID()}.` +
      extensionForMime(args.upload.mimeType)

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .upload(
          nextStoragePath,
          buffer,
          {
            contentType: args.upload.mimeType,
            upsert: false,
          },
        )

    if (uploadError) {
      throw new StudioError(
        "Le stockage de la nouvelle photo a échoué.",
        "STORAGE_ERROR",
      )
    }

    try {
      await db.$transaction([
        db.studioIdentityAsset.update({
          where: {
            id: asset.id,
          },
          data: {
            storagePath: nextStoragePath,
            mimeType: args.upload.mimeType,
            bytes: buffer.length,
            faceGeometry:
              nextFaceGeometry,
          },
        }),
        db.studioIdentityProfile.update({
          where: {
            id: profile.id,
          },
          data: {
            retentionAcceptedAt:
              new Date().toISOString(),
          },
        }),
      ])
    } catch (error) {
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .remove([nextStoragePath])

      throw error
    }

    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove([asset.storagePath])

    await invalidateMiravaIdentityManifests(
      profile.id,
      args.userId,
    )

    await refreshIdentityMorphologyForProfile({
      userId:
        args.userId,
      profileId:
        profile.id,
    })

    return getIdentityProfilePublic(
      args.userId,
    )
  } finally {
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove([args.upload.path])
  }
}

export async function deleteIdentityAsset(args: {
  userId: string
  assetId: string
}) {
  const profile =
    await db.studioIdentityProfile.findUnique({
      where: {
        userId: args.userId,
      },
    })

  if (!profile) {
    throw new StudioError(
      "Profil identité introuvable.",
      "NOT_FOUND",
    )
  }

  const rawAssets =
    await db.studioIdentityAsset.findMany({
      where: {
        identityProfileId: profile.id,
        userId: args.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    }) as StudioIdentityAssetRecord[]

  if (
    rawAssets.length <=
    MIN_IDENTITY_ASSETS
  ) {
    throw new StudioError(
      "Conservez au moins trois photos. Remplacez une photo au lieu de la supprimer.",
      "IDENTITY_REQUIRED",
    )
  }

  const assets =
    normalizeMiravaIdentityAssets(
      rawAssets,
    )

  const asset = assets.find(
    (candidate) =>
      candidate.id ===
      args.assetId,
  )

  if (!asset) {
    throw new StudioError(
      "Photo identité introuvable.",
      "NOT_FOUND",
    )
  }

  if (
    (
      MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS as
        readonly MiravaIdentityViewKey[]
    ).includes(asset.viewKey)
  ) {
    throw new StudioError(
      "Une vue essentielle ne peut pas être supprimée. Remplacez-la directement.",
      "IDENTITY_REQUIRED",
    )
  }

  const { error: storageError } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove([
        asset.storagePath,
      ])

  if (storageError) {
    throw new StudioError(
      "La suppression sécurisée de la photo a échoué.",
      "STORAGE_ERROR",
      true,
    )
  }

  await db.$transaction([
    db.studioIdentityAsset.delete({
      where: {
        id: asset.id,
      },
    }),
    db.studioIdentityProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        retentionAcceptedAt:
          new Date()
            .toISOString(),
      },
    }),
  ])

  await invalidateMiravaIdentityManifests(
    profile.id,
    args.userId,
  )

  await refreshIdentityMorphologyForProfile({
    userId:
      args.userId,
    profileId:
      profile.id,
  })

  return getIdentityProfilePublic(
    args.userId,
  )
}

export async function appendIdentityProfile(args: {
  userId: string
  creationId?: string
  ageConfirmed?: boolean
  rightsConfirmed?: boolean
  retentionAccepted?: boolean
  files: Array<{
    mimeType: string
    buffer: Buffer
    viewKey?: string | null
    faceGeometry?: unknown
  }>
}) {
  if (args.files.length < 1) {
    throw new StudioError(
      "Ajoutez au moins une photo d’identité.",
      "IDENTITY_REQUIRED",
    )
  }

  if (
    !args.ageConfirmed ||
    !args.rightsConfirmed ||
    !args.retentionAccepted
  ) {
    throw new StudioError(
      "Le consentement complet est requis avant l’ajout au Profil identité.",
      "CONSENT_REQUIRED",
    )
  }

  if (args.creationId) {
    await getStudioCreationForUser(
      args.userId,
      args.creationId,
    )
  }

  const profile =
    await db.studioIdentityProfile
      .findUnique({
        where: {
          userId: args.userId,
        },
      })

  if (!profile) {
    throw new StudioError(
      "Créez d’abord votre Profil identité.",
      "IDENTITY_REQUIRED",
    )
  }

  const rawExistingAssets =
    await db.studioIdentityAsset
      .findMany({
        where: {
          identityProfileId:
            profile.id,
          userId:
            args.userId,
        },
        orderBy: {
          createdAt: "asc",
        },
      }) as StudioIdentityAssetRecord[]

  if (
    rawExistingAssets.length +
      args.files.length >
    MAX_IDENTITY_ASSETS
  ) {
    throw new StudioError(
      "Dix photos d’identité maximum sont autorisées.",
      "ASSET_LIMIT",
    )
  }

  const existingAssets =
    normalizeMiravaIdentityAssets(
      rawExistingAssets,
    )

  const normalizedFiles =
    args.files.map(
      (file, index) => {
        const viewKey =
          resolveMiravaIdentityViewKey(
            file.viewKey,
            rawExistingAssets.length +
              index,
          )

        return {
          ...file,
          viewKey,
          faceGeometry:
            normalizeMiravaIdentityFaceGeometryForView(
              file.faceGeometry,
              viewKey,
            ),
        }
      },
    )

  assertNoDuplicateSingularIdentityViews(
    normalizedFiles.map(
      (file) => file.viewKey,
    ),
  )

  const existingSingular =
    new Set(
      existingAssets
        .map(
          (asset) =>
            asset.viewKey,
        )
        .filter(
          (viewKey) =>
            viewKey !==
            "tattoos",
        ),
    )

  for (const file of normalizedFiles) {
    if (
      file.viewKey !==
        "tattoos" &&
      existingSingular.has(
        file.viewKey,
      )
    ) {
      throw new StudioError(
        "Cette vue existe déjà dans le Profil identité. Remplacez-la au lieu de l’ajouter.",
        "INVALID_STATE",
      )
    }

    await validateStudioImage(
      file.buffer,
      file.mimeType,
    )
  }

  const uploadedPaths:
    string[] = []
  const createdIds:
    string[] = []

  try {
    for (
      const file of
        normalizedFiles
    ) {
      const id = randomUUID()
      const storagePath =
        `${args.userId}/identity-profile/` +
        `${id}.` +
        extensionForMime(
          file.mimeType,
        )

      const { error } =
        await supabaseAdmin.storage
          .from(STUDIO_BUCKET)
          .upload(
            storagePath,
            file.buffer,
            {
              contentType:
                file.mimeType,
              upsert: false,
            },
          )

      if (error) {
        throw new StudioError(
          "Le stockage sécurisé de l’image a échoué.",
          "STORAGE_ERROR",
        )
      }

      uploadedPaths.push(
        storagePath,
      )

      await db.studioIdentityAsset
        .create({
          data: {
            id,
            identityProfileId:
              profile.id,
            userId:
              args.userId,
            viewKey:
              file.viewKey,
            faceGeometry:
              file.faceGeometry,
            storagePath,
            mimeType:
              file.mimeType,
            bytes:
              file.buffer.length,
          },
        })

      createdIds.push(id)
    }
  } catch (error) {
    if (createdIds.length) {
      await db.studioIdentityAsset
        .deleteMany({
          where: {
            id: {
              in: createdIds,
            },
            userId:
              args.userId,
          },
        })
    }

    if (uploadedPaths.length) {
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .remove(
          uploadedPaths,
        )
    }

    throw error
  }

  await db.studioIdentityProfile
    .update({
      where: {
        id: profile.id,
        userId: args.userId,
      },
      data: {
        retentionAcceptedAt:
          new Date()
            .toISOString(),
      },
    })

  await invalidateMiravaIdentityManifests(
    profile.id,
    args.userId,
  )

  await refreshIdentityMorphologyForProfile({
    userId:
      args.userId,
    profileId:
      profile.id,
  })

  if (args.creationId) {
    await db.studioCreation
      .update({
        where: {
          id: args.creationId,
          userId:
            args.userId,
        },
        data: {
          identityProfileId:
            profile.id,
        },
      })
  }

  return getIdentityProfilePublic(
    args.userId,
  )
}

export async function deleteIdentityProfile(userId: string): Promise<void> {
  const profile = await db.studioIdentityProfile.findUnique({ where: { userId } })
  if (!profile) return
  const assets = await db.studioIdentityAsset.findMany({ where: { identityProfileId: profile.id } }) as StudioIdentityAssetRecord[]
  if (assets.length) await supabaseAdmin.storage.from(STUDIO_BUCKET).remove(assets.map((asset) => asset.storagePath))
  await db.studioIdentityProfile.delete({ where: { id: profile.id, userId } })
}

export async function uploadStudioAsset(args: {
  userId: string
  creationId: string
  kind: "REFERENCE" | "IDENTITY"
  mimeType: string
  buffer: Buffer
  referenceFaceGeometry?: unknown
}): Promise<StudioAssetRecord> {
  const creation = await getStudioCreationForUser(args.userId, args.creationId)
  if (creation.status !== "DRAFT" && !(creation.status === "MASTER_PROMPT_READY" && args.kind === "IDENTITY")) {
    throw new StudioError("Cette étape ne peut plus recevoir de fichier.", "INVALID_STATE")
  }
  await validateStudioImage(args.buffer, args.mimeType)

  if (
    args.kind !== "REFERENCE" &&
    args.referenceFaceGeometry !==
      undefined &&
    args.referenceFaceGeometry !==
      null
  ) {
    throw new StudioError(
      "La géométrie faciale artistique ne peut être associée qu’à une référence.",
      "INVALID_FILE",
    )
  }

  const referenceFaceGeometry =
    args.kind === "REFERENCE" &&
    args.referenceFaceGeometry !==
      undefined &&
    args.referenceFaceGeometry !==
      null
      ? parseMiravaIdentityFaceGeometry(
          args.referenceFaceGeometry,
        )
      : null

  if (
    args.kind === "REFERENCE" &&
    args.referenceFaceGeometry !==
      undefined &&
    args.referenceFaceGeometry !==
      null &&
    !referenceFaceGeometry
  ) {
    throw new StudioError(
      "La géométrie faciale de la référence est invalide.",
      "INVALID_FILE",
    )
  }

  const existingAssets = (await db.studioAsset.findMany({ where: { creationId: args.creationId, kind: args.kind, deletedAt: null } })).map(asAsset)
  if (args.kind === "REFERENCE" && existingAssets.length >= 1) throw new StudioError("Une seule photo de référence est autorisée.", "ASSET_LIMIT")
  if (args.kind === "IDENTITY" && existingAssets.length >= MAX_IDENTITY_ASSETS) throw new StudioError("Dix photos d’identité maximum sont autorisées.", "ASSET_LIMIT")

  const id = randomUUID()
  const storagePath = `${args.userId}/${args.creationId}/${args.kind.toLowerCase()}-${id}.${extensionForMime(args.mimeType)}`
  const { error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).upload(storagePath, args.buffer, {
    contentType: args.mimeType,
    upsert: false,
  })
  if (error) throw new StudioError("Le stockage sécurisé de l’image a échoué.", "STORAGE_ERROR")

  try {
    return asAsset(await db.studioAsset.create({
      data: {
        id,
        creationId: args.creationId,
        userId: args.userId,
        kind: args.kind,
        storagePath,
        mimeType: args.mimeType,
        bytes: args.buffer.length,
        referenceFaceGeometry,
        expiresAt: nowPlus24Hours(),
      },
    }))
  } catch (error) {
    await supabaseAdmin.storage.from(STUDIO_BUCKET).remove([storagePath])
    throw error
  }
}

export async function getStudioAssets(creationId: string, kind?: StudioAssetRecord["kind"]): Promise<StudioAssetRecord[]> {
  return (await db.studioAsset.findMany({
    where: { creationId, ...(kind ? { kind } : {}), deletedAt: null },
    orderBy: { createdAt: "asc" },
  })).map(asAsset)
}

async function getStudioResultAssetForUser(
  userId: string,
  creationId: string,
  index: number,
): Promise<StudioAssetRecord> {
  await getStudioCreationForUser(
    userId,
    creationId,
  )

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 5
  ) {
    throw new StudioError(
      "Résultat MIRAVA introuvable.",
      "NOT_FOUND",
    )
  }

  const result =
    (
      await getStudioAssets(
        creationId,
        "RESULT",
      )
    )[index]

  if (!result) {
    throw new StudioError(
      "Résultat MIRAVA introuvable.",
      "NOT_FOUND",
    )
  }

  return result
}

export async function downloadStudioResultForUser(
  userId: string,
  creationId: string,
): Promise<{
  buffer: Buffer
  mimeType: string
}> {
  return downloadStudioResultAtIndexForUser(
    userId,
    creationId,
    0,
  )
}

export async function downloadStudioResultAtIndexForUser(
  userId: string,
  creationId: string,
  index: number,
): Promise<{
  buffer: Buffer
  mimeType: string
}> {
  if (
    await isMiravaDiscoveryResultLocked(
      userId,
      creationId,
    )
  ) {
    throw new StudioError(
      "Débloquez votre première séance pour accéder au fichier haute qualité.",
      "PAYMENT_REQUIRED",
    )
  }

  const result =
    await getStudioResultAssetForUser(
      userId,
      creationId,
      index,
    )

  return {
    buffer:
      await downloadAsset(result),
    mimeType:
      result.mimeType,
  }
}

export async function previewStudioResultAtIndexForUser(
  userId: string,
  creationId: string,
  index: number,
): Promise<{
  buffer: Buffer
  mimeType: "image/jpeg"
}> {
  const result =
    await getStudioResultAssetForUser(
      userId,
      creationId,
      index,
    )

  const original =
    await downloadAsset(result)

  const preview =
    await sharp(original)
      .resize({
        width: 360,
        withoutEnlargement: true,
      })
      .blur(20)
      .modulate({
        brightness: 0.72,
        saturation: 0.72,
      })
      .jpeg({
        quality: 48,
        progressive: true,
      })
      .toBuffer()

  return {
    buffer: preview,
    mimeType: "image/jpeg",
  }
}

export async function queueStudioAnalysis(userId: string, creationId: string): Promise<void> {
  const creation = await getStudioCreationForUser(userId, creationId)
  if (creation.status !== "DRAFT") throw new StudioError("L’analyse a déjà été lancée.", "INVALID_STATE")
  const references = await getStudioAssets(creationId, "REFERENCE")
  if (references.length !== 1) throw new StudioError("Ajoutez une photo de référence avant l’analyse.", "REFERENCE_REQUIRED")

  await ensureStudioActivation(userId)
  const reservationKey = studioKey("studio-reservation", creationId)
  try {
    await reserveMiravaCredit(userId, creationId, reservationKey, getMiravaSeriesSize(creation.creativeOptions))
  } catch (error) {
    if (error instanceof MiravaCreditError) throw new StudioError(error.message, error.code)
    throw error
  }
  try {
    await db.studioCreation.update({ where: { id: creationId, userId }, data: { status: "ANALYSIS_QUEUED", creditReservationKey: reservationKey, failureCode: null, failureMessage: null } })
    const { error: jobError } =
      await supabaseAdmin
        .from("StudioJob")
        .upsert(
          {
            id: randomUUID(),
            creationId,
            kind: "ANALYZE",
            status: "PENDING",
          },
          {
            onConflict:
              "creationId,kind",
            ignoreDuplicates:
              true,
          },
        )

    if (jobError) throw jobError
  } catch (error) {
    await releaseMiravaCreditReservation({ userId, creationId, key: studioKey("studio-reservation-release", creationId), reason: "QUEUE_FAILURE" })
    throw error
  }
}

export async function queueStudioGeneration(args: { userId: string; creationId: string }): Promise<void> {
  const creation = await getStudioCreationForUser(args.userId, args.creationId)
  // The browser can resume after a lost response, and the worker can continue
  // a reference once identity is complete. Treat an already durable generation
  // as success so neither path can create a second job or second debit.
  if (isMiravaGenerationAlreadyDurable(creation.status)) return
  if (creation.status !== "MASTER_PROMPT_READY") throw new StudioError("L’analyse artistique doit être terminée avant la génération.", "INVALID_STATE")
  const masterPrompt = creation.masterPrompt?.trim()
  if (!masterPrompt || masterPrompt.length < 80 || masterPrompt.length > 12000) throw new StudioError("La direction artistique enregistrée est invalide.", "INVALID_PROMPT")
  const identityAssets = await getIdentityAssetsForCreation(creation)
  if (identityAssets.length < MIN_IDENTITY_ASSETS || identityAssets.length > MAX_IDENTITY_ASSETS) throw new StudioError("Ajoutez entre trois et dix photos d’identité.", "IDENTITY_REQUIRED")

  if (!creation.creditReservationKey) {
    await ensureStudioActivation(args.userId)
    const reservationKey = studioKey("studio-generation-reservation", creation.id)
    try {
      await reserveMiravaCredit(args.userId, creation.id, reservationKey, getMiravaSeriesSize(creation.creativeOptions))
      await debitMiravaCreditReservation(args.userId, creation.id, studioKey("studio-generation-debit", creation.id))
      await db.studioCreation.update({ where: { id: creation.id, userId: args.userId }, data: { creditReservationKey: reservationKey } })
    } catch (error) {
      if (error instanceof MiravaCreditError) throw new StudioError(error.message, error.code)
      throw error
    }
  }

  await db.studioCreation.update({ where: { id: args.creationId, userId: args.userId }, data: { status: "GENERATION_QUEUED", failureCode: null, failureMessage: null } })
  const { error: jobError } =
    await supabaseAdmin
      .from("StudioJob")
      .upsert(
        {
          id: randomUUID(),
          creationId:
            args.creationId,
          kind: "GENERATE",
          status: "PENDING",
        },
        {
          onConflict:
            "creationId,kind",
          ignoreDuplicates:
            true,
        },
      )

  if (jobError) throw jobError
}

export type MiravaSessionShootLaunch = Readonly<{
  sessionId: string
  creationIds: readonly string[]
  alreadyLaunched: boolean
}>

export type MiravaSessionShootStatus = Readonly<{
  sessionId: string
  shotCount: number
  completedCount: number
  failedCount: number
  activeCount: number
  status: "QUEUED" | "GENERATING" | "PARTIAL" | "COMPLETED" | "FAILED"
  studioCredits: number
  shots: ReadonlyArray<{
    creationId: string
    shotIndex: number
    shotIntent: string | null
    status: StudioPublicStatus
    resultUrl: string | null
    failureKind: StudioPublicFailureKind
    failureMessage: string | null
    continuationActive: boolean
    continuationKind: "REGENERATE" | "POSE" | null
    continuationFailureMessage: string | null
  }>
}>

function isActiveStudioStatus(status: StudioStatus): boolean {
  return status === "GENERATION_QUEUED" || status === "GENERATING"
}

function sessionContinuationKind(creation: StudioCreationRecord): "REGENERATE" | "POSE" | null {
  const continuation = (creation.creativeOptions as Record<string, unknown> | null)?.continuation as Record<string, unknown> | undefined
  if (!continuation) return null
  const intents = continuation.intents
  return Array.isArray(intents) && intents.includes("pose") ? "POSE" : "REGENERATE"
}

export function resolveMiravaSessionShotVersions(
  canonical: StudioCreationRecord,
  versions: readonly StudioCreationRecord[],
): {
  displayed: StudioCreationRecord
  active: StudioCreationRecord | null
  failedContinuation: StudioCreationRecord | null
} {
  const newestFirst = [...versions].sort(
    (left, right) => new Date(right.completedAt ?? right.createdAt).getTime() - new Date(left.completedAt ?? left.createdAt).getTime(),
  )
  const active = newestFirst.find(
    (candidate) => isActiveStudioStatus(candidate.status),
  ) ?? null
  const displayed = newestFirst.find(
    (candidate) => candidate.status === "COMPLETED",
  ) ?? canonical
  const failedContinuation = newestFirst.find(
    (candidate) => candidate.status === "FAILED" || candidate.status === "CANCELLED",
  ) ?? null

  return { displayed, active, failedContinuation }
}

export async function continueMiravaSessionShot(args: {
  userId: string
  sessionId: string
  shotIndex: number
  kind: "REGENERATE" | "POSE"
}): Promise<{ creation: StudioCreationRecord; alreadyQueued: boolean }> {
  const session = await db.studioSession.findFirst({
    where: { id: args.sessionId, userId: args.userId },
    include: { creations: { orderBy: { createdAt: "asc" } } },
  })
  if (!session) throw new StudioError("Séance MIRAVA introuvable.", "NOT_FOUND")
  const creations = (session.creations as unknown[]).map(asCreation)
  const canonical = creations.find((creation) => creation.shotIndex === args.shotIndex && !creation.parentCreationId)
  if (!canonical) throw new StudioError("Prise MIRAVA introuvable.", "NOT_FOUND")
  if (canonical.status !== "COMPLETED") throw new StudioError("Cette prise n’est pas encore prête à être renouvelée.", "INVALID_STATE")
  const active = creations.find((creation) => creation.parentCreationId === canonical.id && isActiveStudioStatus(creation.status))
  if (active) return { creation: active, alreadyQueued: true }
  const creation = await continueStudioCreation({
    userId: args.userId,
    sourceCreationId: canonical.id,
    intents: args.kind === "POSE" ? ["pose"] : undefined,
    customInstruction: args.kind === "REGENERATE"
      ? "Regenerate this exact canonical session shot. Preserve identity, set, lighting, wardrobe, shot role, framing and composition."
      : undefined,
  })
  return { creation, alreadyQueued: false }
}

export async function getMiravaSessionShootStatus(args: { userId: string; sessionId: string }): Promise<MiravaSessionShootStatus> {
  const [session, user] = await Promise.all([
    db.studioSession.findFirst({
      where: { id: args.sessionId, userId: args.userId },
      include: { creations: { orderBy: { createdAt: "asc" } } },
    }),
    db.user.findUnique({ where: { id: args.userId }, select: { studioCredits: true } }),
  ])
  if (!session) throw new StudioError("Séance MIRAVA introuvable.", "NOT_FOUND")
  // Continuation creations share the session for lineage, but are never extra
  // Builder slots. The primary gallery is strictly the canonical 0..5 plan.
  const creations = (session.creations as unknown[]).map(asCreation)
  const canonicalShots = creations.filter((creation): creation is StudioCreationRecord & { shotIndex: number } => (
    typeof creation.shotIndex === "number"
    && creation.shotIndex >= 0
    && creation.shotIndex < MIRAVA_SESSION_SHOT_COUNT
    && !creation.parentCreationId
  ))
  const shots = await Promise.all(canonicalShots.map(async (creation) => {
    const versions = creations
      .filter((candidate) => candidate.parentCreationId === creation.id)
    const resolved = resolveMiravaSessionShotVersions(
      creation,
      versions,
    )
    const activeVersion = resolved.active
    const displayed = resolved.displayed
    const results = await getStudioAssets(displayed.id, "RESULT")
    const publicCreation = studioCreationPublic(asCreation(activeVersion ?? displayed))
    const failedVersion = resolved.failedContinuation
    return {
      creationId: creation.id,
      shotIndex: creation.shotIndex,
      shotIntent: creation.shotIntent ?? null,
      status: activeVersion ? studioCreationPublic(asCreation(activeVersion)).status : studioCreationPublic(asCreation(displayed)).status,
      resultUrl: results.length ? `/api/visual-engine/creations/${displayed.id}/result?index=0` : null,
      failureKind: publicCreation.failureKind,
      failureMessage: publicCreation.failureMessage,
      continuationActive: Boolean(activeVersion),
      continuationKind: activeVersion ? sessionContinuationKind(asCreation(activeVersion)) : null,
      continuationFailureMessage: failedVersion?.failureMessage ?? null,
    }
  }))
  const completedCount = shots.filter((shot) => shot.status === "COMPLETED").length
  const failedCount = shots.filter((shot) => shot.status === "FAILED" || shot.status === "CANCELLED").length
  const activeCount = shots.filter((shot) => shot.status === "GENERATION_QUEUED" || shot.status === "GENERATING").length
  const status = completedCount === MIRAVA_SESSION_SHOT_COUNT ? "COMPLETED"
    : activeCount > 0 && completedCount > 0 ? "PARTIAL"
    : activeCount > 0 ? "GENERATING"
    : failedCount === MIRAVA_SESSION_SHOT_COUNT ? "FAILED"
    : "QUEUED"
  return { sessionId: session.id, shotCount: MIRAVA_SESSION_SHOT_COUNT, completedCount, failedCount, activeCount, status, studioCredits: user?.studioCredits ?? 0, shots }
}

/**
 * Validates the persisted Builder configuration, then delegates the durable
 * launch to one DB transaction. Nothing client-authored enters this function.
 */
function miravaKieIntermediateStoragePath(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
): string {
  return (
    `${creation.userId}/` +
    `${creation.id}/` +
    `kie-intermediate-frame-${frameIndex}.png`
  )
}

async function storeMiravaKieIntermediateAsset(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
  image: Buffer,
): Promise<string> {
  const storagePath =
    miravaKieIntermediateStoragePath(
      creation,
      frameIndex,
    )

  const normalized =
    await sharp(image)
      .png()
      .toBuffer()

  const { error } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .upload(
        storagePath,
        normalized,
        {
          contentType:
            "image/png",
          upsert:
            true,
        },
      )

  if (error) {
    throw new StudioError(
      "L’image intermédiaire MIRAVA n’a pas pu être stockée.",
      "STORAGE_ERROR",
      true,
    )
  }

  return storagePath
}

async function purgeMiravaKieIntermediateAsset(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
): Promise<void> {
  const storagePath =
    miravaKieIntermediateStoragePath(
      creation,
      frameIndex,
    )

  const { error } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove([
        storagePath,
      ])

  if (error) {
    console.error(
      "[mirava-kie-intermediate-cleanup-error]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        message:
          error.message,
      }),
    )
  }
}

async function purgeMiravaKieIntermediateAssets(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameCount = 6,
): Promise<void> {
  await Promise.all(
    Array.from(
      {
        length:
          Math.max(
            0,
            frameCount,
          ),
      },
      (_, frameIndex) =>
        purgeMiravaKieIntermediateAsset(
          creation,
          frameIndex,
        ),
    ),
  )
}


function miravaKieRestorationFaceCropStoragePath(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
): string {
  return (
    `${creation.userId}/` +
    `${creation.id}/` +
    `kie-restoration-face-crop-${frameIndex}.png`
  )
}

async function purgeMiravaKieRestorationFaceCrop(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
): Promise<void> {
  const storagePath =
    miravaKieRestorationFaceCropStoragePath(
      creation,
      frameIndex,
    )

  const { error } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove([
        storagePath,
      ])

  if (error) {
    console.error(
      "[mirava-kie-restoration-face-crop-cleanup-error]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        message:
          error.message,
      }),
    )
  }
}

async function purgeMiravaKieRestorationFaceCropsForCreation(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameCount = 6,
): Promise<void> {
  await Promise.all(
    Array.from(
      {
        length:
          Math.max(
            0,
            frameCount,
          ),
      },
      (_, frameIndex) =>
        purgeMiravaKieRestorationFaceCrop(
          creation,
          frameIndex,
        ),
    ),
  )
}

const MIRAVA_KIE_V6_PASS_A_READY_STATE =
  "v6-pass-a-ready"

const MIRAVA_FACE_RESTORATION_SUBMITTED_STATE =
  "v6-face-restoration-submitted"

const MIRAVA_FACE_RESTORATION_READY_STATE =
  "v6-face-restoration-ready"

const MIRAVA_KIE_SIGNED_INPUT_TTL_SECONDS =
  60 * 60

async function createMiravaKieSignedInputUrl(
  asset: {
    storagePath: string
  },
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .createSignedUrl(
        asset.storagePath,
        MIRAVA_KIE_SIGNED_INPUT_TTL_SECONDS,
      )

  const signedUrl =
    data?.signedUrl?.trim()

  if (
    error ||
    !signedUrl
  ) {
    throw new StudioError(
      "Une URL privée temporaire n’a pas pu être créée pour le moteur d’image.",
      "STORAGE_ERROR",
      true,
    )
  }

  try {
    const parsed =
      new URL(
        signedUrl,
      )

    if (
      parsed.protocol !==
        "https:"
    ) {
      throw new Error(
        "non-https",
      )
    }
  } catch {
    throw new StudioError(
      "L’URL privée temporaire du moteur d’image est invalide.",
      "STORAGE_ERROR",
      true,
    )
  }

  return signedUrl
}

function miravaKieIdentityCropStoragePath(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
  identityAssetId: string,
): string {
  return (
    `${creation.userId}/` +
    `${creation.id}/` +
    `kie-identity-crop-${frameIndex}-` +
    `${identityAssetId}.jpg`
  )
}

const MIRAVA_KIE_FACE_IDENTITY_VIEW_KEYS =
  new Set([
    "front",
    "angle",
    "profile_right",
    "smile",
  ])

type MiravaKieIdentityFaceInput = {
  asset:
    StudioIdentityAssetRecord
  faceGeometry:
    NonNullable<
      ReturnType<
        typeof parseMiravaIdentityFaceGeometry
      >
    >
}

function getMiravaKieIdentityFaceInputs(
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
): MiravaKieIdentityFaceInput[] {
  return identityAssets.flatMap<
    MiravaKieIdentityFaceInput
  >(
    (asset) => {
      /*
       * Creation-scoped legacy identity assets cannot
       * become FACE_ID inputs because they have no
       * durable MediaPipe geometry.
       */
      if (
        !(
          "identityProfileId" in
          asset
        )
      ) {
        return []
      }

      const viewKey =
        asset.viewKey

      if (
        typeof viewKey !==
          "string" ||
        !MIRAVA_KIE_FACE_IDENTITY_VIEW_KEYS
          .has(viewKey)
      ) {
        return []
      }

      const faceGeometry =
        parseMiravaIdentityFaceGeometry(
          asset.faceGeometry,
        )

      return faceGeometry
        ? [
            {
              asset,
              faceGeometry,
            },
          ]
        : []
    },
  )
}

function selectMiravaKieRequiredIdentityFaceInputs(
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
): MiravaKieIdentityFaceInput[] {
  const faceInputs =
    getMiravaKieIdentityFaceInputs(
      identityAssets,
    )

  /*
   * Kie receives exactly the three required FACE_ID
   * views in canonical order.
   *
   * Optional views such as "smile" can never displace
   * front / angle / profile_right because provider
   * selection is independent from DB insertion order.
   */
  return MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS
    .flatMap(
      (requiredViewKey) => {
        const match =
          faceInputs.find(
            ({ asset }) =>
              asset.viewKey ===
              requiredViewKey,
          )

        return match
          ? [match]
          : []
      },
    )
}

function selectMiravaKieIdentityCropAssets(
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
): StudioIdentityAssetRecord[] {
  return selectMiravaKieRequiredIdentityFaceInputs(
    identityAssets,
  ).map(
    ({ asset }) =>
      asset,
  )
}

async function createMiravaKieIdentityCrop(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
  asset:
    StudioIdentityAssetRecord,
  faceGeometry: unknown,
): Promise<{
  storagePath: string
  mimeType: "image/jpeg"
}> {
  /*
   * The geometry has already been validated before
   * any temporary crop is created. Parse again here
   * so this helper remains safe if reused later.
   */
  const parsedGeometry =
    parseMiravaIdentityFaceGeometry(
      faceGeometry,
    )

  if (!parsedGeometry) {
    throw new StudioError(
      "Le Profil identité doit être réenregistré avant de préparer les références visage.",
      "IDENTITY_REQUIRED",
    )
  }

  const source =
    await downloadAsset(asset)

  const metadata =
    await sharp(source)
      .metadata()

  if (
    !metadata.width ||
    !metadata.height
  ) {
    throw new StudioError(
      "Une photo identité ne peut pas être préparée pour le moteur d’image.",
      "INVALID_IMAGE",
    )
  }

  const cropRegion =
    resolveMiravaIdentityFaceCrop({
      geometry:
        parsedGeometry,
      imageWidth:
        metadata.width,
      imageHeight:
        metadata.height,
    })

  if (!cropRegion) {
    throw new StudioError(
      "La zone visage enregistrée pour cette photo identité est invalide.",
      "IDENTITY_REQUIRED",
    )
  }

  /*
   * No attention crop, no semantic recentering and
   * no percentage of the source image.
   *
   * Sharp receives the exact deterministic rectangle
   * derived from the MediaPipe face landmarks.
   */
  const crop =
    await sharp(source)
      .extract(
        cropRegion,
      )
      .resize({
        width: 768,
        height: 768,
        fit: "inside",
      })
      .jpeg({
        quality: 94,
        chromaSubsampling:
          "4:4:4",
      })
      .toBuffer()

  const storagePath =
    miravaKieIdentityCropStoragePath(
      creation,
      frameIndex,
      asset.id,
    )

  const { error } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .upload(
        storagePath,
        crop,
        {
          contentType:
            "image/jpeg",
          upsert: true,
        },
      )

  if (error) {
    console.error(
      "[mirava-kie-identity-crop-storage-error]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        identityAssetId:
          asset.id,
        message:
          error.message,
      }),
    )

    throw new StudioError(
      "Une référence identité temporaire n’a pas pu être préparée.",
      "STORAGE_ERROR",
      true,
    )
  }

  return {
    storagePath,
    mimeType:
      "image/jpeg",
  }
}

async function purgeMiravaKieIdentityCrops(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
): Promise<void> {
  if (
    identityAssets.length === 0
  ) {
    return
  }

  const paths =
    identityAssets.map(
      (asset) =>
        miravaKieIdentityCropStoragePath(
          creation,
          frameIndex,
          asset.id,
        ),
    )

  const { error } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove(paths)

  if (error) {
    console.error(
      "[mirava-kie-identity-crop-cleanup-error]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        count:
          paths.length,
        message:
          error.message,
      }),
    )
  }
}

async function purgeMiravaKieIdentityCropsForCreation(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
): Promise<void> {
  /*
   * Terminal cleanup must not depend on the current
   * identity profile.
   *
   * The profile may have changed after temporary crops
   * were created, so remove every provider crop found
   * inside this creation's private storage directory.
   */
  const folderPath =
    `${creation.userId}/${creation.id}`

  const {
    data,
    error,
  } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .list(
        folderPath,
        {
          limit:
            100,
          search:
            "kie-identity-crop-",
        },
      )

  if (error) {
    console.error(
      "[mirava-kie-identity-crop-list-error]",
      JSON.stringify({
        creationId:
          creation.id,
        message:
          error.message,
      }),
    )

    return
  }

  const paths =
    (data ?? [])
      .flatMap(
        (
          item: {
            name?: string | null
          },
        ) => {
          const name =
            typeof item?.name ===
              "string"
              ? item.name
              : ""

          return (
            name.startsWith(
              "kie-identity-crop-",
            ) &&
            name.endsWith(
              ".jpg",
            )
          )
            ? [
                `${folderPath}/${name}`,
              ]
            : []
        },
      )

  if (
    paths.length === 0
  ) {
    return
  }

  const {
    error:
      removeError,
  } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove(paths)

  if (removeError) {
    console.error(
      "[mirava-kie-identity-crop-cleanup-error]",
      JSON.stringify({
        creationId:
          creation.id,
        count:
          paths.length,
        message:
          removeError.message,
      }),
    )
  }
}

async function purgeMiravaKieTemporaryAssetsForFrame(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameIndex: number,
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
): Promise<void> {
  /*
   * Cleanup occurs only after RESULT is durable.
   * Until then Pass A and FACE_ID crops remain
   * available for retry/resume.
   */
  await Promise.all([
    purgeMiravaKieIntermediateAsset(
      creation,
      frameIndex,
    ),
    purgeMiravaKieRestorationFaceCrop(
      creation,
      frameIndex,
    ),
    purgeMiravaKieIdentityCrops(
      creation,
      frameIndex,
      selectMiravaKieIdentityCropAssets(
        identityAssets,
      ),
    ),
  ])
}

async function purgeMiravaKieTemporaryAssetsForCreation(
  creation: Pick<
    StudioCreationRecord,
    "id" | "userId"
  >,
  frameCount = 6,
): Promise<void> {
  /*
   * Terminal cleanup does not depend on the current
   * identity profile, which may have changed since
   * temporary provider artifacts were created.
   */
  await Promise.all([
    purgeMiravaKieIntermediateAssets(
      creation,
      frameCount,
    ),
    purgeMiravaKieRestorationFaceCropsForCreation(
      creation,
      frameCount,
    ),
    purgeMiravaKieIdentityCropsForCreation(
      creation,
    ),
  ])
}

export async function launchMiravaSessionShoot(args: {
  userId: string
  sessionId: string
}): Promise<MiravaSessionShootLaunch> {
  await requireMiravaRequiredConsents(args.userId)

  const session = await db.studioSession.findFirst({
    where: { id: args.sessionId, userId: args.userId },
    include: {
      referenceCreation: { include: { assets: { where: { kind: "REFERENCE", deletedAt: null } } } },
      lookItems: { include: { assets: { select: { viewKey: true } } }, orderBy: { position: "asc" } },
      creations: { select: { id: true, shotIndex: true }, orderBy: { shotIndex: "asc" } },
    },
  }) as {
    id: string
    builderVersion: number | null
    builderConfig: unknown
    setPresetId: string | null
    lightingPresetId: string | null
    identityProfileId: string | null
    referenceCreation: {
      id: string
      userId: string
      masterPrompt: string | null
      assets: unknown[]
    } | null
    lookItems: Array<{
      category: string
      label: string | null
      brand: string | null
      description: string | null
      assets: Array<{ viewKey: string | null }>
    }>
    creations: Array<{ id: string; shotIndex: number | null }>
  } | null

  if (!session) throw new StudioError("Séance MIRAVA introuvable.", "NOT_FOUND")
  if (session.builderVersion !== MIRAVA_SESSION_BUILDER_VERSION) {
    throw new StudioError("Cette séance MIRAVA utilise une version non prise en charge.", "INVALID_STATE")
  }

  const metadata = session.builderConfig && typeof session.builderConfig === "object" && !Array.isArray(session.builderConfig)
    ? session.builderConfig as Record<string, unknown>
    : {}
  const config = miravaSessionBuilderReadySchema.safeParse({
    version: session.builderVersion,
    mode: metadata.mode,
    setPresetId: session.setPresetId,
    lightingPresetId: session.lightingPresetId,
    shotCount: metadata.shotCount,
    lookMode: metadata.lookMode,
  })
  if (!config.success) throw new StudioError("La configuration de cette séance est incomplète ou invalide.", "INVALID_STATE")
  const currentIdentityProfile =
    await db.studioIdentityProfile.findUnique({
      where: {
        userId:
          args.userId,
      },
    })

  const identityAssets =
    currentIdentityProfile
      ? await db.studioIdentityAsset.findMany({
          where: {
            identityProfileId:
              currentIdentityProfile.id,
            userId:
              args.userId,
          },
        })
      : []

  const identityAssetCount =
    identityAssets.length

  if (
    !currentIdentityProfile ||
    identityAssetCount <
      MIN_IDENTITY_ASSETS
  ) {
    throw new StudioError(
      "Un Profil identité utilisable est requis avant le lancement.",
      "IDENTITY_REQUIRED",
    )
  }

  const requiredIdentityFaceInputs =
    selectMiravaKieRequiredIdentityFaceInputs(
      identityAssets as
        StudioIdentityAssetRecord[],
    )

  if (
    requiredIdentityFaceInputs.length !==
      MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS.length
  ) {
    throw new StudioError(
      "Votre Profil identité doit être réenregistré afin d’activer la représentation visage haute fidélité.",
      "IDENTITY_REQUIRED",
    )
  }

  if (
    session.identityProfileId !==
      currentIdentityProfile.id
  ) {
    await db.studioSession.update({
      where: {
        id:
          session.id,
        userId:
          args.userId,
      },
      data: {
        identityProfileId:
          currentIdentityProfile.id,
      },
    })

    session.identityProfileId =
      currentIdentityProfile.id
  }
  if (config.data.lookMode === "CUSTOM" && !session.lookItems.some((item) => item.assets.length > 0)) {
    throw new StudioError("Ajoutez au moins un article avec une image privée à votre look.", "INVALID_STATE")
  }
  if (config.data.lookMode === "REFERENCE" && (!session.referenceCreation || session.referenceCreation.userId !== args.userId || !session.referenceCreation.assets.length)) {
    throw new StudioError("Une référence artistique enregistrée est requise pour ce look.", "REFERENCE_REQUIRED")
  }

  if (session.creations.length > 0) {
    if (session.creations.length !== MIRAVA_SESSION_SHOT_COUNT) {
      throw new StudioError("Cette séance possède un lancement incomplet et ne peut pas être relancée automatiquement.", "INVALID_STATE")
    }
    return { sessionId: session.id, creationIds: session.creations.map((creation) => creation.id), alreadyLaunched: true }
  }

  const lookItems = session.lookItems.map((item) => ({
    category: item.category,
    label: item.label,
    brand: item.brand,
    description: item.description,
    viewKeys: item.assets.map((asset) => asset.viewKey ?? "UNKNOWN"),
  }))
  const shots = Array.from({ length: MIRAVA_SESSION_SHOT_COUNT }, (_, shotIndex) => {
    const context = buildMiravaSessionShotGenerationContext({
      config: config.data,
      shotIndex,
      lookItems,
      artisticReferenceDirection: config.data.lookMode === "REFERENCE" ? session.referenceCreation?.masterPrompt : null,
    })
    return {
      shotIndex,
      shotIntent: context.shot.shotIntent,
      masterPrompt: context.masterPrompt,
      negativePrompt: context.negativePrompt,
    }
  })

  const { data, error } = await supabaseAdmin.rpc("launch_mirava_session_shoot", {
    p_user_id: args.userId,
    p_session_id: session.id,
    p_shots: shots,
  })
  if (error) {
    if (error.message.includes("INSUFFICIENT_STUDIO_CREDITS")) throw new StudioError("Vous n’avez pas assez de crédits pour cette séance de six photos.", "INSUFFICIENT_CREDITS")
    if (error.message.includes("MIRAVA_SESSION_PARTIAL_RUN")) throw new StudioError("Cette séance possède un lancement incomplet et ne peut pas être relancée automatiquement.", "INVALID_STATE")
    throw new StudioError("Impossible de lancer cette séance MIRAVA.", "CREDIT_ERROR")
  }
  const rows = Array.isArray(data) ? data as Array<{ creationId?: unknown; shotIndex?: unknown }> : []
  const creationIds = rows
    .filter((row) => typeof row.creationId === "string" && Number.isInteger(row.shotIndex))
    .sort((a, b) => Number(a.shotIndex) - Number(b.shotIndex))
    .map((row) => row.creationId as string)
  if (creationIds.length !== MIRAVA_SESSION_SHOT_COUNT) throw new StudioError("Le lancement de la séance n’a pas produit les six prises attendues.", "CREDIT_ERROR")

  return { sessionId: session.id, creationIds, alreadyLaunched: false }
}

async function getIdentityAssetsForCreation(creation: StudioCreationRecord): Promise<Array<StudioAssetRecord | StudioIdentityAssetRecord>> {
  if (creation.identityProfileId) {
    return (await db.studioIdentityAsset.findMany({ where: { identityProfileId: creation.identityProfileId, userId: creation.userId }, orderBy: { createdAt: "asc" } })) as StudioIdentityAssetRecord[]
  }
  return getStudioAssets(creation.id, "IDENTITY")
}

export async function listStudioCreations(
  userId: string,
): Promise<
  Array<
    StudioCreationPublic & {
      resultUrl: string | null
      resultUrls: string[]
      resultLocked: boolean
      completedResultCount: number
    }
  >
> {
  const [
    creations,
    discoveryAccess,
  ] = await Promise.all([
    db.studioCreation
      .findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      })
      .then((items) =>
        items.map(asCreation),
      ),
    getMiravaDiscoveryAccess(
      userId,
    ),
  ])

  return Promise.all(
    creations.map(
      async (creation) => {
        const results =
          await getStudioAssets(
            creation.id,
            "RESULT",
          )

        const resultLocked =
          isMiravaDiscoveryCreationLocked(
            discoveryAccess,
            creation.id,
          )

        const endpoint =
          resultLocked
            ? "preview"
            : "result"

        const resultUrls =
          results.map(
            (_, index) =>
              `/api/visual-engine/creations/${creation.id}/${endpoint}?index=${index}`,
          )

        return {
          ...studioCreationPublic(
            creation,
          ),
          resultUrl:
            resultUrls[0] ??
            null,
          resultUrls,
          resultLocked,
          completedResultCount:
            results.length,
        }
      },
    ),
  )
}

export async function studioCreationDTO(
  userId: string,
  creationId: string,
) {
  const [
    creation,
    assets,
    user,
    discoveryAccess,
  ] = await Promise.all([
    getStudioCreationForUser(
      userId,
      creationId,
    ),
    getStudioAssets(
      creationId,
    ),
    db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        studioCredits: true,
      },
    }),
    getMiravaDiscoveryAccess(
      userId,
    ),
  ])

  const results =
    assets.filter(
      (asset) =>
        asset.kind === "RESULT",
    )

  const resultLocked =
    isMiravaDiscoveryCreationLocked(
      discoveryAccess,
      creation.id,
    )

  const endpoint =
    resultLocked
      ? "preview"
      : "result"

  const resultUrls =
    results.map(
      (_, index) =>
        `/api/visual-engine/creations/${creation.id}/${endpoint}?index=${index}`,
    )

  return {
    creation:
      studioCreationPublic(
        creation,
      ),
    assets:
      assets.map(
        (asset) => ({
          id: asset.id,
          kind: asset.kind,
          createdAt:
            asset.createdAt,
        }),
      ),
    resultUrl:
      resultUrls[0] ?? null,
    resultUrls,
    resultLocked,
    completedResultCount:
      results.length,
    studioCredits:
      Number(
        user?.studioCredits ??
          0,
      ),
  }
}

export async function deleteStudioCreation(
  userId: string,
  creationId: string,
): Promise<void> {
  const creation =
    await getStudioCreationForUser(
      userId,
      creationId,
    )

  const assets =
    await getStudioAssets(
      creationId,
    )

  if (assets.length) {
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove(
        assets.map(
          (asset) =>
            asset.storagePath,
        ),
      )
  }

  /*
   * Kie intermediates are not StudioAsset rows.
   */
  await purgeMiravaKieTemporaryAssetsForCreation(
    creation,
  )

  await db.studioCreation.delete({
    where: {
      id: creationId,
      userId,
    },
  })
}

async function downloadAsset(asset: Pick<StudioAssetRecord, "storagePath">): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).download(asset.storagePath)
  if (error || !data) throw new StudioError("Le fichier sécurisé est indisponible.", "STORAGE_ERROR", true)
  return Buffer.from(await data.arrayBuffer())
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`
}

const MIRAVA_IDENTITY_MORPHOLOGY_TIMEOUT_MS =
  90_000

const MIRAVA_IDENTITY_MORPHOLOGY_MAX_IMAGES =
  5

function miravaMorphologyViewPriority(
  viewKey: MiravaIdentityViewKey,
): number {
  if (viewKey === "body") {
    return 0
  }

  if (viewKey === "front") {
    return 1
  }

  if (viewKey === "angle") {
    return 2
  }

  if (viewKey === "profile_right") {
    return 3
  }

  if (viewKey === "smile") {
    return 4
  }

  return 100
}

async function refreshIdentityMorphologyForProfile(
  args: {
    userId: string
    profileId: string
  },
): Promise<void> {
  /*
   * Always invalidate first.
   *
   * If extraction is unavailable or fails, MIRAVA keeps
   * no stale morphology from older identity photographs.
   */
  await db.studioIdentityProfile.update({
    where: {
      id:
        args.profileId,
      userId:
        args.userId,
    },
    data: {
      identityMorphology:
        null,
    },
  })

  /*
   * External identity analysis is optional and
   * fail-closed.
   *
   * The identity profile itself remains durable even
   * when no current OpenAI disclosure evidence exists.
   * In that case morphology stays null and no identity
   * derivative is prepared or transmitted externally.
   */
  try {
    await requireMiravaOpenAiIdentityAnalysisConsent(
      args.userId,
    )
  } catch (error) {
    console.info(
      "[mirava-identity-morphology-skipped-consent]",
      JSON.stringify({
        profileId:
          args.profileId,
        reason:
          error instanceof Error
            ? error.message
            : "CONSENT_VERIFICATION_FAILED",
      }),
    )

    return
  }

  const rawAssets =
    await db.studioIdentityAsset.findMany({
      where: {
        identityProfileId:
          args.profileId,
        userId:
          args.userId,
      },
      orderBy: {
        createdAt:
          "asc",
      },
    }) as StudioIdentityAssetRecord[]

  const assets =
    normalizeMiravaIdentityAssets(
      rawAssets,
    )
      .filter(
        (asset) =>
          asset.viewKey !==
            "tattoos",
      )
      .sort(
        (a, b) =>
          miravaMorphologyViewPriority(
            a.viewKey,
          ) -
          miravaMorphologyViewPriority(
            b.viewKey,
          ),
      )
      .slice(
        0,
        MIRAVA_IDENTITY_MORPHOLOGY_MAX_IMAGES,
      )

  if (
    assets.length <
      MIRAVA_MIN_IDENTITY_PHOTOS
  ) {
    console.info(
      "[mirava-identity-morphology-skipped]",
      JSON.stringify({
        profileId:
          args.profileId,
        reason:
          "insufficient_identity_views",
        imageCount:
          assets.length,
      }),
    )

    return
  }

  const apiKey =
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.info(
      "[mirava-identity-morphology-skipped]",
      JSON.stringify({
        profileId:
          args.profileId,
        reason:
          "provider_not_configured",
      }),
    )

    return
  }

  const startedAt =
    Date.now()

  try {
    const userContent:
      Array<Record<string, unknown>> =
      [
        {
          type:
            "text",
          text:
            [
              "Analyze these identity views together.",
              "Every image depicts the same consenting adult.",
              "Use each VIEW label as context only.",
              "Extract intrinsic morphology according to the system contract.",
            ].join(" "),
        },
      ]

    for (
      const asset of
        assets
    ) {
      const source =
        await downloadAsset(
          asset,
        )

      /*
       * Vision analysis receives a temporary,
       * metadata-free derivative only.
       * The durable high-resolution identity
       * master is left unchanged.
       */
      const preview =
        await sharp(source)
          .rotate()
          .resize({
            width:
              1280,
            height:
              1280,
            fit:
              "inside",
            withoutEnlargement:
              true,
          })
          .jpeg({
            quality:
              88,
            chromaSubsampling:
              "4:4:4",
          })
          .toBuffer()

      userContent.push(
        {
          type:
            "text",
          text:
            `VIEW: ${asset.viewKey}`,
        },
        {
          type:
            "image_url",
          image_url: {
            url:
              toDataUrl(
                preview,
                "image/jpeg",
              ),
            detail:
              "high",
          },
        },
      )
    }

    console.info(
      "[mirava-identity-morphology-attempt]",
      JSON.stringify({
        profileId:
          args.profileId,
        model:
          MIRAVA_ANALYSIS_MODEL,
        imageCount:
          assets.length,
        viewKeys:
          assets.map(
            (asset) =>
              asset.viewKey,
          ),
        timeoutMs:
          MIRAVA_IDENTITY_MORPHOLOGY_TIMEOUT_MS,
      }),
    )

    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${apiKey}`,
          },
          body:
            JSON.stringify({
              model:
                MIRAVA_ANALYSIS_MODEL,
              store:
                false,
              reasoning_effort:
                "low",
              max_completion_tokens:
                1800,
              response_format: {
                type:
                  "json_object",
              },
              messages: [
                {
                  role:
                    "system",
                  content:
                    MIRAVA_IDENTITY_MORPHOLOGY_EXTRACTOR_PROMPT,
                },
                {
                  role:
                    "user",
                  content:
                    userContent,
                },
              ],
            }),
          signal:
            AbortSignal.timeout(
              MIRAVA_IDENTITY_MORPHOLOGY_TIMEOUT_MS,
            ),
        },
      )

    const responseText =
      await response.text()

    if (!response.ok) {
      throw new Error(
        `IDENTITY_MORPHOLOGY_HTTP_${response.status}: ` +
        responseText.slice(
          0,
          500,
        ),
      )
    }

    const body =
      JSON.parse(
        responseText,
      ) as {
        choices?: Array<{
          message?: {
            content?:
              | string
              | null
          }
        }>
      }

    const content =
      body.choices?.[0]
        ?.message?.content

    if (
      typeof content !==
        "string" ||
      !content.trim()
    ) {
      throw new Error(
        "IDENTITY_MORPHOLOGY_EMPTY_RESPONSE",
      )
    }

    let rawMorphology:
      unknown

    try {
      rawMorphology =
        JSON.parse(
          content,
        )
    } catch {
      throw new Error(
        "IDENTITY_MORPHOLOGY_INVALID_JSON",
      )
    }

    const parsed =
      parseIdentityMorphology(
        rawMorphology,
      )

    if (!parsed) {
      throw new Error(
        "IDENTITY_MORPHOLOGY_INVALID_SCHEMA",
      )
    }

    const durableMorphology = {
      ...parsed,
      sourceViewKeys:
        assets.map(
          (asset) =>
            asset.viewKey,
        ),
    }

    /*
     * sourceViewKeys are server-owned.
     * Never trust model-provided provenance.
     */
    await db.studioIdentityProfile.update({
      where: {
        id:
          args.profileId,
        userId:
          args.userId,
      },
      data: {
        identityMorphology:
          durableMorphology,
      },
    })

    console.info(
      "[mirava-identity-morphology-success]",
      JSON.stringify({
        profileId:
          args.profileId,
        durationMs:
          Date.now() -
          startedAt,
        imageCount:
          assets.length,
        viewKeys:
          durableMorphology
            .sourceViewKeys,
        observedFields:
          Object.keys(
            parsed,
          ).filter(
            (key) =>
              key !==
                "version" &&
              key !==
                "sourceViewKeys",
          ),
      }),
    )
  } catch (error) {
    /*
     * Identity upload remains durable even when
     * morphology analysis is temporarily unavailable.
     *
     * The null value is intentional: stale morphology
     * is strictly worse than missing morphology.
     */
    console.error(
      "[mirava-identity-morphology-error]",
      JSON.stringify({
        profileId:
          args.profileId,
        durationMs:
          Date.now() -
          startedAt,
        name:
          providerExceptionName(
            error,
          ),
        message:
          providerExceptionMessage(
            error,
          ),
      }),
    )
  }
}

const MIRAVA_ANALYSIS_TIMEOUT_MS =
  150_000

function providerExceptionName(
  error: unknown,
): string {
  return error instanceof Error
    ? error.name
    : "UnknownError"
}

function providerExceptionMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Unknown provider exception"
}

function isProviderTimeout(
  error: unknown,
): boolean {
  const name =
    providerExceptionName(error)

  return (
    name === "TimeoutError" ||
    name === "AbortError"
  )
}

async function extractMasterPrompt(
  reference: StudioAssetRecord,
  jobAttempt = 1,
): Promise<{
  creativeDirectionSummary: string
  masterPrompt: string
  negativePrompt: string
}> {
  const apiKey =
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new StudioError(
      "Le moteur Studio n’est pas configuré.",
      "PROVIDER_CONFIGURATION",
    )
  }

  const analysisModel =
    jobAttempt > 1
      ? MIRAVA_ANALYSIS_FALLBACK_MODEL
      : MIRAVA_ANALYSIS_MODEL

  const analysisTokenBudget =
    jobAttempt >= 3
      ? 9000
      : jobAttempt === 2
        ? 7000
        : 6000

  const referenceBuffer =
    await downloadAsset(reference)

  const startedAt =
    Date.now()

  console.info(
    "[mirava-analysis-attempt]",
    JSON.stringify({
      creationId:
        reference.creationId,
      referenceAssetId:
        reference.id,
      model:
        analysisModel,
      jobAttempt,
      maxCompletionTokens:
        analysisTokenBudget,
      reasoningEffort:
        "low",
      timeoutMs:
        MIRAVA_ANALYSIS_TIMEOUT_MS,
      extractorVersion:
        MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version,
    }),
  )

  let response: Response

  try {
    response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:
            analysisModel,
          store: false,
          max_completion_tokens:
            analysisTokenBudget,
          reasoning_effort:
            "low",
          messages: [
            {
              role: "system",
              content:
                MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Create the MIRAVA internal art direction from this single reference. Compose for a final 4:5 portrait-safe image.",
                },
                {
                  type:
                    "image_url",
                  image_url: {
                    url: toDataUrl(
                      referenceBuffer,
                      reference.mimeType,
                    ),
                    detail: "high",
                  },
                },
              ],
            },
          ],
        }),
        signal:
          AbortSignal.timeout(
            MIRAVA_ANALYSIS_TIMEOUT_MS,
          ),
      },
    )
  } catch (error) {
    const durationMs =
      Date.now() - startedAt

    console.error(
      "[mirava-analysis-exception]",
      JSON.stringify({
        creationId:
          reference.creationId,
        referenceAssetId:
          reference.id,
        model:
          analysisModel,
        durationMs,
        name:
          providerExceptionName(error),
        message:
          providerExceptionMessage(error),
      }),
    )

    if (isProviderTimeout(error)) {
      /*
       * Ne pas répéter automatiquement un appel qui vient déjà de
       * monopoliser 150 secondes. L’utilisatrice reçoit immédiatement
       * une cause compréhensible et son crédit est libéré.
       */
      throw new StudioError(
        "L’analyse de la référence a dépassé le temps disponible.",
        "ANALYSIS_TIMEOUT",
      )
    }

    throw new StudioError(
      "Le service d’analyse artistique n’a pas répondu correctement.",
      "ANALYSIS_PROVIDER_ERROR",
      true,
    )
  }

  const durationMs =
    Date.now() - startedAt

  if (!response.ok) {
    const providerBody =
      await response.text()

    let providerCode = ""

    try {
      const parsed =
        JSON.parse(
          providerBody,
        ) as {
          error?: {
            code?: string
            type?: string
          }
        }

      providerCode =
        parsed.error?.code ??
        parsed.error?.type ??
        ""
    } catch {
      providerCode = ""
    }

    console.error(
      "[mirava-analysis-provider-error]",
      JSON.stringify({
        creationId:
          reference.creationId,
        referenceAssetId:
          reference.id,
        model:
          analysisModel,
        status:
          response.status,
        providerCode,
        durationMs,
        body:
          providerBody.slice(
            0,
            2000,
          ),
      }),
    )

    const safetyRefusal =
      providerCode ===
        "content_policy_violation" ||
      providerCode ===
        "safety_violations" ||
      providerCode ===
        "moderation_blocked"

    if (safetyRefusal) {
      throw new StudioError(
        "La référence n’a pas été autorisée pour l’analyse.",
        "SAFETY_REFUSAL",
      )
    }

    const retryable =
      response.status === 429 ||
      response.status >= 500

    throw new StudioError(
      "L’analyse artistique est temporairement indisponible.",
      `OPENAI_ANALYSIS_${response.status}${providerCode ? `_${providerCode}` : ""}`,
      retryable,
    )
  }

  const data =
    await response.json() as {
      id?: string
      model?: string
      choices?: Array<{
        finish_reason?: string | null
        message?: {
          content?:
            | string
            | Array<{
                type?: string
                text?: string
              }>
            | null
          refusal?: string | null
        }
      }>
      usage?: {
        completion_tokens?: number
        completion_tokens_details?: {
          reasoning_tokens?: number
        }
      }
    }

  const choice =
    data.choices?.[0]

  const rawContent =
    choice?.message?.content

  const content =
    typeof rawContent === "string"
      ? rawContent.trim()
      : Array.isArray(rawContent)
        ? rawContent
            .map(
              (part) =>
                typeof part?.text ===
                  "string"
                  ? part.text
                  : "",
            )
            .join("")
            .trim()
        : ""

  const refusal =
    choice?.message?.refusal?.trim() ??
    ""

  const finishReason =
    choice?.finish_reason ?? null

  const responseDiagnostics = {
    creationId:
      reference.creationId,
    referenceAssetId:
      reference.id,
    requestId:
      response.headers.get(
        "x-request-id",
      ),
    responseId:
      data.id ?? null,
    requestedModel:
      analysisModel,
    responseModel:
      data.model ?? null,
    jobAttempt,
    finishReason,
    completionTokens:
      data.usage
        ?.completion_tokens ?? null,
    reasoningTokens:
      data.usage
        ?.completion_tokens_details
        ?.reasoning_tokens ?? null,
    refusalPresent:
      Boolean(refusal),
    contentLength:
      content.length,
    durationMs,
  }

  if (refusal) {
    console.error(
      "[mirava-analysis-refusal]",
      JSON.stringify(
        responseDiagnostics,
      ),
    )

    throw new StudioError(
      "La référence n’a pas été autorisée pour l’analyse.",
      "SAFETY_REFUSAL",
    )
  }

  if (!content) {
    console.error(
      "[mirava-analysis-empty-response]",
      JSON.stringify(
        responseDiagnostics,
      ),
    )

    throw new StudioError(
      finishReason === "length"
        ? "L’analyse artistique a atteint sa limite de sortie."
        : "L’analyse artistique est incomplète.",
      finishReason === "length"
        ? "ANALYSIS_OUTPUT_LIMIT"
        : "INVALID_PROVIDER_RESPONSE",
      jobAttempt < 3,
    )
  }

  console.info(
    "[mirava-analysis-response]",
    JSON.stringify({
      creationId:
        reference.creationId,
      referenceAssetId:
        reference.id,
      model:
        analysisModel,
      durationMs,
      contentLength:
        content.length,
    }),
  )

  try {
    const parsed =
      parseV2Extraction(content)

    const sceneContext =
      await classifySceneContext(parsed)

    const blueprint:
      VisualDirectionBlueprint = {
        id: randomUUID(),
        status: "published",
        transferMode:
          "FIDELITY",
        creativeDirectionSummary:
          parsed.creativeDirectionSummary,
        baseGenerationPrompt:
          parsed.baseGenerationPrompt,
        negativeGuardrails:
          parsed.negativeGuardrails,
        sceneProfile:
          sceneContext.sceneProfile,
        photographicGenre:
          sceneContext.photographicGenre,
        extractionMetadata: {
          extractorVersion:
            MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version,
          classifierVersion:
            MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_METADATA.version,
          model:
            analysisModel,
          createdAt:
            new Date().toISOString(),
          referenceAssetId:
            reference.id,
        },
        qualityFlags: {
          lightingContractPresent:
            parsed.baseGenerationPrompt
              .toLowerCase()
              .includes("light"),
          cameraContractPresent:
            parsed.baseGenerationPrompt
              .toLowerCase()
              .includes("camera") ||
            parsed.baseGenerationPrompt
              .toLowerCase()
              .includes("crop"),
          poseContractPresent:
            parsed.baseGenerationPrompt
              .toLowerCase()
              .includes("pose"),
          wardrobeContractPresent:
            parsed.baseGenerationPrompt
              .toLowerCase()
              .includes("wardrobe") ||
            parsed.baseGenerationPrompt
              .toLowerCase()
              .includes("garment"),
          identityLanguageDetected:
            false,
          requiresHumanReview:
            sceneContext.requiresHumanReview,
        },
      }

    return {
      creativeDirectionSummary:
        blueprint.creativeDirectionSummary,
      masterPrompt:
        blueprint.baseGenerationPrompt,
      negativePrompt:
        blueprint.negativeGuardrails,
    }
  } catch (error) {
    console.error(
      "[mirava-analysis-parse-error]",
      JSON.stringify({
        creationId:
          reference.creationId,
        referenceAssetId:
          reference.id,
        name:
          providerExceptionName(error),
        message:
          providerExceptionMessage(error),
        contentLength:
          content.length,
      }),
    )

    throw new StudioError(
      "L’analyse artistique doit être relancée.",
      "INVALID_PROVIDER_RESPONSE",
      true,
    )
  }
}

const MIRAVA_PRIMARY_IDENTITY_ASSET_COUNT = 3

export function selectMiravaPrimaryIdentityAssets<T>(
  assets: T[],
): T[] {
  return assets.slice(
    0,
    MIRAVA_PRIMARY_IDENTITY_ASSET_COUNT,
  )
}

export function buildMiravaPrimaryGenerationPrompt(
  creation: Pick<
    StudioCreationRecord,
    "masterPrompt"
  >,
): string {
  /*
   * Le master prompt extrait contient déjà le contrat d’identité.
   * Le conserver intact reproduit le chemin manuel validé dans ChatGPT.
   */
  return creation.masterPrompt?.trim() ?? ""
}

export function buildMiravaResolvedPrimaryGenerationPrompt(
  creation: Pick<
    StudioCreationRecord,
    | "masterPrompt"
    | "presetId"
    | "creativeOptions"
  >,
): string {
  const officialBlueprint =
    getMiravaOfficialUniverseBlueprint(
      creation.presetId,
    )

  if (officialBlueprint) {
    return buildMiravaOfficialUniversePrimaryPrompt({
      masterPrompt:
        creation.masterPrompt,
      creativeOptions:
        creation.creativeOptions,
    })
  }

  return buildMiravaPrimaryGenerationPrompt(
    creation,
  )
}

export function buildMiravaGenerationPrompt(
  creation: Pick<StudioCreationRecord, "masterPrompt" | "negativePrompt" | "creativeOptions">,
  frameIndex = 0,
  physicalTraits: PhysicalTrait[] = []
): string {
  const creativePreferences =
    formatMiravaCreativeOptions(
      creation.creativeOptions,
    )

  const seriesSize =
    getMiravaSeriesSize(
      creation.creativeOptions,
    )

  const seriesBrief =
    buildMiravaSeriesShotBrief(
      creation.creativeOptions,
      frameIndex,
    )

  const physicalTraitsSegment =
    formatPhysicalTraitsForPrompt(
      physicalTraits,
    )

  const inferredSceneContext =
    heuristicSceneClassification({
      creativeDirectionSummary: "",
      baseGenerationPrompt: creation.masterPrompt ?? "",
      negativeGuardrails: creation.negativePrompt ?? "",
    })

  const fakeBlueprint: VisualDirectionBlueprint = {
    id: "legacy",
    status: "published",
    transferMode: "FIDELITY",
    creativeDirectionSummary: "",
    baseGenerationPrompt: creation.masterPrompt ?? "",
    negativeGuardrails: creation.negativePrompt ?? "",
    sceneProfile: inferredSceneContext.sceneProfile,
    photographicGenre: inferredSceneContext.photographicGenre,
    extractionMetadata: {
      extractorVersion: MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version,
      classifierVersion: MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_METADATA.version,
      model: MIRAVA_ANALYSIS_MODEL,
      createdAt: new Date().toISOString(),
      referenceAssetId: "none",
    },
    qualityFlags: {
      lightingContractPresent: true,
      cameraContractPresent: true,
      poseContractPresent: true,
      wardrobeContractPresent: true,
      identityLanguageDetected: false,
      requiresHumanReview: false,
    },
  }

  const compiled =
    compileGenerationPrompt({
      blueprint:
        fakeBlueprint,
      sceneContext:
        inferredSceneContext,
      generation: {
        frameIndex,
        imageCount:
          seriesSize,
      },
    })

  const downstreamFidelityPrecedence = [
    "DOWNSTREAM FIDELITY PRECEDENCE — The approved reference art direction remains authoritative after all identity, series, physical-trait, and client-preference segments are combined.",
    seriesSize === 1
      ? "SINGLE-IMAGE SESSION — Preserve the extracted crop, composition, pose skeleton, expression, gaze, hairstyle silhouette, wardrobe topology, architecture, camera perspective, lighting, and visual hierarchy. Do not introduce a series-style crop, new pose, new setting, or generic replacement."
      : frameIndex === 0
        ? "SERIES FIDELITY ANCHOR — Frame 1 must remain the closest structural reconstruction of the approved reference. Do not vary its pose, expression, crop, camera geometry, hairstyle arrangement, wardrobe topology, architecture, or lighting."
        : "SERIES VARIATION — Vary only the dimensions authorized by the series brief and client-approved variation axes. Preserve every non-varied reference constraint and do not replace specific architecture, garment construction, expression, or styling with generic equivalents.",
    "When two instructions conflict, preserve identity and required safety coverage first, then preserve the approved reference construction, then apply only compatible preferences or series variation.",
  ].join(" ")

  return [
    compiled.positivePrompt,
    physicalTraitsSegment,
    seriesBrief,
    creativePreferences,
    downstreamFidelityPrecedence,
    compiled.negativeGuardrails
      ? `Avoid: ${compiled.negativeGuardrails}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

async function purgeMiravaArtisticReferenceAssets(
  creationId: string,
): Promise<void> {
  try {
    const references =
      await getStudioAssets(
        creationId,
        "REFERENCE",
      )

    if (
      references.length === 0
    ) {
      return
    }

    const {
      error:
        referencePurgeError,
    } =
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .remove(
          references.map(
            (asset) =>
              asset.storagePath,
          ),
        )

    if (referencePurgeError) {
      throw referencePurgeError
    }

    const deletedAt =
      new Date()
        .toISOString()

    await Promise.all(
      references.map(
        (asset) =>
          db.studioAsset.update({
            where: {
              id: asset.id,
              creationId,
            },
            data: {
              deletedAt,
            },
          }),
      ),
    )
  } catch (error) {
    console.error(
      "[mirava-reference-purge-deferred]",
      JSON.stringify({
        creationId,
        sourceName:
          providerExceptionName(
            error,
          ),
        sourceMessage:
          providerExceptionMessage(
            error,
          ),
      }),
    )
  }
}

async function getMiravaContinuityResultAsset(
  creation: StudioCreationRecord,
): Promise<StudioAssetRecord | null> {
  if (!creation.parentCreationId) return null

  const parent =
    await getStudioCreationForUser(
      creation.userId,
      creation.parentCreationId,
    )

  if (parent.status !== "COMPLETED") {
    throw new StudioError(
      "Le cliché source de cette séance n’est pas disponible.",
      "INVALID_STATE",
    )
  }

  const results =
    await getStudioAssets(
      parent.id,
      "RESULT",
    )

  const index =
    creation.sourceResultIndex ?? 0

  return results[index] ?? null
}

async function getMiravaSessionProviderVisualReferences(
  creation: StudioCreationRecord,
): Promise<MiravaSessionProviderReference[]> {
  if (!creation.sessionId) return []

  const session = await db.studioSession.findFirst({
    where: {
      id: creation.sessionId,
      userId: creation.userId,
    },
    include: {
      lookItems: {
        include: {
          assets: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
      referenceCreation: {
        include: {
          assets: {
            where: {
              kind: "REFERENCE",
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  }) as {
    builderConfig: unknown
    lookItems: Array<{
      position: number
      assets: Array<{
        id: string
        storagePath: string
        mimeType: string
        viewKey: string | null
        createdAt: Date | string
      }>
    }>
    referenceCreation: {
      assets: Array<{
        id: string
        storagePath: string
        mimeType: string
        createdAt: Date | string
      }>
    } | null
  } | null

  const config = session?.builderConfig
  const lookMode = config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>).lookMode
    : null

  if (lookMode === "CUSTOM") {
    return selectMiravaCustomLookProviderReferences({
      lookItems: session?.lookItems ?? [],
    })
  }

  if (lookMode === "REFERENCE") {
    return selectMiravaReferenceLookProviderReferences({
      assets: (session?.referenceCreation?.assets ?? []).map((asset) => ({
        ...asset,
        viewKey: "FRONT",
      })),
    })
  }

  return []
}

function buildMiravaSessionProviderInputPrompt(
  prompt: string,
  references: readonly MiravaSessionProviderReference[],
): string {
  if (!references.length) return prompt

  const roles = references.map((reference, index) => {
    const image = index + 1
    return reference.role === "WARDROBE"
      ? `Attached image ${image} is WARDROBE ONLY: reproduce its garment or accessory faithfully, but never use it as an identity source.`
      : `Attached image ${image} is ART DIRECTION ONLY: preserve its wardrobe and photographic character, but never transfer its face, body identity, skin identity or distinguishing characteristics.`
  })

  return [
    "MIRAVA IMAGE ROLE CONTRACT — Identity Profile images remain the sole authority for the generated person's identity.",
    ...roles,
    prompt,
  ].join("\n\n")
}

async function generateStudioImageCandidate(
  creation: StudioCreationRecord,
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
  frameIndex = 0,
  physicalTraits: PhysicalTrait[] = [],
  bodyIdentityPrompt = "",
  jobAttempt = 1,
  studioJob: StudioJobRecord | null = null,
): Promise<Buffer> {
  const apiKey =
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new StudioError(
      "Le moteur Studio n’est pas configuré.",
      "PROVIDER_CONFIGURATION",
    )
  }

  assertAtLeastOneValidatedIdentityImage(
    identityAssets,
  )

  const sessionVisualReferences =
    await getMiravaSessionProviderVisualReferences(
      creation,
    )
  const sessionProviderInputs =
    buildMiravaSessionProviderImageInputs(
      sessionVisualReferences,
    )

  const continuityAsset =
    await getMiravaContinuityResultAsset(
      creation,
    )

  const continuationDirective =
    readMiravaContinuationDirective(
      creation.creativeOptions,
      creation.shotIntent,
    )

  const isContinuation =
    Boolean(
      continuityAsset &&
      creation.parentCreationId &&
      continuationDirective,
    )

  const providerTimeoutMs =
    isContinuation
      ? MIRAVA_CONTINUITY_IMAGE_PROVIDER_TIMEOUT_MS
      : MIRAVA_IMAGE_PROVIDER_TIMEOUT_MS

  const isReferenceAnchor =
    frameIndex === 0 &&
    !isContinuation

  const anchorPrompt =
    isReferenceAnchor
      ? buildMiravaPrimaryGenerationPrompt(
          creation,
        )
      : buildMiravaGenerationPrompt(
          creation,
          frameIndex,
          physicalTraits,
        )

  const scenePrimaryPrompt =
    isContinuation &&
    continuationDirective
      ? buildMiravaSessionContinuationPrompt({
          masterPrompt:
            creation.masterPrompt ?? "",
          negativePrompt:
            creation.negativePrompt ?? "",
          intents:
            continuationDirective.intents,
          customInstruction:
            continuationDirective
              .customInstruction,
          shotIndex:
            creation.shotIndex ?? 1,
          hasContinuityImage:
            true,
        }).positivePrompt
      : anchorPrompt

  const primaryPrompt =
    applyMiravaMakeupDirection(
      scenePrimaryPrompt,
      creation.creativeOptions,
    )

  const campaignRisk =
    detectMiravaCampaignRisk(
      primaryPrompt,
    )

  const campaignSafeContinuation =
    isContinuation &&
    continuationDirective
      ? {
          intents:
            continuationDirective
              .intents,
          customInstruction:
            continuationDirective
              .customInstruction,
        }
      : undefined

  const resolvedPrimaryPrompt =
    campaignRisk.requiresCampaignSafeTransfer
      ? buildMiravaCampaignSafeTransferPrompt(
          primaryPrompt,
          "standard",
          campaignSafeContinuation,
        )
      : primaryPrompt

  const primaryIdentityAssets =
    isReferenceAnchor ||
    isContinuation
      ? selectMiravaPrimaryIdentityAssets(
          identityAssets,
        )
      : identityAssets

  const kieProviderEnabled =
    isMiravaKieImageProviderEnabled() &&
    await hasMiravaExternalImageGenerationConsent(
      creation.userId,
    )

  const useKieCampaignProvider =
    kieProviderEnabled &&
    (
      campaignRisk
        .requiresCampaignSafeTransfer ||
      shouldRouteMiravaPromptToKie(
        primaryPrompt,
      )
    )

  /*
   * Les erreurs OpenAI 429/5xx et réponses incomplètes sont déjà marquées
   * retryable par executeCall/failJob. Au lieu de répéter trois fois le même
   * fournisseur, la tentative suivante bascule vers Kie lorsqu'il est
   * explicitement activé et autorisé par la configuration de confidentialité.
   *
   * Les refus de sécurité OpenAI ne sont pas retryable : ils n'entrent donc
   * jamais dans ce chemin de récupération.
   */
  const useKieProviderRecovery =
    kieProviderEnabled &&
    !useKieCampaignProvider &&
    jobAttempt > 1

  const kieArtisticReference =
    useKieCampaignProvider &&
    !isContinuation
      ? (
          await getStudioAssets(
            creation.id,
            "REFERENCE",
          )
        )[0] ?? null
      : null

  const kieIdentityAssets =
    (
      useKieCampaignProvider ||
      useKieProviderRecovery
    )
      ? identityAssets
      : []

  const clearKieTaskState =
    async (): Promise<void> => {
      if (!studioJob) {
        return
      }

      await db.studioJob.update({
        where: {
          id: studioJob.id,
        },
        data: {
          provider: null,
          providerTaskId: null,
          providerState: null,
          providerFrameIndex: null,
        },
      })
    }

  const executeKieCall =
    async (
      promptText: string,
      variant:
        | "campaign-safe-kie-primary"
        | "campaign-safe-kie-fallback"
        | "provider-recovery-kie",
      allowResume: boolean,
    ): Promise<Buffer> => {
      const startedAt =
        Date.now()

      /*
       * V6 FACE_ID boundary:
       * only profile-backed identity assets with durable
       * MediaPipe faceGeometry may become provider FACE_ID.
       */
      const identityProfileAssets =
        kieIdentityAssets.flatMap(
          (asset) =>
            "identityProfileId" in asset
              ? [
                  asset as
                    StudioIdentityAssetRecord,
                ]
              : [],
        )

      if (
        identityProfileAssets.length !==
        kieIdentityAssets.length
      ) {
        throw new StudioError(
          "Votre Profil identité doit être réenregistré afin d’activer la représentation visage haute fidélité.",
          "IDENTITY_REQUIRED",
        )
      }

      const identityFaceInputs =
        getMiravaKieIdentityFaceInputs(
          identityProfileAssets,
        )

      const availableFaceViews =
        new Set(
          identityFaceInputs.map(
            ({ asset }) =>
              asset.viewKey,
          ),
        )

      const requiredFaceGeometryMissing =
        MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS
          .some(
            (viewKey) =>
              !availableFaceViews.has(
                viewKey,
              ),
          )

      if (
        requiredFaceGeometryMissing
      ) {
        throw new StudioError(
          "Votre Profil identité doit être réenregistré afin d’activer la représentation visage haute fidélité.",
          "IDENTITY_REQUIRED",
        )
      }

      const selectedIdentityFaceInputs =
        selectMiravaKieRequiredIdentityFaceInputs(
          identityProfileAssets,
        )

      const identityReferences:
        MiravaKieReferenceImage[] =
        []

      /*
       * FACE_ID crops are deterministic server-side
       * crops. Kie receives signed private URLs, never
       * the raw full identity photographs.
       */
      try {
        for (
          const {
            asset,
            faceGeometry,
          } of
          selectedIdentityFaceInputs
        ) {
          const crop =
            await createMiravaKieIdentityCrop(
              creation,
              frameIndex,
              asset,
              faceGeometry,
            )

          identityReferences.push({
            role:
              "IDENTITY",
            sourceUrl:
              await createMiravaKieSignedInputUrl(
                crop,
              ),
            mimeType:
              crop.mimeType,
            fileName:
              `identity-face-${asset.id}.jpg`,
          })
        }
      } catch (error) {
        await purgeMiravaKieIdentityCrops(
          creation,
          frameIndex,
          selectedIdentityFaceInputs.map(
            ({ asset }) =>
              asset,
          ),
        )

        throw error
      }

      const references:
        MiravaKieReferenceImage[] =
        []

      /*
       * Continuation contract:
       * the previous approved RESULT is reference #1
       * because the continuation prompt explicitly
       * declares the first attached image as CONTINUITY.
       *
       * Session Builder references keep their roles and
       * relative ordering immediately after CONTINUITY.
       */
      if (continuityAsset) {
        references.push({
          role:
            "CONTINUITY",
          sourceUrl:
            await createMiravaKieSignedInputUrl(
              continuityAsset,
            ),
          mimeType:
            continuityAsset
              .mimeType,
          fileName:
            `continuity-${continuityAsset.id}.${extensionForMime(continuityAsset.mimeType)}`,
        })
      }

      for (
        const reference of
        sessionProviderInputs
      ) {
        references.push({
          role:
            reference.role,
          sourceUrl:
            await createMiravaKieSignedInputUrl(
              reference,
            ),
          mimeType:
            reference.mimeType,
          fileName:
            `${reference.fileName}.${extensionForMime(reference.mimeType)}`,
        })
      }

      if (kieArtisticReference) {
        references.push({
          role:
            "ART_DIRECTION",
          sourceUrl:
            await createMiravaKieSignedInputUrl(
              kieArtisticReference,
            ),
          mimeType:
            kieArtisticReference
              .mimeType,
          fileName:
            `art-direction-${kieArtisticReference.id}.${extensionForMime(kieArtisticReference.mimeType)}`,
        })
      }

      references.push(
        ...identityReferences,
      )

      if (
        references.length > 8
      ) {
        references.splice(8)
      }

      /*
       * BODY_ID remains server-owned textual morphology.
       * FACE_ID photographs must never become its fallback.
       */
      const providerPrompt =
        buildMiravaKieReferencePrompt({
          prompt:
            promptText,
          roles:
            references.map(
              (reference) =>
                reference.role,
            ),
          bodyIdentity:
            bodyIdentityPrompt,
        })

      const promptHash =
        createHash("sha256")
          .update(providerPrompt)
          .digest("hex")
          .slice(0, 16)

      const resumeTaskId =
        allowResume &&
        studioJob?.provider ===
          "kie" &&
        studioJob
          .providerFrameIndex ===
          frameIndex
          ? studioJob
              .providerTaskId
          : null

      console.info(
        "[mirava-kie-image-attempt]",
        JSON.stringify({
          creationId:
            creation.id,
          frameIndex,
          shotIndex:
            creation.shotIndex ??
            0,
          variant,
          jobAttempt,
          promptHash,
          promptLength:
            providerPrompt.length,
          inputImageCount:
            references.length,
          referenceRoles:
            references.map(
              (reference) =>
                reference.role,
            ),
          sessionVisualReferenceIds:
            sessionVisualReferences.map(
              (reference) => reference.id,
            ),
          sessionVisualReferenceRoles:
            sessionVisualReferences.map(
              (reference) => reference.role,
            ),
          artisticReferencePresent:
            Boolean(
              kieArtisticReference,
            ),
          continuityAssetPresent:
            Boolean(
              continuityAsset,
            ),
          resumeTask:
            Boolean(
              resumeTaskId,
            ),
        }),
      )

      try {
        const result =
          await runKieImageGeneration({
            prompt:
              providerPrompt,
            images:
              references,
            resumeTaskId,
            onTaskCreated:
              studioJob
                ? async (
                    taskId,
                  ) => {
                    await db
                      .studioJob
                      .update({
                        where: {
                          id:
                            studioJob.id,
                        },
                        data: {
                          provider:
                            "kie",
                          providerTaskId:
                            taskId,
                          providerState:
                            "submitted",
                          providerFrameIndex:
                            frameIndex,
                        },
                      })
                  }
                : undefined,
          })

        console.info(
          "[mirava-kie-image-success]",
          JSON.stringify({
            creationId:
              creation.id,
            frameIndex,
            variant,
            taskId:
              result.taskId,
            elapsedMs:
              Date.now() -
              startedAt,
          }),
        )

        return result.image
      } catch (error) {
        if (
          error instanceof
            KieProviderError
        ) {
          console.error(
            "[mirava-kie-image-error]",
            JSON.stringify({
              creationId:
                creation.id,
              frameIndex,
              variant,
              code:
                error.code,
              kind:
                error.kind,
              retryable:
                error.retryable,
              providerMessage:
                error.message.slice(
                  0,
                  500,
                ),
              elapsedMs:
                Date.now() -
                startedAt,
            }),
          )

          if (
            error.kind ===
              "task_not_found"
          ) {
            await clearKieTaskState()
          }

          if (
            error.kind ===
              "safety"
          ) {
            throw new StudioError(
              "La génération n’a pas été autorisée par les règles de sécurité.",
              "SAFETY_REFUSAL",
            )
          }

          if (
            error.kind ===
              "billing"
          ) {
            /*
             * Never expose provider account state to
             * Studio clients. Exact provider diagnostics
             * have already been written to the private log.
             */
            throw new StudioError(
              "Le service d’image est temporairement indisponible.",
              "PROVIDER_UNAVAILABLE",
              false,
            )
          }

          throw new StudioError(
            "Le moteur d’image alternatif est temporairement indisponible.",
            error.code,
            error.retryable,
          )
        }

        throw error
      }
    }

  const executeCall = async (
    promptText: string,
    assets: Array<
      StudioAssetRecord |
      StudioIdentityAssetRecord
    >,
    variant:
      | "parity-primary"
      | "series-primary"
      | "continuity-primary"
      | "campaign-safe-primary"
      | "campaign-safe-fallback"
      | "official-safe-fallback"
      | "semantic-fallback",
    continuityInput:
      | StudioAssetRecord
      | null,
  ): Promise<Buffer> => {
    const promptHash =
      createHash("sha256")
        .update(promptText)
        .digest("hex")
        .slice(0, 16)

    const startedAt =
      Date.now()

    console.info(
      "[mirava-image-attempt]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        shotIndex:
          creation.shotIndex ?? 0,
        shotIntent:
          creation.shotIntent ?? null,
        variant,
        jobAttempt,
        timeoutMs:
          providerTimeoutMs,
        campaignSafeTransfer:
          campaignRisk.requiresCampaignSafeTransfer,
        campaignRiskScore:
          campaignRisk.riskScore,
        campaignRiskReasons:
          campaignRisk.reasons,
        promptHash,
        promptLength:
          promptText.length,
        identityAssetCount:
          assets.length,
        sessionProviderInputIds:
          sessionProviderInputs.map(
            (input) => input.id,
          ),
        sessionProviderInputRoles:
          sessionProviderInputs.map(
            (input) => input.role,
          ),
        continuityAssetPresent:
          Boolean(continuityInput),
        model:
          MIRAVA_IMAGE_MODEL,
      }),
    )

    const form = new FormData()
    const providerPrompt =
      buildMiravaSessionProviderInputPrompt(
        promptText,
        sessionProviderInputs,
      )

    form.append("model", MIRAVA_IMAGE_MODEL)
    form.append("prompt", providerPrompt)
    form.append("size", "1024x1536")
    form.append("quality", "high")
    form.append("output_format", "png")
    form.append("moderation", "low")

    if (continuityInput) {
      const buffer =
        await downloadAsset(
          continuityInput,
        )

      form.append(
        "image[]",
        new Blob(
          [new Uint8Array(buffer)],
          {
            type:
              continuityInput.mimeType,
          },
        ),
        `continuity-${continuityInput.id}.${extensionForMime(continuityInput.mimeType)}`,
      )
    }

    for (const reference of sessionProviderInputs) {
      const buffer = await downloadAsset(reference)
      form.append(
        "image[]",
        new Blob(
          [new Uint8Array(buffer)],
          { type: reference.mimeType },
        ),
        `${reference.fileName}.${extensionForMime(reference.mimeType)}`,
      )
    }

    for (const asset of assets) {
      const buffer =
        await downloadAsset(asset)

      form.append(
        "image[]",
        new Blob(
          [new Uint8Array(buffer)],
          {
            type:
              asset.mimeType,
          },
        ),
        `identity-${asset.id}.${extensionForMime(asset.mimeType)}`,
      )
    }

    let response: Response

    try {
      response = await fetch(
        "https://api.openai.com/v1/images/edits",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
          },
          body: form,
          signal:
            AbortSignal.timeout(
              providerTimeoutMs,
            ),
        },
      )
    } catch (error) {
      console.error(
        "[Studio image provider transport error]",
        JSON.stringify({
          creationId:
            creation.id,
          frameIndex,
          shotIndex:
            creation.shotIndex ?? 0,
          shotIntent:
            creation.shotIntent ?? null,
          variant,
          jobAttempt,
          timeoutMs:
            providerTimeoutMs,
          elapsedMs:
            Date.now() - startedAt,
          continuityAssetPresent:
            Boolean(continuityInput),
          sourceName:
            providerExceptionName(error),
          sourceMessage:
            providerExceptionMessage(error),
        }),
      )

      throw error
    }

    if (!response.ok) {
      const retryable =
        response.status === 429 ||
        response.status >= 500

      const providerBody =
        await response.text()

      console.error(
        "[Studio image provider error]",
        JSON.stringify({
          status:
            response.status,
          requestId:
            response.headers.get(
              "x-request-id",
            ),
          contentType:
            response.headers.get(
              "content-type",
            ),
          model:
            MIRAVA_IMAGE_MODEL,
          variant,
          jobAttempt,
          timeoutMs:
            providerTimeoutMs,
          elapsedMs:
            Date.now() - startedAt,
          promptHash,
          promptLength:
            promptText.length,
          identityAssetCount:
            assets.length,
          continuityAssetPresent:
            Boolean(continuityInput),
          body:
            providerBody.slice(
              0,
              4000,
            ),
        }),
      )

      let providerCode = ""

      try {
        const parsed =
          JSON.parse(
            providerBody,
          ) as {
            error?: {
              code?: string
              type?: string
            }
          }

        providerCode =
          parsed.error?.code ??
          parsed.error?.type ??
          ""
      } catch {
        providerCode = ""
      }

      const safetyRefusal =
        providerCode ===
          "content_policy_violation" ||
        providerCode ===
          "safety_violations" ||
        providerCode ===
          "moderation_blocked"

      if (safetyRefusal) {
        throw new StudioError(
          "La génération n’a pas été autorisée par les règles de sécurité.",
          "SAFETY_REFUSAL",
        )
      }

      throw new StudioError(
        "La génération est temporairement indisponible.",
        `OPENAI_${response.status}${providerCode ? `_${providerCode}` : ""}`,
        retryable,
      )
    }

    const data =
      await response.json() as {
        data?: Array<{
          b64_json?: string
        }>
      }

    const encoded =
      data.data?.[0]?.b64_json

    if (!encoded) {
      throw new StudioError(
        "La génération est incomplète.",
        "INVALID_PROVIDER_RESPONSE",
        true,
      )
    }

    console.info(
      "[mirava-image-success]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        shotIndex:
          creation.shotIndex ?? 0,
        shotIntent:
          creation.shotIntent ?? null,
        variant,
        jobAttempt,
        timeoutMs:
          providerTimeoutMs,
        elapsedMs:
          Date.now() - startedAt,
        continuityAssetPresent:
          Boolean(continuityInput),
      }),
    )

    return Buffer.from(
      encoded,
      "base64",
    )
  }

  if (
     useKieCampaignProvider &&
     kieArtisticReference &&
     isReferenceAnchor
   ) {
     /*
      * MIRAVA V6.9
      *
      * Pass A is the immutable final full-frame image.
      * Identity restoration must never trigger a second
      * full-frame provider generation.
      */
     const durablePassAStoragePath =
       miravaKieIntermediateStoragePath(
         creation,
         frameIndex,
       )

     const passAAlreadyDurable =
       studioJob?.provider ===
         "kie" &&
       studioJob.providerState ===
         MIRAVA_KIE_V6_PASS_A_READY_STATE &&
       studioJob.providerFrameIndex ===
         frameIndex

     if (passAAlreadyDurable) {
       console.info(
         "[mirava-v6-pass-a-resume]",
         JSON.stringify({
           creationId:
             creation.id,
           frameIndex,
           storagePath:
             durablePassAStoragePath,
         }),
       )

       const durablePassA =
         await downloadAsset({
           storagePath:
             durablePassAStoragePath,
         })

       return durablePassA
     }

     let passAImage:
       Buffer

     try {
       passAImage =
         await executeKieCall(
           resolvedPrimaryPrompt,
           "campaign-safe-kie-primary",
           true,
         )
     } catch (error) {
       if (
         !(
           error instanceof
             StudioError
         ) ||
         error.code !==
           "SAFETY_REFUSAL"
       ) {
         throw error
       }

       /*
        * Conservative fallback is still Pass A.
        * This is a replacement for a rejected attempt,
        * not an identity-restoration Pass B.
        */
       await clearKieTaskState()

       passAImage =
         await executeKieCall(
           buildMiravaCampaignSafeTransferPrompt(
             primaryPrompt,
             "conservative",
             campaignSafeContinuation,
           ),
           "campaign-safe-kie-fallback",
           false,
         )
     }

     /*
      * Durability boundary:
      * after this storage succeeds, the full frame
      * must not be regenerated for identity restoration.
      */
     const storedPassAPath =
       await storeMiravaKieIntermediateAsset(
         creation,
         frameIndex,
         passAImage,
       )

     if (studioJob) {
       await db.studioJob.update({
         where: {
           id:
             studioJob.id,
         },
         data: {
           provider:
             "kie",
           providerTaskId:
             null,
           providerState:
             MIRAVA_KIE_V6_PASS_A_READY_STATE,
           providerFrameIndex:
             frameIndex,
         },
       })
     }

     console.info(
       "[mirava-v6-pass-a-ready]",
       JSON.stringify({
         creationId:
           creation.id,
         frameIndex,
         storagePath:
           storedPassAPath,
       }),
     )

     /*
      * First execution and resumed execution both return
      * the exact durable normalized Pass-A artifact.
      */
     return await downloadAsset({
       storagePath:
         storedPassAPath,
     })
   }

   /*
    * Kie without an artistic reference remains the
    * existing single-pass path.
    */
   if (useKieCampaignProvider) {
     try {
       return await executeKieCall(
         resolvedPrimaryPrompt,
         "campaign-safe-kie-primary",
         true,
       )
     } catch (error) {
       if (
         !(
           error instanceof
             StudioError
         ) ||
         error.code !==
           "SAFETY_REFUSAL"
       ) {
         throw error
       }

       await clearKieTaskState()

       return await executeKieCall(
         buildMiravaCampaignSafeTransferPrompt(
           primaryPrompt,
           "conservative",
           campaignSafeContinuation,
         ),
         "campaign-safe-kie-fallback",
         false,
       )
     }
   }

   if (useKieProviderRecovery) {
    console.info(
      "[mirava-image-provider-failover]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        jobAttempt,
        from:
          "openai",
        to:
          "kie",
        reason:
          "retryable-primary-provider-failure",
      }),
    )

    return await executeKieCall(
      resolvedPrimaryPrompt,
      "provider-recovery-kie",
      true,
    )
  }

  try {
    return await executeCall(
      resolvedPrimaryPrompt,
      primaryIdentityAssets,
      campaignRisk.requiresCampaignSafeTransfer
        ? "campaign-safe-primary"
        : isContinuation
          ? "continuity-primary"
          : isReferenceAnchor
            ? "parity-primary"
            : "series-primary",
      campaignRisk.requiresCampaignSafeTransfer
        ? null
        : continuityAsset,
    )
  } catch (error) {
    if (
      !(
        error instanceof
          StudioError
      ) ||
      error.code !==
        "SAFETY_REFUSAL"
    ) {
      throw error
    }

    const officialBlueprint =
      getMiravaOfficialUniverseBlueprint(
        creation.presetId,
      )

    if (officialBlueprint) {
      return await executeCall(
        buildMiravaOfficialUniverseSafetyFallbackPrompt(
          officialBlueprint,
        ),
        primaryIdentityAssets,
        "official-safe-fallback",
        null,
      )
    }

    if (
      campaignRisk.requiresCampaignSafeTransfer
    ) {
      return await executeCall(
        buildMiravaCampaignSafeTransferPrompt(
          primaryPrompt,
          "conservative",
          campaignSafeContinuation,
        ),
        primaryIdentityAssets,
        "campaign-safe-fallback",
        null,
      )
    }

    const fallbackBase =
      isContinuation &&
      continuationDirective
        ? buildMiravaSessionContinuationPrompt({
            masterPrompt:
              creation.masterPrompt ?? "",
            negativePrompt:
              creation.negativePrompt ?? "",
            intents:
              continuationDirective.intents,
            customInstruction:
              continuationDirective
                .customInstruction,
            shotIndex:
              creation.shotIndex ?? 1,
            hasContinuityImage:
              false,
          }).positivePrompt
        : primaryPrompt

    const rewritten =
      complianceNeutralRewrite({
        positivePrompt:
          fallbackBase,
        negativeGuardrails:
          "",
        sceneProfile:
          "standard_fashion",
        metadata: {
          extractorVersion:
            "2.0.0",
          classifierVersion:
            "1.0.0",
          compilerVersion:
            "1.0.0",
          compiledAt:
            new Date()
              .toISOString(),
        },
      })

    return await executeCall(
      rewritten.positivePrompt,
      primaryIdentityAssets,
      "semantic-fallback",
      null,
    )
  }
}

async function generateStudioImage(
  creation: StudioCreationRecord,
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
  frameIndex = 0,
  physicalTraits: PhysicalTrait[] = [],
  bodyIdentityPrompt = "",
  jobAttempt = 1,
  studioJob: StudioJobRecord | null = null,
): Promise<Buffer> {
  const resumeLocalizedRestoration =
    studioJob?.provider === "kie" &&
    (
      studioJob.providerState ===
        MIRAVA_FACE_RESTORATION_SUBMITTED_STATE ||
      studioJob.providerState ===
        MIRAVA_FACE_RESTORATION_READY_STATE
    ) &&
    studioJob.providerFrameIndex ===
      frameIndex

  const candidate =
    resumeLocalizedRestoration
      ? await downloadAsset({
          storagePath:
            miravaKieIntermediateStoragePath(
              creation,
              frameIndex,
            ),
        })
      : await generateStudioImageCandidate(
          creation,
          identityAssets,
          frameIndex,
          physicalTraits,
          bodyIdentityPrompt,
          jobAttempt,
          studioJob,
        )

  const gateMode =
    getMiravaFaceIdentityGateMode()

  if (gateMode === "off") {
    return candidate
  }

  const canonicalInputs =
    selectMiravaKieRequiredIdentityFaceInputs(
      identityAssets,
    )

  if (
    canonicalInputs.length !==
      MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS.length
  ) {
    console.warn(
      "[mirava-face-identity-gate-unscorable]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        gateMode,
        reasonCode:
          "CANONICAL_IDENTITY_VIEWS_MISSING",
      }),
    )

    if (gateMode === "required") {
      throw new StudioError(
        "Votre Profil identité doit être réenregistré avant la vérification haute fidélité.",
        "IDENTITY_REQUIRED",
        false,
      )
    }

    return candidate
  }

  const canonicalViewKey = (
    value: string | null | undefined,
  ): string => {
    if (!value) {
      throw new StudioError(
        "Une vue canonique du Profil identité ne possède pas de rôle explicite.",
        "IDENTITY_MANIFEST_INVALID",
        false,
      )
    }

    return value
  }

  let requestId =
    randomUUID()

  try {
    const referenceImages =
      await Promise.all(
        canonicalInputs.map(
          async ({ asset }) => ({
            buffer:
              await downloadAsset(
                asset,
              ),
            mimeType:
              asset.mimeType,
            fileName:
              `identity-${asset.viewKey ?? asset.id}.${extensionForMime(asset.mimeType)}`,
          }),
        ),
      )

    const identityManifest =
      buildMiravaIdentityManifest(
        canonicalInputs.map(
          (
            {
              asset,
            },
            index,
          ) => ({
            assetId:
              asset.id,
            viewKey:
              canonicalViewKey(
                asset.viewKey,
              ),
            mimeType:
              asset.mimeType,
            faceGeometry:
              asset.faceGeometry,
            buffer:
              referenceImages[index]
                .buffer,
          }),
        ),
      )

    const identityProfileId =
      canonicalInputs[0]
        .asset
        .identityProfileId

    const {
      error:
        identityManifestError,
    } =
      await supabaseAdmin
        .from(
          "StudioIdentityManifest",
        )
        .upsert(
          {
            id:
              randomUUID(),
            identityProfileId,
            userId:
              creation.userId,
            schemaVersion:
              identityManifest.schemaVersion,
            versionHash:
              identityManifest.versionHash,
            assetManifest:
              identityManifest.assets,
          },
          {
            onConflict:
              "identityProfileId,versionHash",
            ignoreDuplicates:
              true,
          },
        )

    if (identityManifestError) {
      throw new StudioError(
        "Le manifeste sécurisé du Profil identité n’a pas pu être enregistré.",
        "IDENTITY_MANIFEST_STORAGE_ERROR",
        true,
      )
    }

    const evaluateCandidate =
      async (
        image: Buffer,
        stage:
          | "pass-a"
          | "pass-b",
      ): Promise<
        MiravaFaceIdentityGateResult
      > => {
        requestId =
          randomUUID()

        const result =
          await evaluateMiravaFaceIdentity({
            candidate: {
              buffer: image,
              mimeType:
                "image/png",
              fileName:
                `${stage}-${creation.id}-${frameIndex}.png`,
            },
            references:
              referenceImages as [
                typeof referenceImages[number],
                typeof referenceImages[number],
                typeof referenceImages[number],
              ],
            identityManifestVersion:
              identityManifest.versionHash,
            requestId,
          })

        const {
          error:
            evidenceError,
        } =
          await supabaseAdmin
            .from(
              "StudioIdentityEvaluation",
            )
            .insert({
              id:
                requestId,
              creationId:
                creation.id,
              identityProfileId,
              userId:
                creation.userId,
              frameIndex,
              stage,
              decision:
                result.decision,
              reasonCode:
                result.reasonCode,
              aggregateSimilarity:
                result.aggregateSimilarity,
              threshold:
                result.threshold,
              landmarkResidual:
                result.landmarkResidual,
              landmarkThreshold:
                result.landmarkThreshold,
              perReferenceSimilarity:
                result.perReferenceSimilarity,
              evaluator:
                result.evaluator,
              candidateFace:
                result.candidateFace,
              identityManifestVersion:
                identityManifest.versionHash,
            })

        if (evidenceError) {
          console.error(
            "[mirava-face-identity-evidence-storage-error]",
            JSON.stringify({
              creationId:
                creation.id,
              frameIndex,
              stage,
              requestId,
            }),
          )

          if (gateMode === "required") {
            throw new StudioError(
              "La preuve privée de fidélité du visage n’a pas pu être enregistrée.",
              "IDENTITY_EVIDENCE_STORAGE_ERROR",
              true,
            )
          }
        }

        console.info(
          "[mirava-face-identity-gate-result]",
          JSON.stringify({
            creationId:
              creation.id,
            frameIndex,
            gateMode,
            stage,
            requestId,
            decision:
              result.decision,
            reasonCode:
              result.reasonCode,
            aggregateSimilarity:
              result.aggregateSimilarity,
            threshold:
              result.threshold,
            landmarkResidual:
              result.landmarkResidual,
            landmarkThreshold:
              result.landmarkThreshold,
            evaluator:
              result.evaluator,
            candidateFaceCount:
              result.candidateFace.count,
            candidateFaceBox:
              result.candidateFace.box,
          }),
        )

        return result
      }

    const gateResult =
      await evaluateCandidate(
        candidate,
        resumeLocalizedRestoration &&
        studioJob?.providerState ===
          MIRAVA_FACE_RESTORATION_READY_STATE
          ? "pass-b"
          : "pass-a",
      )

    if (gateResult.decision === "PASS") {
      return candidate
    }

    if (gateMode !== "required") {
      return candidate
    }

    const restorationAlreadyEvaluated =
      studioJob?.providerState ===
        MIRAVA_FACE_RESTORATION_READY_STATE

    if (
      gateResult.decision === "FAIL" &&
      gateResult.candidateFace.box &&
      !restorationAlreadyEvaluated &&
      isMiravaKieImageProviderEnabled() &&
      await hasMiravaExternalImageGenerationConsent(
        creation.userId,
      )
    ) {
      const metadata =
        await sharp(candidate)
          .metadata()
      const crop =
        metadata.width &&
        metadata.height
          ? resolveMiravaDetectedFaceRestorationCrop({
              face:
                gateResult.candidateFace.box,
              imageWidth:
                metadata.width,
              imageHeight:
                metadata.height,
            })
          : null

      if (crop) {
        await storeMiravaKieIntermediateAsset(
          creation,
          frameIndex,
          candidate,
        )
        const targetCrop =
          await sharp(candidate)
            .extract(crop)
            .png()
            .toBuffer()
        const identityProviderReferences =
          await Promise.all(
            canonicalInputs.map(
              async (
                { asset },
                index,
              ) => {
                const reference =
                  referenceImages[index]
                const referenceMetadata =
                  await sharp(
                    reference.buffer,
                  ).metadata()
                const identityCrop =
                  referenceMetadata.width &&
                  referenceMetadata.height
                    ? resolveMiravaIdentityFaceCrop({
                        geometry:
                          asset.faceGeometry,
                        imageWidth:
                          referenceMetadata.width,
                        imageHeight:
                          referenceMetadata.height,
                      })
                    : null

                if (!identityCrop) {
                  throw new StudioError(
                    "Une vue canonique du Profil identité ne peut pas être recadrée de façon fiable.",
                    "IDENTITY_INVALID",
                    false,
                  )
                }

                return {
                  role:
                    "IDENTITY" as const,
                  buffer:
                    await sharp(
                      reference.buffer,
                    )
                      .extract(
                        identityCrop,
                      )
                      .jpeg({
                        quality: 94,
                      })
                      .toBuffer(),
                  mimeType:
                    "image/jpeg",
                  fileName:
                    `face-id-${canonicalViewKey(asset.viewKey)}.jpg`,
                }
              },
            ),
          )
        const resumeTaskId =
          studioJob?.providerState ===
            MIRAVA_FACE_RESTORATION_SUBMITTED_STATE
            ? studioJob.providerTaskId
            : null

        let restoration:
          Buffer

        try {
          const result =
            await runKieImageGeneration({
              prompt:
                buildMiravaKieIdentityRestorationPrompt({
                  identityCount:
                    referenceImages.length,
                  bodyIdentity:
                    bodyIdentityPrompt,
                }),
              images: [
                {
                  role:
                    "ART_DIRECTION",
                  buffer:
                    targetCrop,
                  mimeType:
                    "image/png",
                  fileName:
                    `face-target-${creation.id}-${frameIndex}.png`,
                },
                ...identityProviderReferences,
              ],
              aspectRatio:
                "1:1",
              resumeTaskId,
              onTaskCreated:
                studioJob
                  ? async (
                      taskId,
                    ) => {
                      await db.studioJob
                        .update({
                          where: {
                            id:
                              studioJob.id,
                          },
                          data: {
                            provider:
                              "kie",
                            providerTaskId:
                              taskId,
                            providerState:
                              MIRAVA_FACE_RESTORATION_SUBMITTED_STATE,
                            providerFrameIndex:
                              frameIndex,
                          },
                        })
                    }
                  : undefined,
            })

          restoration =
            result.image
        } catch (error) {
          if (
            error instanceof
              KieProviderError
          ) {
            throw new StudioError(
              "La restauration locale du visage est temporairement indisponible.",
              error.code,
              error.retryable,
            )
          }

          throw error
        }

        let restoredCandidate:
          Buffer

        try {
          restoredCandidate =
            await compositeMiravaIdentityRestoration({
              passA:
                candidate,
              restoredCrop:
                restoration,
              crop,
            })
        } catch {
          throw new StudioError(
            "La restauration locale du visage a renvoyé une image incompatible.",
            "IDENTITY_RESTORATION_INVALID_OUTPUT",
            true,
          )
        }

        await storeMiravaKieIntermediateAsset(
          creation,
          frameIndex,
          restoredCandidate,
        )

        if (studioJob) {
          await db.studioJob.update({
            where: {
              id:
                studioJob.id,
            },
            data: {
              provider:
                "kie",
              providerTaskId:
                null,
              providerState:
                MIRAVA_FACE_RESTORATION_READY_STATE,
              providerFrameIndex:
                frameIndex,
            },
          })
        }

        const restoredGateResult =
          await evaluateCandidate(
            restoredCandidate,
            "pass-b",
          )

        if (
          restoredGateResult.decision ===
          "PASS"
        ) {
          console.info(
            "[mirava-face-identity-restoration-accepted]",
            JSON.stringify({
              creationId:
                creation.id,
              frameIndex,
              crop,
              beforeSimilarity:
                gateResult.aggregateSimilarity,
              afterSimilarity:
                restoredGateResult.aggregateSimilarity,
            }),
          )

          return restoredCandidate
        }
      }
    }

    if (studioJob) {
      await db.studioJob.update({
        where: {
          id:
            studioJob.id,
        },
        data: {
          provider:
            null,
          providerTaskId:
            null,
          providerState:
            null,
          providerFrameIndex:
            null,
        },
      })
    }

    throw new StudioError(
      "Le visage généré n’atteint pas encore la fidélité d’identité requise. MIRAVA relance la création.",
      gateResult.decision === "UNSCORABLE"
        ? "IDENTITY_FIDELITY_UNSCORABLE"
        : "IDENTITY_FIDELITY_REJECTED",
      true,
    )
  } catch (error) {
    if (error instanceof StudioError) {
      throw error
    }

    console.error(
      "[mirava-face-identity-gate-error]",
      JSON.stringify({
        creationId:
          creation.id,
        frameIndex,
        gateMode,
        requestId,
        code:
          error instanceof
            MiravaFaceIdentityGateError
            ? error.code
            : "FACE_IDENTITY_GATE_INTERNAL",
        retryable:
          error instanceof
            MiravaFaceIdentityGateError
            ? error.retryable
            : true,
      }),
    )

    if (gateMode === "required") {
      throw new StudioError(
        "La vérification d’identité du visage est temporairement indisponible.",
        error instanceof
          MiravaFaceIdentityGateError
          ? error.code
          : "FACE_IDENTITY_GATE_INTERNAL",
        error instanceof
          MiravaFaceIdentityGateError
          ? error.retryable
          : true,
      )
    }
  }

  return candidate
}

export async function cropMiravaResult(
  image: Buffer,
): Promise<Buffer> {
  /*
   * Preserve the provider composition and native
   * aspect ratio.
   *
   * MIRAVA may reduce oversized output to 1024px wide,
   * but must never impose a second full-frame crop after
   * Pass A has established the final composition.
   */
  return sharp(image)
    .resize({
      width: 1024,
      withoutEnlargement: true,
    })
    .png()
    .toBuffer()
}

async function storeResultAsset(creation: StudioCreationRecord, image: Buffer): Promise<void> {
  const cropped = await cropMiravaResult(image)
  const id = randomUUID()
  const storagePath = `${creation.userId}/${creation.id}/result-${id}.png`
  const { error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).upload(storagePath, cropped, { contentType: "image/png", upsert: false })
  if (error) throw new StudioError("Le résultat n’a pas pu être stocké.", "STORAGE_ERROR", true)
  await db.studioAsset.create({ data: { id, creationId: creation.id, userId: creation.userId, kind: "RESULT", storagePath, mimeType: "image/png", bytes: cropped.length } })
}

function retryDelayMs(attempts: number): number {
  return Math.min(60_000, 5_000 * 2 ** attempts)
}

async function finishJob(job: StudioJobRecord): Promise<void> {
  await db.studioJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: "DONE",
      lockedAt: null,
      failureCode: null,
      provider: null,
      providerTaskId: null,
      providerState: null,
      providerFrameIndex: null,
    },
  })
}

async function failJob(
  job: StudioJobRecord,
  creation: StudioCreationRecord,
  error: unknown,
): Promise<void> {
  const studioError =
    error instanceof StudioError
      ? error
      : isProviderTimeout(error)
        ? new StudioError(
            job.kind === "ANALYZE"
              ? "L’analyse de la référence a dépassé le temps disponible."
              : "La génération de l’image a dépassé le temps disponible.",
            job.kind === "ANALYZE"
              ? "ANALYSIS_TIMEOUT"
              : "GENERATION_TIMEOUT",
            job.kind === "GENERATE",
          )
        : new StudioError(
            "La création Studio a échoué.",
            "INTERNAL_ERROR",
            true,
          )

  console.error(
    "[mirava-job-failure]",
    JSON.stringify({
      creationId:
        creation.id,
      jobId:
        job.id,
      jobKind:
        job.kind,
      currentAttempt:
        job.attempts + 1,
      normalizedCode:
        studioError.code,
      retryable:
        studioError.retryable,
      sourceName:
        providerExceptionName(error),
      sourceMessage:
        providerExceptionMessage(error),
    }),
  )

  const attempts =
    job.attempts + 1

  const maxAttempts =
    studioError.code ===
      "GENERATION_TIMEOUT"
      ? MIRAVA_GENERATION_TIMEOUT_MAX_ATTEMPTS
      : 3

  const retry =
    studioError.retryable &&
    attempts < maxAttempts
  if (retry) {
    await db.studioJob.update({ where: { id: job.id }, data: { status: "PENDING", attempts, nextRunAt: new Date(Date.now() + retryDelayMs(attempts)).toISOString(), lockedAt: null, failureCode: studioError.code } })
    await db.studioCreation.update({ where: { id: creation.id }, data: { status: job.kind === "ANALYZE" ? "ANALYSIS_QUEUED" : "GENERATION_QUEUED" } })
    return
  }

  /*
   * Retryable GENERATE failures return above this point,
   * preserving v6-pass-a-ready and temporary inputs.
   *
   * Reaching this branch means failure is terminal.
   */
  if (job.kind === "GENERATE") {
    await purgeMiravaKieTemporaryAssetsForCreation(
      creation,
    )
  }

  if (job.kind === "ANALYZE" && creation.creditReservationKey) {
    await releaseMiravaCreditReservation({
      userId: creation.userId,
      creationId: creation.id,
      key: studioKey("studio-analysis-release", creation.id),
      reason: studioError.code,
    })
  }
  const requiresTechnicalCompensation = job.kind === "GENERATE" &&
    creation.creditReservationKey &&
    studioError.code !== "IDENTITY_REQUIRED" &&
    studioError.code !== "INVALID_IMAGE"
  if (requiresTechnicalCompensation) {
    const deliveredCount = (await getStudioAssets(creation.id, "RESULT")).length
    const missingCount = Math.max(0, getMiravaSeriesSize(creation.creativeOptions) - deliveredCount)
    if (missingCount > 0) {
    await grantMiravaCredits({
      userId: creation.userId,
      kind: "COMPENSATION",
      ledgerKind: "COMPENSATION",
        amount: missingCount,
      key: studioKey("studio-generation-compensation", creation.id),
        metadata: { product: MIRAVA_STRIPE_PRODUCT, reason: studioError.code, deliveredCount, missingCount },
    })
    }
  }
  await db.studioJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: "FAILED",
      attempts,
      lockedAt: null,
      failureCode:
        studioError.code,
      provider: null,
      providerTaskId: null,
      providerState: null,
      providerFrameIndex: null,
    },
  })
  await db.studioCreation.update({ where: { id: creation.id }, data: { status: "FAILED", failureCode: studioError.code, failureMessage: publicFailureMessage(studioError.code) } })
}

function publicFailureMessage(code: string): string {
  if (code === "PROVIDER_UNAVAILABLE") {
    return "Le service d’image est momentanément indisponible. Les crédits correspondant aux images non livrées ont été restaurés. Vous pourrez réessayer plus tard."
  }

  if (code === "KIE_UPLOAD_QUOTA") {
    return "Le moteur d’image a temporairement atteint sa capacité d’envoi. Votre crédit a été restauré. Vous pourrez relancer votre création dès que le service sera de nouveau disponible."
  }
  if (
    code === "SAFETY_REFUSAL" ||
    code === "OPENAI_400_moderation_blocked"
  ) {
    return "Cette direction ne peut pas être générée dans sa forme actuelle. Votre crédit a été restauré."
  }
  if (code === "INVALID_IMAGE") {
    return "Une image n’est pas exploitable. Remplacez-la avant de réessayer."
  }
  if (code === "ANALYSIS_TIMEOUT") {
    return "MIRAVA n’a pas pu terminer la lecture de votre référence dans le délai prévu. Votre crédit a été restauré. Relancez une nouvelle séance : aucune image d’identité n’a été perdue."
  }
  if (code === "GENERATION_TIMEOUT") {
    return "Le moteur d’image n’a pas terminé votre création dans le délai prévu. Votre crédit a été restauré. Vous pouvez relancer une nouvelle séance sans perdre vos photos d’identité."
  }
  return "Un problème technique a interrompu cette séance. Votre crédit a été restauré lorsque nécessaire. Vous pouvez relancer sans perdre votre Profil identité."
}

async function processStudioJob(job: StudioJobRecord): Promise<void> {
  const creation = asCreation(await db.studioCreation.findUnique({ where: { id: job.creationId } }))
  if (!creation) {
    await db.studioJob.update({ where: { id: job.id }, data: { status: "FAILED", failureCode: "CREATION_MISSING" } })
    return
  }
  try {
    if (job.kind === "ANALYZE") {
      if (creation.status === "MASTER_PROMPT_READY" && creation.masterPrompt) {
        await finishJob(job)
        return
      }
      await db.studioCreation.update({ where: { id: creation.id }, data: { status: "ANALYSING" } })
      const reference = (await getStudioAssets(creation.id, "REFERENCE"))[0]
      if (!reference) throw new StudioError("Photo de référence introuvable.", "REFERENCE_REQUIRED")
      const extracted =
        await extractMasterPrompt(
          reference,
          job.attempts + 1,
        )
      const existingProfile = await db.studioProfile.findUnique({ where: { sourceCreationId: creation.id, userId: creation.userId } })
      const profile = existingProfile
        ? await db.studioProfile.update({ where: { id: existingProfile.id, userId: creation.userId }, data: { creativeDirectionSummary: extracted.creativeDirectionSummary, masterPrompt: extracted.masterPrompt, negativePrompt: extracted.negativePrompt } })
        : await db.studioProfile.create({ data: { userId: creation.userId, sourceCreationId: creation.id, name: profileName(), creativeDirectionSummary: extracted.creativeDirectionSummary, masterPrompt: extracted.masterPrompt, negativePrompt: extracted.negativePrompt } })
      /*
       * Ne jamais publier MASTER_PROMPT_READY avant que toute la finalisation
       * de l'analyse soit durable. Sinon le client peut afficher "Studio prêt"
       * puis failJob peut remettre la création en ANALYSIS_QUEUED si une
       * opération post-analyse échoue.
       *
       * Si le Profil identité est déjà prêt, on passe directement de ANALYSING
       * à GENERATION_QUEUED et on crée le job GENERATE dans la même transaction.
       * L'utilisatrice n'a donc aucun second bouton "Créer" à comprendre.
       */
      if (creation.sessionId) {
        await db.studioSession.update({
          where: { id: creation.sessionId },
          data: {
            studioProfileId: profile.id,
            identityProfileId:
              creation.identityProfileId ?? null,
          },
        })
      }

      await debitMiravaCreditReservation(
        creation.userId,
        creation.id,
        studioKey(
          "studio-analysis-debit",
          creation.id,
        ),
      )

      const identityAssets =
        await getIdentityAssetsForCreation(
          creation,
        )

      const analysedData = {
        studioProfileId: profile.id,
        creativeDirectionSummary:
          extracted.creativeDirectionSummary,
        masterPrompt:
          extracted.masterPrompt,
        negativePrompt:
          extracted.negativePrompt,
        failureCode: null,
        failureMessage: null,
      }

      if (
        canAutoGenerateMiravaCreation(
          identityAssets.length,
        )
      ) {
        await db.$transaction([
          db.studioCreation.update({
            where: {
              id: creation.id,
            },
            data: {
              ...analysedData,
              status:
                "GENERATION_QUEUED",
            },
          }),
          db.studioJob.create({
            data: {
              id: randomUUID(),
              creationId:
                creation.id,
              kind: "GENERATE",
              status: "PENDING",
            },
          }),
        ])
      } else {
        await db.studioCreation.update({
          where: {
            id: creation.id,
          },
          data: {
            ...analysedData,
            status:
              "MASTER_PROMPT_READY",
          },
        })
      }

      const extractedCampaignRisk =
        detectMiravaCampaignRisk(
          extracted.masterPrompt,
        )

      const retainReferenceForKieGeneration =
        isMiravaKieImageProviderEnabled() &&
        await hasMiravaExternalImageGenerationConsent(
          creation.userId,
        ) &&
        (
          extractedCampaignRisk
            .requiresCampaignSafeTransfer ||
          shouldRouteMiravaPromptToKie(
            extracted.masterPrompt,
          )
        )

      if (
        retainReferenceForKieGeneration
      ) {
        console.info(
          "[mirava-reference-retained-for-kie-generation]",
          JSON.stringify({
            creationId:
              creation.id,
            referenceAssetId:
              reference.id,
          }),
        )
      } else {
        await purgeMiravaArtisticReferenceAssets(
          creation.id,
        )
      }
    } else if (job.kind === "GENERATE") {
      const requestedResultCount = getMiravaSeriesSize(creation.creativeOptions)
      const existingResults = await getStudioAssets(creation.id, "RESULT")
      if (existingResults.length >= requestedResultCount) {
        await db.studioCreation.update({ where: { id: creation.id }, data: { status: "COMPLETED", completedAt: creation.completedAt ?? new Date().toISOString() } })
        await purgeMiravaArtisticReferenceAssets(
          creation.id,
        )
        await purgeMiravaKieTemporaryAssetsForCreation(
          creation,
        )
        await finishJob(job)
        return
      }
      await db.studioCreation.update({ where: { id: creation.id }, data: { status: "GENERATING" } })
      const currentCreation = asCreation(await db.studioCreation.findUnique({ where: { id: creation.id } }))
      const identities = await getIdentityAssetsForCreation(currentCreation)
      if (!identities.length) throw new StudioError("Photo d’identité introuvable.", "IDENTITY_REQUIRED")
      const identityProfile = currentCreation.identityProfileId
        ? await db.studioIdentityProfile.findUnique({ where: { id: currentCreation.identityProfileId } })
        : await db.studioIdentityProfile.findUnique({ where: { userId: currentCreation.userId } })

      const identityProfileRecord =
        identityProfile as
          | Record<string, unknown>
          | null

      const physicalTraits =
        parsePhysicalTraits(
          identityProfileRecord
            ?.physicalTraits,
        )

      /*
       * BODY_ID is generated only from the strict,
       * server-owned morphology contract.
       *
       * Invalid, absent or low-confidence morphology
       * produces an empty prompt. It never falls back
       * to body inference from FACE_ID photographs.
       */
      const identityMorphology =
        parseIdentityMorphology(
          identityProfileRecord
            ?.identityMorphology,
        )

      const bodyIdentityPrompt =
        formatIdentityMorphologyForPrompt(
          identityMorphology,
        )

      /*
       * Une invocation Vercel produit une seule image.
       *
       * Une série de six images devient donc six invocations courtes et
       * récupérables, au lieu d'une fonction unique susceptible de dépasser
       * sa durée maximale.
       */
      const frameIndex = existingResults.length
      const output = await generateStudioImage(
        creation,
        identities,
        frameIndex,
        physicalTraits,
        bodyIdentityPrompt,
        job.attempts + 1,
        job,
      )

      await storeResultAsset(
        creation,
        output,
      )

      /*
       * RESULT is now durable.
       * Temporary Pass-A artifacts may now be removed.
       */
      await purgeMiravaKieTemporaryAssetsForFrame(
        creation,
        frameIndex,
        identities,
      )

      await db.studioJob.update({
        where: {
          id: job.id,
        },
        data: {
          provider: null,
          providerTaskId: null,
          providerState: null,
          providerFrameIndex: null,
        },
      })

      const completedResultCount =
        frameIndex + 1

      if (
        completedResultCount <
        requestedResultCount
      ) {
        await db.studioJob.update({
          where: {
            id: job.id,
          },
          data: {
            status: "PENDING",
            lockedAt: null,
            nextRunAt:
              new Date().toISOString(),
            failureCode: null,
          },
        })

        await db.studioCreation.update({
          where: {
            id: creation.id,
          },
          data: {
            status: "GENERATING",
          },
        })

        return
      }

      await db.studioCreation.update({
        where: {
          id: creation.id,
        },
        data: {
          status: "COMPLETED",
          completedAt:
            new Date().toISOString(),
        },
      })

      await purgeMiravaArtisticReferenceAssets(
        creation.id,
      )

      void notifyMiravaCreationReady(
        creation.userId,
        creation.id,
      )
    }
    await finishJob(job)
  } catch (error) {
    /*
     * processStudioJob charge la création avant d'exécuter le job. Si une
     * opération située après la transition durable échoue, cet objet initial
     * est obsolète. Ne jamais utiliser cet ancien état pour remettre une
     * analyse déjà finalisée en file d'attente.
     */
    let failureCreation =
      creation

    try {
      const latest =
        await db.studioCreation
          .findUnique({
            where: {
              id: creation.id,
            },
          })

      if (latest) {
        failureCreation =
          asCreation(latest)
      }
    } catch {
      // Le traitement d'erreur conserve l'état initial si la relecture échoue.
    }

    const analysisIsDurable =
      job.kind === "ANALYZE" &&
      Boolean(
        failureCreation.masterPrompt
          ?.trim(),
      ) &&
      (
        failureCreation.status ===
          "MASTER_PROMPT_READY" ||
        isMiravaGenerationAlreadyDurable(
          failureCreation.status,
        )
      )

    if (analysisIsDurable) {
      console.error(
        "[mirava-analysis-durable-state-preserved]",
        JSON.stringify({
          creationId:
            failureCreation.id,
          jobId:
            job.id,
          status:
            failureCreation.status,
          sourceName:
            providerExceptionName(
              error,
            ),
          sourceMessage:
            providerExceptionMessage(
              error,
            ),
        }),
      )

      try {
        await finishJob(job)
      } catch {
        // Le récupérateur de verrous peut reprendre ce job.
      }

      return
    }

    await failJob(
      job,
      failureCreation,
      error,
    )
  }
}

export async function recoverStaleStudioJobsForCreation(
  creationId: string,
): Promise<number> {
  /*
   * Une fonction Vercel Hobby peut être interrompue après sa durée
   * maximale. Un verrou plus ancien que six minutes est donc considéré
   * comme abandonné et redevient disponible.
   */
  const staleAt = new Date(
    Date.now() - 6 * 60_000,
  ).toISOString()

  const { data, error } =
    await supabaseAdmin
      .from("StudioJob")
      .update({
        status: "PENDING",
        lockedAt: null,
        nextRunAt:
          new Date().toISOString(),
      })
      .eq("creationId", creationId)
      .eq("status", "RUNNING")
      .lte("lockedAt", staleAt)
      .select("id")

  if (error) {
    throw new Error(
      `Studio stale recovery failed: ${error.message}`,
    )
  }

  return data?.length ?? 0
}

export async function processNextStudioJobForCreation(
  creationId: string,
): Promise<boolean> {
  const now =
    new Date().toISOString()

  const { data: candidates, error } =
    await supabaseAdmin
      .from("StudioJob")
      .select("*")
      .eq("creationId", creationId)
      .eq("status", "PENDING")
      .lte("nextRunAt", now)
      .order("nextRunAt", {
        ascending: true,
      })
      .limit(1)

  if (error) {
    throw new Error(
      `Studio job selection failed: ${error.message}`,
    )
  }

  if (!candidates?.[0]) {
    return false
  }

  const candidate =
    candidates[0] as StudioJobRecord

  /*
   * Le verrou conditionnel garantit qu'une seule invocation Vercel
   * traite cette étape, même si le navigateur et la chaîne interne
   * relancent simultanément le moteur.
   */
  const { data: locked, error: lockError } =
    await supabaseAdmin
      .from("StudioJob")
      .update({
        status: "RUNNING",
        lockedAt: now,
      })
      .eq("id", candidate.id)
      .eq("status", "PENDING")
      .select()
      .maybeSingle()

  if (lockError) {
    throw new Error(
      `Studio job locking failed: ${lockError.message}`,
    )
  }

  if (!locked) {
    return false
  }

  await processStudioJob(
    locked as StudioJobRecord,
  )

  return true
}

export async function nextStudioJobDelayForCreation(
  creationId: string,
): Promise<number | null> {
  const { data, error } =
    await supabaseAdmin
      .from("StudioJob")
      .select("nextRunAt")
      .eq("creationId", creationId)
      .eq("status", "PENDING")
      .order("nextRunAt", {
        ascending: true,
      })
      .limit(1)

  if (error) {
    throw new Error(
      `Studio pending job lookup failed: ${error.message}`,
    )
  }

  const nextRunAt =
    data?.[0]?.nextRunAt

  if (!nextRunAt) {
    return null
  }

  return Math.max(
    0,
    new Date(nextRunAt).getTime() -
      Date.now(),
  )
}

export async function processNextStudioJob(): Promise<boolean> {
  const now = new Date().toISOString()
  const { data: candidates, error } = await supabaseAdmin
    .from("StudioJob")
    .select("*")
    .eq("status", "PENDING")
    .lte("nextRunAt", now)
    .order("nextRunAt", { ascending: true })
    .limit(1)
  if (error || !candidates?.[0]) return false
  const candidate = candidates[0] as StudioJobRecord
  const { data: locked } = await supabaseAdmin
    .from("StudioJob")
    .update({ status: "RUNNING", lockedAt: now })
    .eq("id", candidate.id)
    .eq("status", "PENDING")
    .select()
    .maybeSingle()
  if (!locked) return false
  await processStudioJob(locked as StudioJobRecord)
  return true
}

export async function recoverStaleStudioJobs(): Promise<number> {
  const staleAt = new Date(Date.now() - 10 * 60_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from("StudioJob")
    .update({ status: "PENDING", lockedAt: null, nextRunAt: new Date().toISOString() })
    .eq("status", "RUNNING")
    .lte("lockedAt", staleAt)
    .select("id")
  if (error) return 0
  return data?.length ?? 0
}

export async function purgeExpiredStudioAssets(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("StudioAsset")
    .select("*")
    .is("deletedAt", null)
    .not("expiresAt", "is", null)
    .lte("expiresAt", new Date().toISOString())
    .limit(100)
  if (error || !data?.length) return 0
  const assets = data as StudioAssetRecord[]
  await supabaseAdmin.storage.from(STUDIO_BUCKET).remove(assets.map((asset) => asset.storagePath))
  await Promise.all(assets.map((asset) => db.studioAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date().toISOString() } })))
  return assets.length
}

export function studioErrorResponse(error: unknown): { message: string; status: number } {
  if (error instanceof MiravaCreditError) {
    return { message: error.message, status: error.code === "INSUFFICIENT_CREDITS" ? 402 : error.code === "NOT_FOUND" ? 404 : 500 }
  }
  if (error instanceof StudioError) {
    const status = error.code === "NOT_FOUND" || error.code === "DOSSIER_NOT_FOUND" ? 404
      : error.code === "INSUFFICIENT_CREDITS" || error.code === "PAYMENT_REQUIRED" ? 402
        : error.code === "CREDIT_ERROR" || error.code === "STORAGE_ERROR" || error.code === "PROVIDER_CONFIGURATION" ? 500
          : 400
    return { message: error.message, status }
  }
  return { message: "Une erreur Studio est survenue.", status: 500 }
}
