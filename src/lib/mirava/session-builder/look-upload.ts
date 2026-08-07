import {
  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
} from "./look"

export const MIRAVA_LOOK_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type MiravaLookUploadMimeType =
  (typeof MIRAVA_LOOK_UPLOAD_MIME_TYPES)[number]

const MIME_TYPES =
  new Set<string>(
    MIRAVA_LOOK_UPLOAD_MIME_TYPES,
  )

export type MiravaLookUploadFile = {
  mimeType: MiravaLookUploadMimeType
  bytes: number
}

export function isMiravaLookUploadBatchId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
}

export function extensionForMiravaLookMimeType(
  mimeType: MiravaLookUploadMimeType,
): string {
  if (mimeType === "image/png") {
    return "png"
  }

  if (mimeType === "image/webp") {
    return "webp"
  }

  return "jpg"
}

export function parseMiravaLookUploadFiles(
  input: unknown,
  maxBytes: number,
): MiravaLookUploadFile[] | null {
  if (
    !Array.isArray(input) ||
    input.length < 1 ||
    input.length >
      MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
  ) {
    return null
  }

  const files:
    MiravaLookUploadFile[] = []

  for (const item of input) {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item)
    ) {
      return null
    }

    const candidate =
      item as Record<
        string,
        unknown
      >

    const mimeType =
      candidate.mimeType

    const bytes =
      candidate.bytes

    if (
      typeof mimeType !== "string" ||
      !MIME_TYPES.has(mimeType) ||
      typeof bytes !== "number" ||
      !Number.isInteger(bytes) ||
      bytes < 1 ||
      bytes > maxBytes
    ) {
      return null
    }

    files.push({
      mimeType:
        mimeType as
          MiravaLookUploadMimeType,
      bytes,
    })
  }

  return files
}

export function miravaLookStagingPrefix(
  userId: string,
  sessionId: string,
  batchId: string,
): string {
  return (
    `${userId}/session-look-staging/` +
    `${sessionId}/${batchId}/`
  )
}

export function isMiravaLookStagedPathForBatch(
  path: unknown,
  {
    userId,
    sessionId,
    batchId,
  }: {
    userId: string
    sessionId: string
    batchId: string
  },
): path is string {
  if (
    typeof path !== "string" ||
    path.includes("..")
  ) {
    return false
  }

  const prefix =
    miravaLookStagingPrefix(
      userId,
      sessionId,
      batchId,
    )

  if (
    !path.startsWith(prefix)
  ) {
    return false
  }

  const filename =
    path.slice(prefix.length)

  return (
    filename.length > 0 &&
    !filename.includes("/")
  )
}
