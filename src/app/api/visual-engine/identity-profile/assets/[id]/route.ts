import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  deleteIdentityAsset,
  replaceIdentityAssetFromStagedUpload,
  studioErrorResponse,
} from "@/lib/visual-engine/core"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
} from "@/lib/visual-engine/http"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
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

  try {
    const body = await request.json() as {
      batchId?: string
      upload?: {
        path?: string
        mimeType?: string
        bytes?: number
      }
    }

    if (
      typeof body.batchId !== "string" ||
      typeof body.upload?.path !== "string" ||
      typeof body.upload.mimeType !== "string" ||
      typeof body.upload.bytes !== "number"
    ) {
      return apiError(
        "Photo de remplacement invalide.",
        400,
      )
    }

    const profile =
      await replaceIdentityAssetFromStagedUpload({
        userId: session.userId,
        assetId: params.id,
        batchId: body.batchId,
        upload: {
          path: body.upload.path,
          mimeType: body.upload.mimeType,
          bytes: body.upload.bytes,
        },
      })

    await recordMiravaAudit(
      session.userId,
      "IDENTITY_ASSET_REPLACED",
      params.id,
    )

    return apiSuccess({ profile })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(
      mapped.message,
      mapped.status,
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const session = await verifySession()

  if (!session) {
    return apiError("Unauthorized", 401)
  }

  try {
    const profile = await deleteIdentityAsset({
      userId: session.userId,
      assetId: params.id,
    })

    await recordMiravaAudit(
      session.userId,
      "IDENTITY_ASSET_DELETED",
      params.id,
    )

    return apiSuccess({ profile })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(
      mapped.message,
      mapped.status,
    )
  }
}
