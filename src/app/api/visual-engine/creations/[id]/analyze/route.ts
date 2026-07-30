import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { apiError, apiSuccess } from "@/lib/validate"
import { queueStudioAnalysis, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

type RouteContext = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("studioAnalysis", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop d’analyses Studio. Réessayez plus tard.", 429)
  try {
    await queueStudioAnalysis(session.userId, params.id)
    await recordMiravaAudit(session.userId, "ANALYSIS_QUEUED", params.id)
    return apiSuccess({ queued: true, status: "ANALYSIS_QUEUED" }, 202)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
