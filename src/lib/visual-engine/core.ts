import { createHash, randomUUID } from "crypto"
import sharp from "sharp"
import { db } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { MIRAVA_ANALYSIS_MODEL, MIRAVA_IMAGE_MODEL } from "@/lib/mirava/server-config"
import { MIRAVA_STRIPE_PRODUCT, getMiravaStudioPreset, type MiravaStudioPresetId } from "@/lib/mirava/brand"
import { formatMiravaCreativeOptions, miravaCreativeOptionsSchema, type MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import {
  buildMiravaOfficialUniversePrimaryPrompt,
  buildMiravaOfficialUniverseSafetyFallbackPrompt,
  getMiravaOfficialUniverseBlueprint,
  renderMiravaOfficialUniverseMasterPrompt,
} from "@/lib/mirava/official-universe-blueprints"
import { MIRAVA_MAX_IDENTITY_PHOTOS, MIRAVA_MIN_IDENTITY_PHOTOS, MIRAVA_RECOMMENDED_IDENTITY_PHOTOS } from "@/lib/mirava/identity-profile"
import { type PhysicalTrait, formatPhysicalTraitsForPrompt, parsePhysicalTraits } from "@/lib/mirava/physical-traits"
import { buildMiravaSeriesShotBrief, getMiravaSeriesSize } from "@/lib/mirava/series"
import {
  buildMiravaSessionContinuationPrompt,
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
import { complianceNeutralRewrite } from "@/lib/mirava/pipeline/compliance-neutral-rewrite"
import { assertNoArtisticReferenceInGenerationPayload, assertAtLeastOneValidatedIdentityImage } from "@/lib/mirava/security/assert-image-role-separation"
import type { VisualDirectionBlueprint } from "@/lib/mirava/schemas/visual-direction-blueprint.schema"

export const STUDIO_BUCKET = process.env.SUPABASE_STORAGE_VISUAL_ENGINE_BUCKET ?? "visual-engine-private"
export const STUDIO_CONSENT_VERSION = "2026-07-29"
export const MAX_STUDIO_IMAGE_BYTES = 10 * 1024 * 1024
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
  expiresAt: string | null
  deletedAt: string | null
  createdAt: string
}

type StudioIdentityAssetRecord = Omit<StudioAssetRecord, "creationId" | "kind" | "expiresAt" | "deletedAt"> & { identityProfileId: string }

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

    const profile =
      !currentProfile
        ? asProfile(
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

    studioProfileId =
      profile.id
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
  intent: MiravaShotIntent
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
          shotIntent:
            args.intent,
          sourceResultIndex,
          creativeOptions: {
            ...baseOptions,
            seriesSize:
              1,
            referenceMode:
              "faithful",
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

export async function getIdentityProfilePublic(userId: string) {
  const profile = await db.studioIdentityProfile.findUnique({ where: { userId } })
  if (!profile) return null
  const assets = await db.studioIdentityAsset.findMany({
    where: { identityProfileId: profile.id, userId },
    orderBy: { createdAt: "asc" },
  }) as StudioIdentityAssetRecord[]
  const previews = await Promise.all(assets.map(async (asset) => {
    const { data } = await supabaseAdmin.storage.from(STUDIO_BUCKET).createSignedUrl(asset.storagePath, 120)
    return data?.signedUrl ? { id: asset.id, url: data.signedUrl, createdAt: asset.createdAt } : null
  }))
  return {
    id: profile.id as string,
    assetCount: assets.length,
    updatedAt: profile.updatedAt as string,
    previews: previews.filter((preview): preview is NonNullable<typeof preview> => preview !== null),
  }
}

export async function replaceIdentityProfile(args: {
  userId: string
  creationId?: string
  ageConfirmed?: boolean
  rightsConfirmed?: boolean
  retentionAccepted?: boolean
  files: Array<{ mimeType: string; buffer: Buffer }>
}) {
  if (args.files.length < MIN_IDENTITY_ASSETS || args.files.length > MAX_IDENTITY_ASSETS) {
    throw new StudioError("Ajoutez entre trois et dix photos d’identité.", "IDENTITY_REQUIRED")
  }
  if (args.creationId) {
    await getStudioCreationForUser(args.userId, args.creationId)
    const consent = await db.studioConsent.findUnique({ where: { creationId: args.creationId, userId: args.userId } })
    if (!consent) throw new StudioError("Le consentement complet est requis.", "CONSENT_REQUIRED")
  } else if (!args.ageConfirmed || !args.rightsConfirmed || !args.retentionAccepted) {
    throw new StudioError("Le consentement complet est requis avant la création du Profil identité.", "CONSENT_REQUIRED")
  }
  for (const file of args.files) await validateStudioImage(file.buffer, file.mimeType)

  const existing = await db.studioIdentityProfile.findUnique({ where: { userId: args.userId } })
  const oldAssets = existing ? await db.studioIdentityAsset.findMany({ where: { identityProfileId: existing.id } }) : []
  if (oldAssets.length) await supabaseAdmin.storage.from(STUDIO_BUCKET).remove(oldAssets.map((asset: StudioIdentityAssetRecord) => asset.storagePath))
  if (existing) await db.studioIdentityAsset.deleteMany({ where: { identityProfileId: existing.id } })
  const profile = existing
    ? await db.studioIdentityProfile.update({ where: { id: existing.id, userId: args.userId }, data: { retentionAcceptedAt: new Date().toISOString() } })
    : await db.studioIdentityProfile.create({ data: { userId: args.userId, retentionAcceptedAt: new Date().toISOString() } })

  for (const file of args.files) {
    const id = randomUUID()
    const storagePath = `${args.userId}/identity-profile/${id}.${extensionForMime(file.mimeType)}`
    const { error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).upload(storagePath, file.buffer, { contentType: file.mimeType, upsert: false })
    if (error) throw new StudioError("Le stockage sécurisé de l’image a échoué.", "STORAGE_ERROR")
    await db.studioIdentityAsset.create({ data: { id, identityProfileId: profile.id, userId: args.userId, storagePath, mimeType: file.mimeType, bytes: file.buffer.length } })
  }
  if (args.creationId) {
    const linkedCreation = asCreation(await db.studioCreation.update({ where: { id: args.creationId, userId: args.userId }, data: { identityProfileId: profile.id } }))
    // A personal-reference analysis may have completed while the client was
    // preparing their identity profile. The final required input is now here,
    // so continue the already approved creation without asking for a second
    // "generate" click.
    if (linkedCreation.status === "MASTER_PROMPT_READY" && canAutoGenerateMiravaCreation(args.files.length)) {
      try {
        await queueStudioGeneration({ userId: args.userId, creationId: linkedCreation.id })
      } catch {
        // The creation remains ready and recoverable from its normal screen if
        // a transient queue failure occurs; never fail a completed identity upload.
      }
    }
  }
  return getIdentityProfilePublic(args.userId)
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

  const assets =
    await db.studioIdentityAsset.findMany({
      where: {
        identityProfileId: profile.id,
        userId: args.userId,
      },
    })

  if (assets.length <= MIN_IDENTITY_ASSETS) {
    throw new StudioError(
      "Conservez au moins trois photos. Remplacez une photo au lieu de la supprimer.",
      "IDENTITY_REQUIRED",
    )
  }

  const asset = assets.find(
    (candidate) =>
      candidate.id === args.assetId,
  )

  if (!asset) {
    throw new StudioError(
      "Photo identité introuvable.",
      "NOT_FOUND",
    )
  }

  const { error: storageError } =
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove([asset.storagePath])

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
          new Date().toISOString(),
      },
    }),
  ])

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
  files: Array<{ mimeType: string; buffer: Buffer }>
}) {
  if (args.files.length < 1) throw new StudioError("Ajoutez au moins une photo d’identité.", "IDENTITY_REQUIRED")
  if (!args.ageConfirmed || !args.rightsConfirmed || !args.retentionAccepted) {
    throw new StudioError("Le consentement complet est requis avant l’ajout au Profil identité.", "CONSENT_REQUIRED")
  }
  if (args.creationId) await getStudioCreationForUser(args.userId, args.creationId)

  const profile = await db.studioIdentityProfile.findUnique({ where: { userId: args.userId } })
  if (!profile) throw new StudioError("Créez d’abord votre Profil identité.", "IDENTITY_REQUIRED")
  const existingAssets = await db.studioIdentityAsset.findMany({ where: { identityProfileId: profile.id, userId: args.userId } })
  if (existingAssets.length + args.files.length > MAX_IDENTITY_ASSETS) {
    throw new StudioError("Dix photos d’identité maximum sont autorisées.", "ASSET_LIMIT")
  }
  for (const file of args.files) await validateStudioImage(file.buffer, file.mimeType)

  const uploadedPaths: string[] = []
  const createdIds: string[] = []
  try {
    for (const file of args.files) {
      const id = randomUUID()
      const storagePath = `${args.userId}/identity-profile/${id}.${extensionForMime(file.mimeType)}`
      const { error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).upload(storagePath, file.buffer, { contentType: file.mimeType, upsert: false })
      if (error) throw new StudioError("Le stockage sécurisé de l’image a échoué.", "STORAGE_ERROR")
      uploadedPaths.push(storagePath)
      await db.studioIdentityAsset.create({ data: { id, identityProfileId: profile.id, userId: args.userId, storagePath, mimeType: file.mimeType, bytes: file.buffer.length } })
      createdIds.push(id)
    }
  } catch (error) {
    if (createdIds.length) await db.studioIdentityAsset.deleteMany({ where: { id: { in: createdIds }, userId: args.userId } })
    if (uploadedPaths.length) await supabaseAdmin.storage.from(STUDIO_BUCKET).remove(uploadedPaths)
    throw error
  }

  await db.studioIdentityProfile.update({ where: { id: profile.id, userId: args.userId }, data: { retentionAcceptedAt: new Date().toISOString() } })
  if (args.creationId) {
    await db.studioCreation.update({ where: { id: args.creationId, userId: args.userId }, data: { identityProfileId: profile.id } })
  }
  return getIdentityProfilePublic(args.userId)
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
}): Promise<StudioAssetRecord> {
  const creation = await getStudioCreationForUser(args.userId, args.creationId)
  if (creation.status !== "DRAFT" && !(creation.status === "MASTER_PROMPT_READY" && args.kind === "IDENTITY")) {
    throw new StudioError("Cette étape ne peut plus recevoir de fichier.", "INVALID_STATE")
  }
  await validateStudioImage(args.buffer, args.mimeType)

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
        height: 450,
        fit: "cover",
        position: "attention",
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
    await db.studioJob.create({ data: { id: randomUUID(), creationId, kind: "ANALYZE", status: "PENDING" } })
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
  await db.studioJob.create({ data: { id: randomUUID(), creationId: args.creationId, kind: "GENERATE", status: "PENDING" } })
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

export async function deleteStudioCreation(userId: string, creationId: string): Promise<void> {
  await getStudioCreationForUser(userId, creationId)
  const assets = await getStudioAssets(creationId)
  if (assets.length) await supabaseAdmin.storage.from(STUDIO_BUCKET).remove(assets.map((asset) => asset.storagePath))
  await db.studioCreation.delete({ where: { id: creationId, userId } })
}

async function downloadAsset(asset: Pick<StudioAssetRecord, "storagePath">): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).download(asset.storagePath)
  if (error || !data) throw new StudioError("Le fichier sécurisé est indisponible.", "STORAGE_ERROR", true)
  return Buffer.from(await data.arrayBuffer())
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`
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
        MIRAVA_ANALYSIS_MODEL,
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
            MIRAVA_ANALYSIS_MODEL,
          store: false,
          max_completion_tokens:
            2800,
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
          MIRAVA_ANALYSIS_MODEL,
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
          MIRAVA_ANALYSIS_MODEL,
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
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }

  const content =
    data.choices?.[0]?.message?.content

  if (!content) {
    throw new StudioError(
      "L’analyse artistique est incomplète.",
      "INVALID_PROVIDER_RESPONSE",
      true,
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
        MIRAVA_ANALYSIS_MODEL,
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
            MIRAVA_ANALYSIS_MODEL,
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

async function generateStudioImage(
  creation: StudioCreationRecord,
  identityAssets: Array<
    StudioAssetRecord |
    StudioIdentityAssetRecord
  >,
  frameIndex = 0,
  physicalTraits: PhysicalTrait[] = [],
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

  const continuityAsset =
    await getMiravaContinuityResultAsset(
      creation,
    )

  assertNoArtisticReferenceInGenerationPayload({
    assets: continuityAsset
      ? [
          continuityAsset,
          ...identityAssets,
        ]
      : identityAssets,
  })

  const isContinuation =
    Boolean(
      continuityAsset &&
      creation.parentCreationId &&
      creation.shotIntent,
    )

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

  const primaryPrompt =
    isContinuation &&
    creation.shotIntent
      ? buildMiravaSessionContinuationPrompt({
          masterPrompt:
            creation.masterPrompt ?? "",
          negativePrompt:
            creation.negativePrompt ?? "",
          intent:
            creation.shotIntent,
          shotIndex:
            creation.shotIndex ?? 1,
          hasContinuityImage:
            true,
        }).positivePrompt
      : anchorPrompt

  const primaryIdentityAssets =
    isReferenceAnchor ||
    isContinuation
      ? selectMiravaPrimaryIdentityAssets(
          identityAssets,
        )
      : identityAssets

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
        promptHash,
        promptLength:
          promptText.length,
        identityAssetCount:
          assets.length,
        continuityAssetPresent:
          Boolean(continuityInput),
        model:
          MIRAVA_IMAGE_MODEL,
      }),
    )

    const form = new FormData()

    form.append("model", MIRAVA_IMAGE_MODEL)
    form.append("prompt", promptText)
    form.append("size", "1024x1536")
    form.append("quality", "high")
    form.append("output_format", "png")

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

    const response = await fetch(
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
            120_000,
          ),
      },
    )

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
          model:
            MIRAVA_IMAGE_MODEL,
          variant,
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

    return Buffer.from(
      encoded,
      "base64",
    )
  }

  try {
    return await executeCall(
      primaryPrompt,
      primaryIdentityAssets,
      isContinuation
        ? "continuity-primary"
        : isReferenceAnchor
          ? "parity-primary"
          : "series-primary",
      continuityAsset,
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

    const fallbackBase =
      isContinuation &&
      creation.shotIntent
        ? buildMiravaSessionContinuationPrompt({
            masterPrompt:
              creation.masterPrompt ?? "",
            negativePrompt:
              creation.negativePrompt ?? "",
            intent:
              creation.shotIntent,
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

export async function cropMiravaResult(image: Buffer): Promise<Buffer> {
  return sharp(image).resize({ width: 1024, height: 1280, fit: "cover", position: "attention" }).png().toBuffer()
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
  const retry = studioError.retryable && attempts < 3
  if (retry) {
    await db.studioJob.update({ where: { id: job.id }, data: { status: "PENDING", attempts, nextRunAt: new Date(Date.now() + retryDelayMs(attempts)).toISOString(), lockedAt: null, failureCode: studioError.code } })
    await db.studioCreation.update({ where: { id: creation.id }, data: { status: job.kind === "ANALYZE" ? "ANALYSIS_QUEUED" : "GENERATION_QUEUED" } })
    return
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
  await db.studioJob.update({ where: { id: job.id }, data: { status: "FAILED", attempts, lockedAt: null, failureCode: studioError.code } })
  await db.studioCreation.update({ where: { id: creation.id }, data: { status: "FAILED", failureCode: studioError.code, failureMessage: publicFailureMessage(studioError.code) } })
}

function publicFailureMessage(code: string): string {
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
      const extracted = await extractMasterPrompt(reference)
      const existingProfile = await db.studioProfile.findUnique({ where: { sourceCreationId: creation.id, userId: creation.userId } })
      const profile = existingProfile
        ? await db.studioProfile.update({ where: { id: existingProfile.id, userId: creation.userId }, data: { creativeDirectionSummary: extracted.creativeDirectionSummary, masterPrompt: extracted.masterPrompt, negativePrompt: extracted.negativePrompt } })
        : await db.studioProfile.create({ data: { userId: creation.userId, sourceCreationId: creation.id, name: profileName(), creativeDirectionSummary: extracted.creativeDirectionSummary, masterPrompt: extracted.masterPrompt, negativePrompt: extracted.negativePrompt } })
      const analysedCreation = asCreation(await db.studioCreation.update({ where: { id: creation.id }, data: { status: "MASTER_PROMPT_READY", studioProfileId: profile.id, creativeDirectionSummary: extracted.creativeDirectionSummary, masterPrompt: extracted.masterPrompt, negativePrompt: extracted.negativePrompt } }))
      if (analysedCreation.sessionId) {
        await db.studioSession.update({
          where: { id: analysedCreation.sessionId },
          data: {
            studioProfileId: profile.id,
            identityProfileId: analysedCreation.identityProfileId ?? null,
          },
        })
      }
      await supabaseAdmin.storage.from(STUDIO_BUCKET).remove([reference.storagePath])
      await db.studioAsset.update({ where: { id: reference.id, creationId: creation.id }, data: { deletedAt: new Date().toISOString() } })
      await debitMiravaCreditReservation(creation.userId, creation.id, studioKey("studio-analysis-debit", creation.id))
      const identityAssets = await getIdentityAssetsForCreation(analysedCreation)
      if (canAutoGenerateMiravaCreation(identityAssets.length)) {
        try {
          await queueStudioGeneration({ userId: creation.userId, creationId: creation.id })
        } catch {
          // The finished art direction is still usable from the normal creation
          // screen. A later retry must not invalidate the completed analysis.
        }
      }
    } else if (job.kind === "GENERATE") {
      const requestedResultCount = getMiravaSeriesSize(creation.creativeOptions)
      const existingResults = await getStudioAssets(creation.id, "RESULT")
      if (existingResults.length >= requestedResultCount) {
        await db.studioCreation.update({ where: { id: creation.id }, data: { status: "COMPLETED", completedAt: creation.completedAt ?? new Date().toISOString() } })
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
      const physicalTraits = parsePhysicalTraits((identityProfile as unknown as Record<string, unknown> | null)?.physicalTraits)
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
      )

      await storeResultAsset(
        creation,
        output,
      )

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

      void notifyMiravaCreationReady(
        creation.userId,
        creation.id,
      )
    }
    await finishJob(job)
  } catch (error) {
    await failJob(job, creation, error)
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
