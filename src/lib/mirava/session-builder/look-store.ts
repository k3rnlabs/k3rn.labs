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
  MIRAVA_SESSION_LOOK_MAX_ITEMS,
  miravaSessionLookItemCreateSchema,
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
  | "INVALID_INPUT"
  | "INVALID_UPLOAD_BATCH"
  | "INVALID_STORAGE_PATH"
  | "STAGED_OBJECT_MISSING"
  | "STAGED_OBJECT_MISMATCH"
  | "STORAGE_MOVE_FAILED"
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
