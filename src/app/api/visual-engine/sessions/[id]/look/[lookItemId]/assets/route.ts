import {
  NextRequest,
} from "next/server"

import {
  verifySession,
} from "@/lib/auth"
import {
  MiravaSessionLookStoreError,
  addMiravaSessionLookAssets,
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
  }
}

function addAssetErrorResponse(
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
        "ITEM_NOT_FOUND"
    ) {
      return apiError(
        "Article MIRAVA introuvable.",
        404,
      )
    }

    if (
      error.code ===
        "CUSTOM_LOOK_REQUIRED" ||
      error.code ===
        "SESSION_ALREADY_LAUNCHED" ||
      error.code ===
        "ASSET_LIMIT_REACHED"
    ) {
      return apiError(
        error.code ===
          "ASSET_LIMIT_REACHED"
          ? "Cet article contient déjà le nombre maximum de photos."
          : "Cet article MIRAVA ne peut plus être modifié.",
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
        "Envoi de vue MIRAVA invalide.",
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
    "Impossible d’ajouter cette vue MIRAVA.",
    500,
  )
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
            uploads?: unknown
          }
        | null

  try {
    await addMiravaSessionLookAssets({
      userId:
        session.userId,
      sessionId:
        params.id,
      lookItemId:
        params.lookItemId,
      batchId:
        body?.batchId,
      input:
        body?.uploads,
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
      added: true,
      session:
        builderSession,
    })
  } catch (error) {
    return addAssetErrorResponse(
      error,
    )
  }
}
