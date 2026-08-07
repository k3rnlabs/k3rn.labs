import {
  NextRequest,
} from "next/server"

import {
  verifySession,
} from "@/lib/auth"
import {
  checkRateLimit,
} from "@/lib/rate-limit"
import {
  MiravaSessionBuilderStoreError,
  getMiravaSessionBuilderDraft,
  miravaSessionBuilderPatchSchema,
  updateMiravaSessionBuilderDraft,
} from "@/lib/mirava/session-builder/session-store"
import {
  isMiravaPublicLaunchEnabled,
} from "@/lib/mirava/server-config"
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
  }
}

function storeErrorResponse(
  error: unknown,
) {
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

    if (
      error.code ===
      "INVALID_PATCH"
    ) {
      return apiError(
        "Configuration de séance invalide.",
        400,
      )
    }

    if (
      error.code ===
      "CORRUPT_SESSION"
    ) {
      return apiError(
        "Cette séance MIRAVA ne peut pas être reprise.",
        409,
      )
    }
  }

  return apiError(
    "Impossible de modifier cette séance MIRAVA.",
    500,
  )
}

export async function GET(
  _req: NextRequest,
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

  try {
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
      session:
        builderSession,
    })
  } catch (error) {
    return storeErrorResponse(
      error,
    )
  }
}

export async function PATCH(
  req: NextRequest,
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
      `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      "Trop de modifications MIRAVA. Réessayez plus tard.",
      429,
    )
  }

  const parsed =
    await validateBody(
      miravaSessionBuilderPatchSchema,
      req,
    )

  if ("error" in parsed) {
    return withMiravaPrivateHeaders(
      parsed.error,
    )
  }

  try {
    return apiSuccess({
      session:
        await updateMiravaSessionBuilderDraft(
          session.userId,
          params.id,
          parsed.data,
        ),
    })
  } catch (error) {
    return storeErrorResponse(
      error,
    )
  }
}
