import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { queueStudioGeneration, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

type RouteContext = { params: { id: string } }

export async function POST(req: Request, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("studioGeneration", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de générations Studio. Réessayez plus tard.", 429)
  try {
    await queueStudioGeneration({ userId: session.userId, creationId: params.id })
    await recordMiravaAudit(session.userId, "GENERATION_QUEUED", params.id)
    return apiSuccess({ queued: true, status: "GENERATION_QUEUED" }, 202)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
