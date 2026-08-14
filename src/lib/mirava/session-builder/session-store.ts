import { z } from "zod"

import { db } from "@/lib/db"

import {
  MIRAVA_SESSION_BUILDER_VERSION,
  MIRAVA_SESSION_LOOK_MODES,
  createDefaultMiravaSessionBuilderDraft,
  isMiravaSessionBuilderReady,
  miravaLightingPresetIdSchema,
  miravaSessionBuilderDraftSchema,
  miravaSetPresetIdSchema,
  type MiravaSessionBuilderDraft,
} from "./schema"
import {
  miravaSessionBuilderResumeStepSchema,
  type MiravaSessionBuilderResumeStep,
} from "./session-progress"
import {
  MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS,
  miravaSessionPersistedShotCountSchema,
  miravaSessionExpressionSchema,
  miravaSessionFramingSchema,
  miravaSessionGazeSchema,
  miravaSessionHairSchema,
  miravaSessionMakeupSchema,
  miravaSessionPoseSchema,
  miravaSessionSkinFinishSchema,
} from "./session-options"
import {
  MIRAVA_SESSION_LOOK_CATEGORIES,
  MIRAVA_SESSION_LOOK_VIEW_KEYS,
  type MiravaSessionLookCategory,
  type MiravaSessionLookViewKey,
} from "./look"
import {
  createMiravaSessionLookPreviewUrl,
} from "./session-look-preview"

type StudioSessionBuilderRow = {
  id: string
  userId: string
  identityProfileId?: string | null
  builderVersion?: number | null
  setPresetId?: string | null
  lightingPresetId?: string | null
  builderConfig?: unknown
  lookItems?: Array<{
    id?: string | null
    category?: string | null
    label?: string | null
    brand?: string | null
    description?: string | null
    position?: number | null
    assets?: Array<{
      id?: string | null
      storagePath?: string | null
      mimeType?: string | null
      bytes?: number | null
      viewKey?: string | null
    }>
  }>
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

type BuilderMetadata = {
  mode?: unknown
  shotCount?: unknown
  lookMode?: unknown
  framing?: unknown
  pose?: unknown
  expression?: unknown
  gaze?: unknown
  makeup?: unknown
  skinFinish?: unknown
  hair?: unknown
  userInstruction?: unknown
  resumeStep?: unknown
}

export const miravaSessionBuilderPatchSchema =
  z
    .object({
      setPresetId:
        miravaSetPresetIdSchema
          .nullable()
          .optional(),
      lightingPresetId:
        miravaLightingPresetIdSchema
          .nullable()
          .optional(),
      shotCount:
        miravaSessionPersistedShotCountSchema
          .optional(),
      lookMode:
        z
          .enum(
            MIRAVA_SESSION_LOOK_MODES,
          )
          .optional(),
      framing:
        miravaSessionFramingSchema
          .optional(),
      pose:
        miravaSessionPoseSchema
          .optional(),
      expression:
        miravaSessionExpressionSchema
          .optional(),
      gaze:
        miravaSessionGazeSchema
          .optional(),
      makeup:
        miravaSessionMakeupSchema
          .optional(),
      skinFinish:
        miravaSessionSkinFinishSchema
          .optional(),
      hair:
        miravaSessionHairSchema
          .optional(),
      userInstruction:
        z
          .string()
          .trim()
          .max(
            MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS,
          )
          .optional(),
      resumeStep:
        miravaSessionBuilderResumeStepSchema
          .optional(),
    })
    .strict()
    .refine(
      (value) =>
        Object.values(value).some(
          (item) =>
            item !== undefined,
        ),
      {
        message:
          "At least one session builder field is required.",
      },
    )

export type MiravaSessionBuilderPatch =
  z.infer<
    typeof miravaSessionBuilderPatchSchema
  >

export type MiravaSessionBuilderPublic =
  Readonly<{
    id: string
    identityProfileId: string | null
    config: MiravaSessionBuilderDraft
    lookItemCount: number
    lookItems: ReadonlyArray<{
      id: string
      category:
        MiravaSessionLookCategory
      label: string | null
      brand: string | null
      description: string | null
      position: number
      assets: ReadonlyArray<{
        id: string
        mimeType: string
        bytes: number
        viewKey:
          MiravaSessionLookViewKey
        url: string | null
      }>
    }>
    configurationReady: boolean
    resumeStep?:
      MiravaSessionBuilderResumeStep
    createdAt: string
    updatedAt: string
  }>

export type MiravaSessionBuilderStoreErrorCode =
  | "NOT_FOUND"
  | "CORRUPT_SESSION"
  | "INVALID_PATCH"

export class MiravaSessionBuilderStoreError
  extends Error {
  readonly code:
    MiravaSessionBuilderStoreErrorCode

  constructor(
    code:
      MiravaSessionBuilderStoreErrorCode,
    message: string,
  ) {
    super(message)
    this.name =
      "MiravaSessionBuilderStoreError"
    this.code = code
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function readBuilderMetadata(
  value: unknown,
): BuilderMetadata {
  return isRecord(value)
    ? value
    : {}
}

function normalizeDate(
  value:
    | string
    | Date
    | null
    | undefined,
): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (
    typeof value === "string"
  ) {
    return value
  }

  return ""
}

function readBuilderConfig(
  row:
    StudioSessionBuilderRow,
): MiravaSessionBuilderDraft {
  const defaults =
    createDefaultMiravaSessionBuilderDraft()

  const metadata =
    readBuilderMetadata(
      row.builderConfig,
    )

  const candidate = {
    version:
      row.builderVersion ??
      defaults.version,
    mode:
      metadata.mode ??
      defaults.mode,
    setPresetId:
      row.setPresetId ??
      null,
    lightingPresetId:
      row.lightingPresetId ??
      null,
    shotCount:
      metadata.shotCount ??
      defaults.shotCount,
    lookMode:
      metadata.lookMode ??
      defaults.lookMode,
    framing:
      metadata.framing ??
      defaults.framing,
    pose:
      metadata.pose ??
      defaults.pose,
    expression:
      metadata.expression ??
      defaults.expression,
    gaze:
      metadata.gaze ??
      defaults.gaze,
    makeup:
      metadata.makeup ??
      defaults.makeup,
    skinFinish:
      metadata.skinFinish ??
      defaults.skinFinish,
    hair:
      metadata.hair ??
      defaults.hair,
    userInstruction:
      metadata.userInstruction ??
      defaults.userInstruction,
  }

  const parsed =
    miravaSessionBuilderDraftSchema
      .safeParse(candidate)

  if (!parsed.success) {
    throw new MiravaSessionBuilderStoreError(
      "CORRUPT_SESSION",
      "The stored MIRAVA session builder configuration is invalid.",
    )
  }

  return parsed.data
}

function builderMetadataFromConfig(
  config:
    MiravaSessionBuilderDraft,
  resumeStep?:
    MiravaSessionBuilderResumeStep,
) {
  return {
    mode:
      config.mode,
    shotCount:
      config.shotCount,
    lookMode:
      config.lookMode,
    framing:
      config.framing,
    pose:
      config.pose,
    expression:
      config.expression,
    gaze:
      config.gaze,
    makeup:
      config.makeup,
    skinFinish:
      config.skinFinish,
    hair:
      config.hair,
    userInstruction:
      config.userInstruction,
    ...(resumeStep
      ? {
          resumeStep,
        }
      : {}),
  }
}

async function readPublicLookItems(
  row:
    StudioSessionBuilderRow,
): Promise<
  MiravaSessionBuilderPublic["lookItems"]
> {
  if (
    !Array.isArray(
      row.lookItems,
    )
  ) {
    return []
  }

  return (
    await Promise.all(
      row.lookItems.map(
        async (
          item,
        ) => {
        if (
          typeof item.id !==
            "string" ||
          !MIRAVA_SESSION_LOOK_CATEGORIES.includes(
            item.category as
              MiravaSessionLookCategory,
          ) ||
          typeof item.position !==
            "number" ||
          !Number.isInteger(
            item.position,
          ) ||
          item.position < 0
        ) {
          throw new MiravaSessionBuilderStoreError(
            "CORRUPT_SESSION",
            "The stored MIRAVA session look is invalid.",
          )
        }

        const assets =
          Array.isArray(
            item.assets,
          )
            ? await Promise.all(
                item.assets.map(
                  async (
                    asset,
                  ) => {
                  const viewKey =
                    asset.viewKey ===
                      null ||
                    asset.viewKey ===
                      undefined
                      ? "UNKNOWN"
                      : asset.viewKey

                  if (
                    typeof asset.id !==
                      "string" ||
                    asset.id.length <
                      1 ||
                    typeof asset.mimeType !==
                      "string" ||
                    asset.mimeType.length <
                      1 ||
                    typeof asset.bytes !==
                      "number" ||
                    !Number.isInteger(
                      asset.bytes,
                    ) ||
                    asset.bytes <= 0 ||
                    !MIRAVA_SESSION_LOOK_VIEW_KEYS.includes(
                      viewKey as
                        MiravaSessionLookViewKey,
                    )
                  ) {
                    throw new MiravaSessionBuilderStoreError(
                      "CORRUPT_SESSION",
                      "The stored MIRAVA session look asset is invalid.",
                    )
                  }

                  return {
                    id:
                      asset.id,
                    mimeType:
                      asset.mimeType,
                    bytes:
                      asset.bytes,
                    viewKey:
                      viewKey as
                        MiravaSessionLookViewKey,
                    url:
                      await createMiravaSessionLookPreviewUrl(
                        asset.storagePath,
                      ),
                  }
                },
              ),
              )
            : []

        return {
          id:
            item.id,
          category:
            item.category as
              MiravaSessionLookCategory,
          label:
            item.label ??
            null,
          brand:
            item.brand ??
            null,
          description:
            item.description ??
            null,
          position:
            item.position,
          assets,
        }
        },
      ),
    )
  ).sort(
      (
        left,
        right,
      ) =>
        left.position -
        right.position,
    )
}

async function toPublicSession(
  row:
    StudioSessionBuilderRow,
): Promise<MiravaSessionBuilderPublic> {
  const config =
    readBuilderConfig(row)

  const metadata =
    readBuilderMetadata(
      row.builderConfig,
    )

  const resumeStep =
    miravaSessionBuilderResumeStepSchema
      .safeParse(
        metadata.resumeStep,
      )

  return {
    id:
      row.id,
    identityProfileId:
      row.identityProfileId ??
      null,
    config,
    ...(resumeStep.success
      ? {
          resumeStep:
            resumeStep.data,
        }
      : {}),
    lookItemCount:
      Array.isArray(
        row.lookItems,
      )
        ? row.lookItems.length
        : 0,
    lookItems:
      await readPublicLookItems(
        row,
      ),
    configurationReady:
      isMiravaSessionBuilderReady(
        config,
      ) &&
      (
        config.lookMode ===
          "REFERENCE" ||
        (
          Array.isArray(
            row.lookItems,
          ) &&
          row.lookItems.some(
            (item) =>
              Array.isArray(
                item.assets,
              ) &&
              item.assets.length > 0,
          )
        )
      ),
    createdAt:
      normalizeDate(
        row.createdAt,
      ),
    updatedAt:
      normalizeDate(
        row.updatedAt,
      ),
  }
}

export async function createMiravaSessionBuilderDraft(
  userId: string,
): Promise<MiravaSessionBuilderPublic> {
  const identityProfile =
    await db
      .studioIdentityProfile
      .findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      })

  const config =
    createDefaultMiravaSessionBuilderDraft()

  // A reference-mode session may only reuse an owned, already-persisted
  // artistic reference. This is an identifier, never a client URL or a
  // private storage path.
  const referenceCreation =
    await db.studioCreation.findFirst({
      where: {
        userId,
        status: "DRAFT",
        assets: {
          some: {
            kind: "REFERENCE",
            deletedAt: null,
          },
        },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })

  const row =
    await db.studioSession.create({
      data: {
        userId,
        identityProfileId:
          identityProfile?.id ??
          null,
        referenceCreationId:
          referenceCreation?.id ??
          null,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
        setPresetId:
          null,
        lightingPresetId:
          null,
        builderConfig:
          builderMetadataFromConfig(
            config,
          ),
      },
    })

  return await toPublicSession(
    row,
  )
}

export async function listMiravaSessionBuilderDrafts(
  userId: string,
): Promise<
  MiravaSessionBuilderPublic[]
> {
  const rows =
    await db.studioSession.findMany({
      where: {
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
        creations: {
          none: {},
        },
      },
      orderBy: {
        updatedAt:
          "desc",
      },
      include: {
        lookItems: {
          orderBy: {
            position:
              "asc",
          },
          select: {
            id: true,
            category: true,
            label: true,
            brand: true,
            description: true,
            position: true,
          },
          include: {
            assets: {
              orderBy: {
                createdAt:
                  "asc",
              },
              select: {
                id: true,
                storagePath: true,
                mimeType: true,
                bytes: true,
                viewKey: true,
              },
            },
          },
        },
      },
      take: 20,
    })

  return await Promise.all(
    rows.map(
      (row) =>
        toPublicSession(
          row,
        ),
    ),
  )
}

export async function getMiravaSessionBuilderDraft(
  userId: string,
  sessionId: string,
): Promise<
  MiravaSessionBuilderPublic | null
> {
  const row =
    await db.studioSession.findUnique({
      where: {
        id:
          sessionId,
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
      },
      include: {
        lookItems: {
          orderBy: {
            position:
              "asc",
          },
          select: {
            id: true,
            category: true,
            label: true,
            brand: true,
            description: true,
            position: true,
          },
          include: {
            assets: {
              orderBy: {
                createdAt:
                  "asc",
              },
              select: {
                id: true,
                storagePath: true,
                mimeType: true,
                bytes: true,
                viewKey: true,
              },
            },
          },
        },
      },
    })

  if (!row) {
    return null
  }

  return await toPublicSession(
    row,
  )
}

export async function updateMiravaSessionBuilderDraft(
  userId: string,
  sessionId: string,
  patchInput: unknown,
): Promise<MiravaSessionBuilderPublic> {
  const patch =
    miravaSessionBuilderPatchSchema
      .safeParse(patchInput)

  if (!patch.success) {
    throw new MiravaSessionBuilderStoreError(
      "INVALID_PATCH",
      "The MIRAVA session builder update is invalid.",
    )
  }

  const current =
    await db.studioSession.findUnique({
      where: {
        id:
          sessionId,
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
      },
      include: {
        lookItems: {
          orderBy: {
            position:
              "asc",
          },
          select: {
            id: true,
            category: true,
            label: true,
            brand: true,
            description: true,
            position: true,
          },
          include: {
            assets: {
              orderBy: {
                createdAt:
                  "asc",
              },
              select: {
                id: true,
                storagePath: true,
                mimeType: true,
                bytes: true,
                viewKey: true,
              },
            },
          },
        },
      },
    })

  if (!current) {
    throw new MiravaSessionBuilderStoreError(
      "NOT_FOUND",
      "MIRAVA session not found.",
    )
  }

  const currentConfig =
    readBuilderConfig(current)

  const currentMetadata =
    readBuilderMetadata(
      current.builderConfig,
    )

  const currentResumeStep =
    miravaSessionBuilderResumeStepSchema
      .safeParse(
        currentMetadata.resumeStep,
      )

  const {
    resumeStep:
      requestedResumeStep,
    ...configPatch
  } = patch.data

  const nextConfig =
    miravaSessionBuilderDraftSchema
      .parse({
        ...currentConfig,
        ...configPatch,
      })

  const nextResumeStep =
    requestedResumeStep ??
    (
      currentResumeStep.success
        ? currentResumeStep.data
        : undefined
    )

  const updated =
    await db.studioSession.update({
      where: {
        id:
          sessionId,
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
      },
      data: {
        setPresetId:
          nextConfig.setPresetId,
        lightingPresetId:
          nextConfig
            .lightingPresetId,
        builderConfig:
          builderMetadataFromConfig(
            nextConfig,
            nextResumeStep,
          ),
      },
    })

  return await toPublicSession({
    ...updated,
    lookItems:
      current.lookItems ?? [],
  })
}
