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
  createMiravaSessionBuilderDraft,
  listMiravaSessionBuilderDrafts,
} from "@/lib/mirava/session-builder/session-store"
import {
  isMiravaPublicLaunchEnabled,
} from "@/lib/mirava/server-config"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
} from "@/lib/visual-engine/http"

export async function GET() {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  try {
    return apiSuccess({
      sessions:
        await listMiravaSessionBuilderDrafts(
          session.userId,
        ),
    })
  } catch {
    return apiError(
      "Impossible de charger vos séances MIRAVA.",
      500,
    )
  }
}

export async function POST(
  req: NextRequest,
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

  try {
    const created =
      await createMiravaSessionBuilderDraft(
        session.userId,
      )

    return apiSuccess(
      {
        session:
          created,
      },
      201,
    )
  } catch {
    return apiError(
      "Impossible de créer cette séance MIRAVA.",
      500,
    )
  }
}
