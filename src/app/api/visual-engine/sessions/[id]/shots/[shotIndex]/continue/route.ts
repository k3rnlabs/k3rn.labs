import { verifySession } from "@/lib/auth"
import {
  MIRAVA_SESSION_MAX_SHOT_INDEX,
} from "@/lib/mirava/session-builder/session-options"
import { checkRateLimit } from "@/lib/rate-limit"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { continueMiravaSessionShot, studioCreationPublic, studioErrorResponse } from "@/lib/visual-engine/core"
import { scheduleMiravaStudioWork } from "@/lib/visual-engine/vercel-worker"
import { z } from "zod"

const bodySchema = z.object({ kind: z.enum(["REGENERATE", "POSE"]) }).strict()

export async function POST(request: Request, { params }: { params: { id: string; shotIndex: string } }) {
  const auth = await verifySession()
  if (!auth) return apiError("Unauthorized", 401)
  const shotIndex = Number(params.shotIndex)
  if (
    !Number.isInteger(shotIndex) ||
    shotIndex < 0 ||
    shotIndex >
      MIRAVA_SESSION_MAX_SHOT_INDEX
  ) {
    return apiError(
      "Prise MIRAVA invalide.",
      400,
    )
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return apiError("Action de prise invalide.", 400)
  const limit = await checkRateLimit("studioCreation", `${auth.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de demandes MIRAVA. Réessayez plus tard.", 429)
  try {
    const continuation = await continueMiravaSessionShot({ userId: auth.userId, sessionId: params.id, shotIndex, kind: body.data.kind })
    if (!continuation.alreadyQueued) scheduleMiravaStudioWork(request, continuation.creation.id)
    return apiSuccess({ creation: studioCreationPublic(continuation.creation), alreadyQueued: continuation.alreadyQueued }, continuation.alreadyQueued ? 200 : 202)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
