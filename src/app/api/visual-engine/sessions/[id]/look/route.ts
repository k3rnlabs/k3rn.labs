import {
  NextRequest,
} from "next/server"
import {
  z,
} from "zod"

import {
  verifySession,
} from "@/lib/auth"
import {
  miravaSessionLookItemCreateSchema,
} from "@/lib/mirava/session-builder/look"
import {
  MiravaSessionLookStoreError,
  finalizeMiravaSessionLookItem,
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
  }
}

const finalizeLookSchema =
  z
    .object({
      batchId:
        z.string().uuid(),
      item:
        miravaSessionLookItemCreateSchema,
    })
    .strict()

function lookErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
      MiravaSessionLookStoreError
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
        "CUSTOM_LOOK_REQUIRED"
    ) {
      return apiError(
        "Cette séance n’utilise pas de look personnalisé.",
        409,
      )
    }

    if (
      error.code ===
        "LOOK_LIMIT_REACHED"
    ) {
      return apiError(
        "Le nombre maximal d’articles pour cette séance est atteint.",
        409,
      )
    }

    if (
      [
        "INVALID_INPUT",
        "INVALID_UPLOAD_BATCH",
        "INVALID_STORAGE_PATH",
      ].includes(
        error.code,
      )
    ) {
      return apiError(
        "Les données du look MIRAVA sont invalides.",
        400,
      )
    }

    if (
      [
        "STAGED_OBJECT_MISSING",
        "STAGED_OBJECT_MISMATCH",
      ].includes(
        error.code,
      )
    ) {
      return apiError(
        "Une image du look n’est plus disponible ou ne correspond pas à l’envoi.",
        409,
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
      "CORRUPT_SESSION"
    ) {
      return apiError(
        "Cette séance MIRAVA ne peut pas être reprise.",
        409,
      )
    }
  }

  return apiError(
    "Impossible de finaliser ce look MIRAVA.",
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

  const parsed =
    await validateBody(
      finalizeLookSchema,
      request,
    )

  if ("error" in parsed) {
    return withMiravaPrivateHeaders(
      parsed.error,
    )
  }

  try {
    const lookItem =
      await finalizeMiravaSessionLookItem({
        userId:
          session.userId,
        sessionId:
          params.id,
        batchId:
          parsed.data.batchId,
        input:
          parsed.data.item,
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

    return apiSuccess(
      {
        lookItem,
        session:
          builderSession,
      },
      201,
    )
  } catch (error) {
    return lookErrorResponse(
      error,
    )
  }
}
