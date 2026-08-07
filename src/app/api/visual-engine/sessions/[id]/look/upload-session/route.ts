import {
  randomUUID,
} from "crypto"
import {
  NextRequest,
} from "next/server"

import {
  verifySession,
} from "@/lib/auth"
import {
  db,
} from "@/lib/db"
import {
  extensionForMiravaLookMimeType,
  isMiravaLookStagedPathForBatch,
  isMiravaLookUploadBatchId,
  miravaLookStagingPrefix,
  parseMiravaLookUploadFiles,
} from "@/lib/mirava/session-builder/look-upload"
import {
  MIRAVA_SESSION_BUILDER_VERSION,
} from "@/lib/mirava/session-builder/schema"
import {
  isMiravaPublicLaunchEnabled,
} from "@/lib/mirava/server-config"
import {
  checkRateLimit,
} from "@/lib/rate-limit"
import {
  supabaseAdmin,
} from "@/lib/supabase-admin"
import {
  MAX_STUDIO_IMAGE_BYTES,
  STUDIO_BUCKET,
} from "@/lib/visual-engine/core"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
} from "@/lib/visual-engine/http"

type RouteContext = {
  params: {
    id: string
  }
}

async function ownedBuilderSession(
  userId: string,
  sessionId: string,
) {
  return db.studioSession
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
      },
    })
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: RouteContext,
) {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  if (
    !isMiravaPublicLaunchEnabled()
  ) {
    return apiError(
      "MIRAVA Studio est actuellement en accès privé.",
      503,
    )
  }

  const limit =
    await checkRateLimit(
      "studioUpload",
      `${session.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      "Trop d’envois MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  const builderSession =
    await ownedBuilderSession(
      session.userId,
      params.id,
    )

  if (!builderSession) {
    return apiError(
      "Séance MIRAVA introuvable.",
      404,
    )
  }

  const body =
    await request
      .json()
      .catch(() => null) as
        | {
            files?: unknown
          }
        | null

  const files =
    parseMiravaLookUploadFiles(
      body?.files,
      MAX_STUDIO_IMAGE_BYTES,
    )

  if (!files) {
    return apiError(
      "Ajoutez entre une et six images JPEG, PNG ou WebP valides.",
      400,
    )
  }

  const batchId =
    randomUUID()

  const prefix =
    miravaLookStagingPrefix(
      session.userId,
      params.id,
      batchId,
    )

  const uploads: Array<{
    path: string
    token: string
    mimeType: string
    bytes: number
  }> = []

  for (const file of files) {
    const path =
      `${prefix}${randomUUID()}.` +
      extensionForMiravaLookMimeType(
        file.mimeType,
      )

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .storage
        .from(STUDIO_BUCKET)
        .createSignedUploadUrl(
          path,
          {
            upsert: false,
          },
        )

    if (
      error ||
      !data?.token
    ) {
      return apiError(
        "Le stockage privé MIRAVA n’est pas disponible.",
        503,
      )
    }

    uploads.push({
      path,
      token:
        data.token,
      mimeType:
        file.mimeType,
      bytes:
        file.bytes,
    })
  }

  return apiSuccess({
    batchId,
    bucket:
      STUDIO_BUCKET,
    uploads,
  })
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: RouteContext,
) {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  const builderSession =
    await ownedBuilderSession(
      session.userId,
      params.id,
    )

  if (!builderSession) {
    return apiError(
      "Séance MIRAVA introuvable.",
      404,
    )
  }

  const body =
    await request
      .json()
      .catch(() => null) as
        | {
            batchId?: unknown
            paths?: unknown
          }
        | null

  const batchId =
    body?.batchId

  const requestedPaths =
    body?.paths

  if (
    !isMiravaLookUploadBatchId(
      batchId,
    ) ||
    !Array.isArray(
      requestedPaths,
    )
  ) {
    return apiError(
      "Session d’envoi invalide.",
      400,
    )
  }

  const paths =
    requestedPaths.filter(
      (path): path is string =>
        isMiravaLookStagedPathForBatch(
          path,
          {
            userId:
              session.userId,
            sessionId:
              params.id,
            batchId,
          },
        ),
    )

  if (
    paths.length !==
    requestedPaths.length
  ) {
    return apiError(
      "Chemin de stockage MIRAVA invalide.",
      400,
    )
  }

  if (paths.length > 0) {
    await supabaseAdmin
      .storage
      .from(STUDIO_BUCKET)
      .remove(paths)
  }

  return apiSuccess({
    aborted: true,
  })
}
