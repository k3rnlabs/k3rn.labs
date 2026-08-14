import {
  NextRequest,
} from "next/server"

import {
  verifySession,
} from "@/lib/auth"
import {
  miravaSessionLookItemUpdateSchema,
} from "@/lib/mirava/session-builder/look-mutations"
import {
  MiravaSessionLookStoreError,
  deleteMiravaSessionLookItem,
  updateMiravaSessionLookItem,
} from "@/lib/mirava/session-builder/look-store"
import {
  MiravaSessionBuilderStoreError,
  getMiravaSessionBuilderDraft,
} from "@/lib/mirava/session-builder/session-store"
import {
  isMiravaPublicLaunchEnabled,
} from "@/lib/mirava/server-config"
import {
  checkRateLimit,
} from "@/lib/rate-limit"
import {
  validateBody,
} from "@/lib/validate"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
  withMiravaPrivateHeaders,
} from "@/lib/visual-engine/http"

type RouteContext = {
  params: {
    id: string
    lookItemId: string
  }
}

function mutationErrorResponse(
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
        "SESSION_ALREADY_LAUNCHED"
    ) {
      return apiError(
        "Ce look MIRAVA ne peut plus être modifié.",
        409,
      )
    }

    if (
      error.code ===
        "INVALID_INPUT"
    ) {
      return apiError(
        "Les données de cet article MIRAVA sont invalides.",
        400,
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

  if (
    error instanceof
      MiravaSessionBuilderStoreError
  ) {
    if (
      error.code ===
        "NOT_FOUND"
    ) {
      return apiError(
        "Séance MIRAVA introuvable.",
        404,
      )
    }
  }

  return apiError(
    "Impossible de modifier cet article MIRAVA.",
    500,
  )
}

async function refreshedSession(
  userId: string,
  sessionId: string,
) {
  const session =
    await getMiravaSessionBuilderDraft(
      userId,
      sessionId,
    )

  if (!session) {
    throw new MiravaSessionBuilderStoreError(
      "NOT_FOUND",
      "MIRAVA session not found.",
    )
  }

  return session
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: RouteContext,
) {
  const auth =
    await verifySession()

  if (!auth) {
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
      `${auth.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      "Trop de modifications MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  const parsed =
    await validateBody(
      miravaSessionLookItemUpdateSchema,
      request,
    )

  if ("error" in parsed) {
    return withMiravaPrivateHeaders(
      parsed.error,
    )
  }

  try {
    await updateMiravaSessionLookItem({
      userId:
        auth.userId,
      sessionId:
        params.id,
      lookItemId:
        params.lookItemId,
      input:
        parsed.data,
    })

    return apiSuccess({
      session:
        await refreshedSession(
          auth.userId,
          params.id,
        ),
    })
  } catch (error) {
    return mutationErrorResponse(
      error,
    )
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: RouteContext,
) {
  const auth =
    await verifySession()

  if (!auth) {
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
      `${auth.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      "Trop de modifications MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  try {
    await deleteMiravaSessionLookItem({
      userId:
        auth.userId,
      sessionId:
        params.id,
      lookItemId:
        params.lookItemId,
    })

    return apiSuccess({
      deleted: true,
      session:
        await refreshedSession(
          auth.userId,
          params.id,
        ),
    })
  } catch (error) {
    return mutationErrorResponse(
      error,
    )
  }
}
