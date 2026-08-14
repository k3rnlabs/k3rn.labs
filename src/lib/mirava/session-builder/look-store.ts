import {
  randomUUID,
} from "crypto"

import {
  db,
} from "@/lib/db"
import {
  supabaseAdmin,
} from "@/lib/supabase-admin"
import {
  MAX_STUDIO_IMAGE_BYTES,
  STUDIO_BUCKET,
} from "@/lib/visual-engine/core"

import {
  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
  MIRAVA_SESSION_LOOK_MAX_ITEMS,
  miravaSessionLookItemCreateSchema,
  miravaSessionLookUploadedAssetSchema,
  type MiravaSessionLookItemCreate,
} from "./look"
import {
  extensionForMiravaLookMimeType,
  isMiravaLookStagedPathForBatch,
  isMiravaLookUploadBatchId,
  type MiravaLookUploadMimeType,
} from "./look-upload"
import {
  MIRAVA_SESSION_BUILDER_VERSION,
} from "./schema"

export type MiravaSessionLookStoreErrorCode =
  | "NOT_FOUND"
  | "CUSTOM_LOOK_REQUIRED"
  | "LOOK_LIMIT_REACHED"
  | "ASSET_LIMIT_REACHED"
  | "INVALID_INPUT"
  | "INVALID_UPLOAD_BATCH"
  | "INVALID_STORAGE_PATH"
  | "STAGED_OBJECT_MISSING"
  | "STAGED_OBJECT_MISMATCH"
  | "STORAGE_MOVE_FAILED"
  | "STORAGE_DELETE_FAILED"
  | "SESSION_ALREADY_LAUNCHED"
  | "ITEM_NOT_FOUND"
  | "ASSET_NOT_FOUND"
  | "ASSET_CONFLICT"
  | "LAST_ASSET_REQUIRED"
  | "FINALIZE_FAILED"

export class MiravaSessionLookStoreError
  extends Error {
  readonly code:
    MiravaSessionLookStoreErrorCode

  constructor(
    code:
      MiravaSessionLookStoreErrorCode,
    message: string,
  ) {
    super(message)
    this.name =
      "MiravaSessionLookStoreError"
    this.code = code
  }
}

export type MiravaSessionLookItemPublic =
  Readonly<{
    id: string
    category:
      MiravaSessionLookItemCreate["category"]
    label: string | null
    brand: string | null
    description: string | null
    position: number
    assets: ReadonlyArray<{
      mimeType: string
      bytes: number
      viewKey: string
    }>
  }>

type StoredObjectMetadata =
  Record<string, unknown>

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function readStoredBytes(
  metadata: StoredObjectMetadata,
): number | null {
  const candidates = [
    metadata.size,
    metadata.contentLength,
    metadata.content_length,
  ]

  for (const value of candidates) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value
    }

    if (
      typeof value === "string" &&
      /^\d+$/.test(value)
    ) {
      return Number(value)
    }
  }

  return null
}

function readStoredMimeType(
  metadata: StoredObjectMetadata,
): string | null {
  const candidates = [
    metadata.mimetype,
    metadata.mimeType,
    metadata.contentType,
    metadata.content_type,
  ]

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.length > 0
    ) {
      return value
    }
  }

  return null
}

function splitStoragePath(
  path: string,
): {
  directory: string
  filename: string
} {
  const slash =
    path.lastIndexOf("/")

  if (
    slash <= 0 ||
    slash === path.length - 1
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_STORAGE_PATH",
      "Invalid MIRAVA look storage path.",
    )
  }

  return {
    directory:
      path.slice(0, slash),
    filename:
      path.slice(slash + 1),
  }
}

function durableLookPrefix(
  userId: string,
  sessionId: string,
  lookItemId: string,
): string {
  return (
    `${userId}/session-look/` +
    `${sessionId}/${lookItemId}/`
  )
}

async function assertStoredUpload(
  upload:
    MiravaSessionLookItemCreate["uploads"][number],
) {
  const {
    directory,
    filename,
  } =
    splitStoragePath(
      upload.path,
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from(STUDIO_BUCKET)
      .list(
        directory,
        {
          limit: 100,
          search:
            filename,
        },
      )

  if (error) {
    throw new MiravaSessionLookStoreError(
      "STAGED_OBJECT_MISSING",
      "MIRAVA could not inspect the staged look image.",
    )
  }

  const object =
    data?.find(
      (
        candidate: {
          name: string
          metadata?: unknown
        },
      ) =>
        candidate.name ===
        filename,
    )

  if (!object) {
    throw new MiravaSessionLookStoreError(
      "STAGED_OBJECT_MISSING",
      "A staged MIRAVA look image is missing.",
    )
  }

  const metadata =
    isRecord(
      object.metadata,
    )
      ? object.metadata
      : {}

  const storedBytes =
    readStoredBytes(
      metadata,
    )

  const storedMimeType =
    readStoredMimeType(
      metadata,
    )

  if (
    storedBytes === null ||
    storedMimeType === null ||
    storedBytes !==
      upload.bytes ||
    storedMimeType !==
      upload.mimeType
  ) {
    throw new MiravaSessionLookStoreError(
      "STAGED_OBJECT_MISMATCH",
      "A staged MIRAVA look image does not match its upload receipt.",
    )
  }
}

async function removeStoragePaths(
  paths: string[],
): Promise<void> {
  if (paths.length < 1) {
    return
  }

  await supabaseAdmin
    .storage
    .from(STUDIO_BUCKET)
    .remove(
      Array.from(
        new Set(paths),
      ),
    )
    .catch(() => undefined)
}

async function assertMutableCustomLookSession({
  userId,
  sessionId,
}: {
  userId: string
  sessionId: string
}): Promise<void> {
  const session =
    await db.studioSession
      .findUnique({
        where: {
          id:
            sessionId,
          userId,
          builderVersion:
            MIRAVA_SESSION_BUILDER_VERSION,
        },
        select: {
          id: true,
          builderConfig: true,
        },
      })

  if (!session) {
    throw new MiravaSessionLookStoreError(
      "NOT_FOUND",
      "MIRAVA session not found.",
    )
  }

  const builderConfig =
    isRecord(
      session.builderConfig,
    )
      ? session.builderConfig
      : {}

  if (
    builderConfig.lookMode !==
    "CUSTOM"
  ) {
    throw new MiravaSessionLookStoreError(
      "CUSTOM_LOOK_REQUIRED",
      "The MIRAVA session is not using a custom look.",
    )
  }

  const existingCreation =
    await db.studioCreation
      .findFirst({
        where: {
          sessionId,
        },
        select: {
          id: true,
        },
      })

  if (existingCreation) {
    throw new MiravaSessionLookStoreError(
      "SESSION_ALREADY_LAUNCHED",
      "A launched MIRAVA session look can no longer be modified.",
    )
  }
}

async function removeStoragePathsStrict(
  paths: string[],
): Promise<void> {
  const uniquePaths =
    Array.from(
      new Set(
        paths.filter(
          (path) =>
            typeof path ===
              "string" &&
            path.length > 0,
        ),
      ),
    )

  if (
    uniquePaths.length < 1
  ) {
    return
  }

  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        STUDIO_BUCKET,
      )
      .remove(
        uniquePaths,
      )

  if (error) {
    throw new MiravaSessionLookStoreError(
      "STORAGE_DELETE_FAILED",
      "MIRAVA could not delete a private look image.",
    )
  }
}

export async function updateMiravaSessionLookItem({
  userId,
  sessionId,
  lookItemId,
  input,
}: {
  userId: string
  sessionId: string
  lookItemId: string
  input: unknown
}): Promise<void> {
  const {
    miravaSessionLookItemUpdateSchema,
  } =
    await import(
      "./look-mutations"
    )

  const parsed =
    miravaSessionLookItemUpdateSchema
      .safeParse(
        input,
      )

  if (!parsed.success) {
    throw new MiravaSessionLookStoreError(
      "INVALID_INPUT",
      "Invalid MIRAVA look item update.",
    )
  }

  await assertMutableCustomLookSession({
    userId,
    sessionId,
  })

  const existingItem =
    await db
      .studioSessionLookItem
      .findUnique({
        where: {
          id:
            lookItemId,
          sessionId,
        },
        select: {
          id: true,
        },
      })

  if (!existingItem) {
    throw new MiravaSessionLookStoreError(
      "ITEM_NOT_FOUND",
      "MIRAVA look item not found.",
    )
  }

  const data:
    Record<string, unknown> =
      {}

  if (
    "category" in
      parsed.data
  ) {
    data.category =
      parsed.data.category
  }

  if (
    "label" in
      parsed.data
  ) {
    data.label =
      parsed.data.label
  }

  if (
    "brand" in
      parsed.data
  ) {
    data.brand =
      parsed.data.brand
  }

  if (
    "description" in
      parsed.data
  ) {
    data.description =
      parsed.data.description
  }

  await db
    .studioSessionLookItem
    .update({
      where: {
        id:
          lookItemId,
        sessionId,
      },
      data,
    })

  await db.studioSession
    .update({
      where: {
        id:
          sessionId,
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
      },
      data: {},
    })
}

export async function deleteMiravaSessionLookItem({
  userId,
  sessionId,
  lookItemId,
}: {
  userId: string
  sessionId: string
  lookItemId: string
}): Promise<void> {
  await assertMutableCustomLookSession({
    userId,
    sessionId,
  })

  const existingItem =
    await db
      .studioSessionLookItem
      .findUnique({
        where: {
          id:
            lookItemId,
          sessionId,
        },
        include: {
          assets: {
            select: {
              storagePath:
                true,
            },
          },
        },
      })

  if (!existingItem) {
    throw new MiravaSessionLookStoreError(
      "ITEM_NOT_FOUND",
      "MIRAVA look item not found.",
    )
  }

  const storagePaths =
    Array.isArray(
      existingItem.assets,
    )
      ? existingItem.assets
          .map(
            (
              asset: {
                storagePath?:
                  unknown
              },
            ) =>
              typeof asset.storagePath ===
                "string"
                ? asset.storagePath
                : null,
          )
          .filter(
            (
              value: string | null,
            ): value is string =>
              value !== null,
          )
      : []

  await removeStoragePathsStrict(
    storagePaths,
  )

  await db
    .studioSessionLookItem
    .delete({
      where: {
        id:
          lookItemId,
        sessionId,
      },
    })

  const remainingItems =
    await db
      .studioSessionLookItem
      .findMany({
        where: {
          sessionId,
        },
        orderBy: {
          position:
            "asc",
        },
      })

  for (
    let index = 0;
    index <
      remainingItems.length;
    index += 1
  ) {
    const item =
      remainingItems[
        index
      ]

    if (
      item.position ===
      index
    ) {
      continue
    }

    await db
      .studioSessionLookItem
      .update({
        where: {
          id:
            item.id,
          sessionId,
        },
        data: {
          position:
            index,
        },
      })
  }

  await db.studioSession
    .update({
      where: {
        id:
          sessionId,
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
      },
      data: {},
    })
}


export async function deleteMiravaSessionLookAsset({
  userId,
  sessionId,
  lookItemId,
  assetId,
}: {
  userId: string
  sessionId: string
  lookItemId: string
  assetId: string
}): Promise<void> {
  await assertMutableCustomLookSession({
    userId,
    sessionId,
  })

  const item =
    await db
      .studioSessionLookItem
      .findUnique({
        where: {
          id:
            lookItemId,
          sessionId,
        },
        include: {
          assets: {
            select: {
              id: true,
              storagePath: true,
            },
          },
        },
      })

  if (!item) {
    throw new MiravaSessionLookStoreError(
      "ITEM_NOT_FOUND",
      "MIRAVA look item not found.",
    )
  }

  const assets =
    Array.isArray(
      item.assets,
    )
      ? item.assets
      : []

  const asset =
    assets.find(
      (
        candidate: {
          id: string
          storagePath: string
        },
      ) =>
        candidate.id ===
        assetId,
    )

  if (!asset) {
    throw new MiravaSessionLookStoreError(
      "ASSET_NOT_FOUND",
      "MIRAVA look asset not found.",
    )
  }

  if (
    assets.length <=
    1
  ) {
    throw new MiravaSessionLookStoreError(
      "LAST_ASSET_REQUIRED",
      "A MIRAVA look item must keep at least one image.",
    )
  }

  await removeStoragePathsStrict([
    asset.storagePath,
  ])

  await db
    .studioSessionLookAsset
    .delete({
      where: {
        id:
          assetId,
      },
    })

  await db
    .studioSession
    .update({
      where: {
        id:
          sessionId,
        userId,
        builderVersion:
          MIRAVA_SESSION_BUILDER_VERSION,
      },
      data: {},
    })
}

export async function replaceMiravaSessionLookAsset({
  userId,
  sessionId,
  lookItemId,
  assetId,
  batchId,
  input,
}: {
  userId: string
  sessionId: string
  lookItemId: string
  assetId: string
  batchId: unknown
  input: unknown
}): Promise<void> {
  await assertMutableCustomLookSession({
    userId,
    sessionId,
  })

  if (
    !isMiravaLookUploadBatchId(
      batchId,
    )
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_UPLOAD_BATCH",
      "Invalid MIRAVA look upload batch.",
    )
  }

  const parsed =
    miravaSessionLookUploadedAssetSchema
      .safeParse(
        input,
      )

  if (
    !parsed.success ||
    parsed.data.bytes >
      MAX_STUDIO_IMAGE_BYTES
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_INPUT",
      "Invalid MIRAVA replacement look asset.",
    )
  }

  const item =
    await db
      .studioSessionLookItem
      .findUnique({
        where: {
          id:
            lookItemId,
          sessionId,
        },
        include: {
          assets: {
            select: {
              id: true,
              storagePath: true,
              mimeType: true,
              bytes: true,
              viewKey: true,
            },
          },
        },
      })

  if (!item) {
    throw new MiravaSessionLookStoreError(
      "ITEM_NOT_FOUND",
      "MIRAVA look item not found.",
    )
  }

  const assets =
    Array.isArray(
      item.assets,
    )
      ? item.assets
      : []

  const existingAsset =
    assets.find(
      (
        candidate: {
          id: string
          storagePath: string
          mimeType: string
          bytes: number
          viewKey:
            | string
            | null
        },
      ) =>
        candidate.id ===
        assetId,
    )

  if (!existingAsset) {
    throw new MiravaSessionLookStoreError(
      "ASSET_NOT_FOUND",
      "MIRAVA look asset not found.",
    )
  }

  const upload =
    parsed.data

  if (
    !isMiravaLookStagedPathForBatch(
      upload.path,
      {
        userId,
        sessionId,
        batchId,
      },
    )
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_STORAGE_PATH",
      "The MIRAVA replacement upload does not belong to this session.",
    )
  }

  await assertStoredUpload(
    upload,
  )

  const destination =
    `${durableLookPrefix(
      userId,
      sessionId,
      lookItemId,
    )}${randomUUID()}.` +
    extensionForMiravaLookMimeType(
      upload.mimeType as
        MiravaLookUploadMimeType,
    )

  const {
    error:
      moveError,
  } =
    await supabaseAdmin
      .storage
      .from(
        STUDIO_BUCKET,
      )
      .move(
        upload.path,
        destination,
      )

  if (moveError) {
    throw new MiravaSessionLookStoreError(
      "STORAGE_MOVE_FAILED",
      "MIRAVA could not finalize the replacement look image.",
    )
  }

  try {
    await db.$transaction(
      async (
        tx:
          typeof db,
      ) => {
        const currentAsset =
          await tx
            .studioSessionLookAsset
            .findUnique({
              where: {
                id:
                  assetId,
                lookItemId,
              },
              select: {
                id: true,
                storagePath: true,
              },
            })

        if (!currentAsset) {
          throw new MiravaSessionLookStoreError(
            "ASSET_NOT_FOUND",
            "MIRAVA look asset not found.",
          )
        }

        if (
          currentAsset.storagePath !==
          existingAsset.storagePath
        ) {
          throw new MiravaSessionLookStoreError(
            "ASSET_CONFLICT",
            "The MIRAVA look asset changed during replacement.",
          )
        }

        await tx
          .studioSessionLookAsset
          .update({
            where: {
              id:
                assetId,
            },
            data: {
              storagePath:
                destination,
              mimeType:
                upload.mimeType,
              bytes:
                upload.bytes,
              viewKey:
                upload.viewKey,
            },
          })

        await tx
          .studioSession
          .update({
            where: {
              id:
                sessionId,
              userId,
              builderVersion:
                MIRAVA_SESSION_BUILDER_VERSION,
            },
            data: {},
          })
      },
    )
  } catch (error) {
    await removeStoragePaths([
      upload.path,
      destination,
    ])

    if (
      error instanceof
        MiravaSessionLookStoreError
    ) {
      throw error
    }

    throw new MiravaSessionLookStoreError(
      "FINALIZE_FAILED",
      "MIRAVA could not persist the replacement look image.",
    )
  }

  await removeStoragePaths([
    existingAsset.storagePath,
  ])
}

export async function addMiravaSessionLookAssets({
  userId,
  sessionId,
  lookItemId,
  batchId,
  input,
}: {
  userId: string
  sessionId: string
  lookItemId: string
  batchId: unknown
  input: unknown
}): Promise<void> {
  await assertMutableCustomLookSession({
    userId,
    sessionId,
  })

  if (
    !isMiravaLookUploadBatchId(
      batchId,
    )
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_UPLOAD_BATCH",
      "Invalid MIRAVA look upload batch.",
    )
  }

  const parsed =
    miravaSessionLookUploadedAssetSchema
      .array()
      .min(1)
      .max(
        MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
      )
      .safeParse(
        input,
      )

  if (
    !parsed.success ||
    parsed.data.some(
      (upload) =>
        upload.bytes >
        MAX_STUDIO_IMAGE_BYTES,
    )
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_INPUT",
      "Invalid MIRAVA look asset upload.",
    )
  }

  const item =
    await db
      .studioSessionLookItem
      .findUnique({
        where: {
          id:
            lookItemId,
          sessionId,
        },
        include: {
          assets: {
            select: {
              id: true,
            },
          },
        },
      })

  if (!item) {
    throw new MiravaSessionLookStoreError(
      "ITEM_NOT_FOUND",
      "MIRAVA look item not found.",
    )
  }

  const existingAssetCount =
    Array.isArray(
      item.assets,
    )
      ? item.assets.length
      : 0

  if (
    existingAssetCount +
      parsed.data.length >
    MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
  ) {
    throw new MiravaSessionLookStoreError(
      "ASSET_LIMIT_REACHED",
      "The MIRAVA look item image limit has been reached.",
    )
  }

  const uploads =
    parsed.data

  const uploadPaths =
    uploads.map(
      (upload) =>
        upload.path,
    )

  if (
    new Set(
      uploadPaths,
    ).size !==
    uploadPaths.length
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_STORAGE_PATH",
      "Duplicate MIRAVA look upload path.",
    )
  }

  for (
    const upload
    of uploads
  ) {
    if (
      !isMiravaLookStagedPathForBatch(
        upload.path,
        {
          userId,
          sessionId,
          batchId,
        },
      )
    ) {
      throw new MiravaSessionLookStoreError(
        "INVALID_STORAGE_PATH",
        "A MIRAVA look upload path does not belong to this session.",
      )
    }

    await assertStoredUpload(
      upload,
    )
  }

  const durablePrefix =
    durableLookPrefix(
      userId,
      sessionId,
      lookItemId,
    )

  const moves =
    uploads.map(
      (upload) => ({
        source:
          upload.path,
        destination:
          `${durablePrefix}${randomUUID()}.` +
          extensionForMiravaLookMimeType(
            upload.mimeType as
              MiravaLookUploadMimeType,
          ),
        upload,
      }),
    )

  const movedDestinations:
    string[] = []

  try {
    for (
      const move
      of moves
    ) {
      const {
        error,
      } =
        await supabaseAdmin
          .storage
          .from(
            STUDIO_BUCKET,
          )
          .move(
            move.source,
            move.destination,
          )

      if (error) {
        throw new MiravaSessionLookStoreError(
          "STORAGE_MOVE_FAILED",
          "MIRAVA could not finalize a look image.",
        )
      }

      movedDestinations.push(
        move.destination,
      )
    }

    await db
      .studioSessionLookAsset
      .createMany({
        data:
          moves.map(
            (move) => ({
              lookItemId,
              storagePath:
                move.destination,
              mimeType:
                move.upload
                  .mimeType,
              bytes:
                move.upload
                  .bytes,
              viewKey:
                move.upload
                  .viewKey,
            }),
          ),
      })

    await db
      .studioSession
      .update({
        where: {
          id:
            sessionId,
          userId,
          builderVersion:
            MIRAVA_SESSION_BUILDER_VERSION,
        },
        data: {},
      })
  } catch (error) {
    await removeStoragePaths([
      ...uploadPaths,
      ...movedDestinations,
    ])

    if (
      error instanceof
      MiravaSessionLookStoreError
    ) {
      throw error
    }

    throw new MiravaSessionLookStoreError(
      "FINALIZE_FAILED",
      "MIRAVA could not persist the additional look image.",
    )
  }
}

export async function finalizeMiravaSessionLookItem({
  userId,
  sessionId,
  batchId,
  input,
}: {
  userId: string
  sessionId: string
  batchId: unknown
  input: unknown
}): Promise<MiravaSessionLookItemPublic> {
  if (
    !isMiravaLookUploadBatchId(
      batchId,
    )
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_UPLOAD_BATCH",
      "Invalid MIRAVA look upload batch.",
    )
  }

  const parsed =
    miravaSessionLookItemCreateSchema
      .safeParse(input)

  if (
    !parsed.success ||
    parsed.data.uploads.some(
      (upload) =>
        upload.bytes >
        MAX_STUDIO_IMAGE_BYTES,
    )
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_INPUT",
      "Invalid MIRAVA look item.",
    )
  }

  const lookItem =
    parsed.data

  const session =
    await db.studioSession
      .findUnique({
        where: {
          id:
            sessionId,
          userId,
          builderVersion:
            MIRAVA_SESSION_BUILDER_VERSION,
        },
        select: {
          id: true,
          builderConfig: true,
        },
      })

  if (!session) {
    throw new MiravaSessionLookStoreError(
      "NOT_FOUND",
      "MIRAVA session not found.",
    )
  }

  const builderConfig =
    isRecord(
      session.builderConfig,
    )
      ? session.builderConfig
      : {}

  if (
    builderConfig.lookMode !==
    "CUSTOM"
  ) {
    throw new MiravaSessionLookStoreError(
      "CUSTOM_LOOK_REQUIRED",
      "The MIRAVA session is not using a custom look.",
    )
  }

  const existingItems =
    await db
      .studioSessionLookItem
      .findMany({
        where: {
          sessionId,
        },
        orderBy: {
          position:
            "asc",
        },
        take:
          MIRAVA_SESSION_LOOK_MAX_ITEMS,
      })

  if (
    existingItems.length >=
    MIRAVA_SESSION_LOOK_MAX_ITEMS
  ) {
    throw new MiravaSessionLookStoreError(
      "LOOK_LIMIT_REACHED",
      "The MIRAVA session look item limit has been reached.",
    )
  }

  const uploadPaths =
    lookItem.uploads.map(
      (upload) =>
        upload.path,
    )

  if (
    new Set(
      uploadPaths,
    ).size !==
    uploadPaths.length
  ) {
    throw new MiravaSessionLookStoreError(
      "INVALID_STORAGE_PATH",
      "Duplicate MIRAVA look upload path.",
    )
  }

  for (
    const upload
    of lookItem.uploads
  ) {
    if (
      !isMiravaLookStagedPathForBatch(
        upload.path,
        {
          userId,
          sessionId,
          batchId,
        },
      )
    ) {
      throw new MiravaSessionLookStoreError(
        "INVALID_STORAGE_PATH",
        "A MIRAVA look upload path does not belong to this session.",
      )
    }

    await assertStoredUpload(
      upload,
    )
  }

  const lookItemId =
    randomUUID()

  const durablePrefix =
    durableLookPrefix(
      userId,
      sessionId,
      lookItemId,
    )

  const moves =
    lookItem.uploads.map(
      (upload) => ({
        source:
          upload.path,
        destination:
          `${durablePrefix}${randomUUID()}.` +
          extensionForMiravaLookMimeType(
            upload.mimeType as
              MiravaLookUploadMimeType,
          ),
        upload,
      }),
    )

  const movedDestinations:
    string[] = []

  let itemCreated =
    false

  try {
    for (const move of moves) {
      const {
        error,
      } =
        await supabaseAdmin
          .storage
          .from(
            STUDIO_BUCKET,
          )
          .move(
            move.source,
            move.destination,
          )

      if (error) {
        throw new MiravaSessionLookStoreError(
          "STORAGE_MOVE_FAILED",
          "MIRAVA could not finalize a look image.",
        )
      }

      movedDestinations.push(
        move.destination,
      )
    }

    await db
      .studioSessionLookItem
      .create({
        data: {
          id:
            lookItemId,
          sessionId,
          category:
            lookItem.category,
          label:
            lookItem.label ??
            null,
          brand:
            lookItem.brand ??
            null,
          description:
            lookItem.description ??
            null,
          position:
            existingItems.length,
        },
      })

    itemCreated = true

    await db
      .studioSessionLookAsset
      .createMany({
        data:
          moves.map(
            (move) => ({
              lookItemId,
              storagePath:
                move.destination,
              mimeType:
                move.upload
                  .mimeType,
              bytes:
                move.upload
                  .bytes,
              viewKey:
                move.upload
                  .viewKey,
            }),
          ),
      })

    await db
      .studioSession
      .update({
        where: {
          id:
            sessionId,
          userId,
          builderVersion:
            MIRAVA_SESSION_BUILDER_VERSION,
        },
        data: {},
      })

    return {
      id:
        lookItemId,
      category:
        lookItem.category,
      label:
        lookItem.label ??
        null,
      brand:
        lookItem.brand ??
        null,
      description:
        lookItem.description ??
        null,
      position:
        existingItems.length,
      assets:
        moves.map(
          (move) => ({
            mimeType:
              move.upload
                .mimeType,
            bytes:
              move.upload
                .bytes,
            viewKey:
              move.upload
                .viewKey,
          }),
        ),
    }
  } catch (error) {
    if (itemCreated) {
      await db
        .studioSessionLookItem
        .delete({
          where: {
            id:
              lookItemId,
            sessionId,
          },
        })
        .catch(
          () => undefined,
        )
    }

    await removeStoragePaths([
      ...uploadPaths,
      ...movedDestinations,
    ])

    if (
      error instanceof
      MiravaSessionLookStoreError
    ) {
      throw error
    }

    throw new MiravaSessionLookStoreError(
      "FINALIZE_FAILED",
      "MIRAVA could not persist the custom look.",
    )
  }
}
