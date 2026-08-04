import { randomUUID } from "crypto"
import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  MAX_IDENTITY_ASSETS,
  MAX_STUDIO_IMAGE_BYTES,
  MIN_IDENTITY_ASSETS,
  STUDIO_BUCKET,
} from "@/lib/visual-engine/core"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
} from "@/lib/visual-engine/http"

const ALLOWED_IDENTITY_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ])

function extensionForMimeType(
  mimeType: string,
): string {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  return "jpg"
}

function validBatchId(
  batchId: unknown,
): batchId is string {
  return (
    typeof batchId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      batchId,
    )
  )
}

export async function POST(
  request: NextRequest,
) {
  const session = await verifySession()

  if (!session) {
    return apiError("Unauthorized", 401)
  }

  const limit = await checkRateLimit(
    "studioUpload",
    `${session.userId}:${
      request.headers.get("x-forwarded-for") ??
      "local"
    }`,
  )

  if (!limit.success) {
    return apiError(
      "Trop d’envois MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  const body = await request
    .json()
    .catch(() => null) as
      | {
          files?: Array<{
            mimeType?: unknown
            bytes?: unknown
          }>
        }
      | null

  const files = body?.files

  if (
    !Array.isArray(files) ||
    files.length < MIN_IDENTITY_ASSETS ||
    files.length > MAX_IDENTITY_ASSETS
  ) {
    return apiError(
      "Entre trois et dix photos sont requises.",
      400,
    )
  }

  const normalizedFiles: Array<{
    mimeType: string
    bytes: number
  }> = []

  for (const file of files) {
    const mimeType =
      typeof file.mimeType === "string"
        ? file.mimeType
        : ""

    const bytes =
      typeof file.bytes === "number"
        ? file.bytes
        : Number.NaN

    if (
      !ALLOWED_IDENTITY_MIME_TYPES.has(
        mimeType,
      ) ||
      !Number.isInteger(bytes) ||
      bytes < 1 ||
      bytes > MAX_STUDIO_IMAGE_BYTES
    ) {
      return apiError(
        "Une photo préparée est invalide ou trop volumineuse.",
        400,
      )
    }

    normalizedFiles.push({
      mimeType,
      bytes,
    })
  }

  const batchId = randomUUID()
  const uploads: Array<{
    path: string
    token: string
    mimeType: string
    bytes: number
  }> = []

  for (const file of normalizedFiles) {
    const path =
      `${session.userId}/identity-staging/` +
      `${batchId}/${randomUUID()}.` +
      extensionForMimeType(file.mimeType)

    const { data, error } =
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .createSignedUploadUrl(path, {
          upsert: false,
        })

    if (error || !data?.token) {
      return apiError(
        "Le stockage privé MIRAVA n’est pas disponible.",
        503,
      )
    }

    uploads.push({
      path,
      token: data.token,
      mimeType: file.mimeType,
      bytes: file.bytes,
    })
  }

  return apiSuccess({
    batchId,
    bucket: STUDIO_BUCKET,
    uploads,
  })
}

export async function DELETE(
  request: NextRequest,
) {
  const session = await verifySession()

  if (!session) {
    return apiError("Unauthorized", 401)
  }

  const body = await request
    .json()
    .catch(() => null) as
      | {
          batchId?: unknown
          paths?: unknown
        }
      | null

  if (
    !validBatchId(body?.batchId) ||
    !Array.isArray(body?.paths)
  ) {
    return apiError(
      "Session d’envoi invalide.",
      400,
    )
  }

  const prefix =
    `${session.userId}/identity-staging/` +
    `${body.batchId}/`

  const paths = body.paths.filter(
    (path): path is string =>
      typeof path === "string" &&
      path.startsWith(prefix) &&
      !path.includes(".."),
  )

  if (paths.length > 0) {
    await supabaseAdmin.storage
      .from(STUDIO_BUCKET)
      .remove(paths)
  }

  return apiSuccess({
    aborted: true,
  })
}
