import {
  NextRequest,
} from "next/server"

import {
  verifySession,
} from "@/lib/auth"
import {
  MiravaSessionLookStoreError,
  deleteMiravaSessionLookAsset,
  replaceMiravaSessionLookAsset,
} from "@/lib/mirava/session-builder/look-store"
import {
  getMiravaSessionBuilderDraft,
} from "@/lib/mirava/session-builder/session-store"
import {
  isMiravaPublicLaunchEnabled,
} from "@/lib/mirava/server-config"
import {
  checkRateLimit,
} from "@/lib/rate-limit"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
} from "@/lib/visual-engine/http"

type RouteContext = {
  params: {
    id: string
    lookItemId: string
    assetId: string
  }
}

function assetErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
      MiravaSessionLookStoreError
  ) {
    if (
      error.code ===
        "NOT_FOUND" ||
      error.code ===
        "ITEM_NOT_FOUND" ||
      error.code ===
        "ASSET_NOT_FOUND"
    ) {
      return apiError(
        "Vue MIRAVA introuvable.",
        404,
      )
    }

    if (
      error.code ===
        "LAST_ASSET_REQUIRED"
    ) {
      return apiError(
        "Un article doit conserver au moins une photo.",
        409,
      )
    }

    if (
      error.code ===
        "CUSTOM_LOOK_REQUIRED" ||
      error.code ===
        "SESSION_ALREADY_LAUNCHED"
    ) {
      return apiError(
        "Cette vue MIRAVA ne peut plus être modifiée.",
        409,
      )
    }

    if (
      error.code ===
        "STORAGE_DELETE_FAILED"
    ) {
      return apiError(
        "Le stockage privé MIRAVA n’est pas disponible.",
        503,
      )
    }
  }

  return apiError(
    "Impossible de supprimer cette vue MIRAVA.",
    500,
  )
}

export async function PATCH(
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
      "mutations",
      `${session.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      "Trop de modifications MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  const body =
    await request
      .json()
      .catch(
        () => null,
      ) as
        | {
            batchId?: unknown
            upload?: unknown
          }
        | null

  try {
    await replaceMiravaSessionLookAsset({
      userId:
        session.userId,
      sessionId:
        params.id,
      lookItemId:
        params.lookItemId,
      assetId:
        params.assetId,
      batchId:
        body?.batchId,
      input:
        body?.upload,
    })

    const builderSession =
      await getMiravaSessionBuilderDraft(
        session.userId,
        params.id,
      )

    if (!builderSession) {
      return apiError(
        "Séance MIRAVA introuvable.",
        404,
      )
    }

    return apiSuccess({
      replaced: true,
      session:
        builderSession,
    })
  } catch (error) {
    if (
      error instanceof
        MiravaSessionLookStoreError
    ) {
      if (
        error.code ===
          "NOT_FOUND" ||
        error.code ===
          "ITEM_NOT_FOUND" ||
        error.code ===
          "ASSET_NOT_FOUND"
      ) {
        return apiError(
          "Vue MIRAVA introuvable.",
          404,
        )
      }

      if (
        error.code ===
          "CUSTOM_LOOK_REQUIRED" ||
        error.code ===
          "SESSION_ALREADY_LAUNCHED" ||
        error.code ===
          "ASSET_CONFLICT"
      ) {
        return apiError(
          error.code ===
            "ASSET_CONFLICT"
            ? "Cette vue a été modifiée entre-temps. Réessayez."
            : "Cette vue MIRAVA ne peut plus être modifiée.",
          409,
        )
      }

      if (
        error.code ===
          "INVALID_INPUT" ||
        error.code ===
          "INVALID_UPLOAD_BATCH" ||
        error.code ===
          "INVALID_STORAGE_PATH" ||
        error.code ===
          "STAGED_OBJECT_MISSING" ||
        error.code ===
          "STAGED_OBJECT_MISMATCH"
      ) {
        return apiError(
          "Envoi de remplacement MIRAVA invalide.",
          400,
        )
      }

      if (
        error.code ===
          "STORAGE_MOVE_FAILED"
      ) {
        return apiError(
          "Le stockage privé MIRAVA n’est pas disponible.",
          503,
        )
      }
    }

    return apiError(
      "Impossible de remplacer cette vue MIRAVA.",
      500,
    )
  }
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
      "mutations",
      `${session.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      "Trop de modifications MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  try {
    await deleteMiravaSessionLookAsset({
      userId:
        session.userId,
      sessionId:
        params.id,
      lookItemId:
        params.lookItemId,
      assetId:
        params.assetId,
    })

    const builderSession =
      await getMiravaSessionBuilderDraft(
        session.userId,
        params.id,
      )

    if (!builderSession) {
      return apiError(
        "Séance MIRAVA introuvable.",
        404,
      )
    }

    return apiSuccess({
      deleted: true,
      session:
        builderSession,
    })
  } catch (error) {
    return assetErrorResponse(
      error,
    )
  }
}
