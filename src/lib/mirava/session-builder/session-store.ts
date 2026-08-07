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
  }>
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

type BuilderMetadata = {
  mode?: unknown
  shotCount?: unknown
  lookMode?: unknown
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
      lookMode:
        z
          .enum(
            MIRAVA_SESSION_LOOK_MODES,
          )
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
    configurationReady: boolean
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
) {
  return {
    mode:
      config.mode,
    shotCount:
      config.shotCount,
    lookMode:
      config.lookMode,
  }
}

function toPublicSession(
  row:
    StudioSessionBuilderRow,
): MiravaSessionBuilderPublic {
  const config =
    readBuilderConfig(row)

  return {
    id:
      row.id,
    identityProfileId:
      row.identityProfileId ??
      null,
    config,
    lookItemCount:
      Array.isArray(
        row.lookItems,
      )
        ? row.lookItems.length
        : 0,
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
          row.lookItems.length > 0
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

  const row =
    await db.studioSession.create({
      data: {
        userId,
        identityProfileId:
          identityProfile?.id ??
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

  return toPublicSession(row)
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
      },
      orderBy: {
        updatedAt:
          "desc",
      },
      include: {
        lookItems: {
          select: {
            id: true,
          },
        },
      },
      take: 20,
    })

  return rows.map(
    (row) =>
      toPublicSession(row),
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
          select: {
            id: true,
          },
        },
      },
    })

  if (!row) {
    return null
  }

  return toPublicSession(row)
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
          select: {
            id: true,
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

  const nextConfig =
    miravaSessionBuilderDraftSchema
      .parse({
        ...currentConfig,
        ...patch.data,
      })

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
          ),
      },
    })

  return toPublicSession({
    ...updated,
    lookItems:
      current.lookItems ?? [],
  })
}
