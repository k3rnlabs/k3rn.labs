import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { getMiravaSessionShootStatus, launchMiravaSessionShoot, studioErrorResponse } from "@/lib/visual-engine/core"
import { scheduleMiravaStudioWork } from "@/lib/visual-engine/vercel-worker"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

export const runtime = "nodejs"
export const maxDuration = 300

type Context = { params: { id: string } }

export async function GET(_request: Request, { params }: Context) {
  const auth = await verifySession()
  if (!auth) return apiError("Unauthorized", 401)
  try {
    return apiSuccess({ session: await getMiravaSessionShootStatus({ userId: auth.userId, sessionId: params.id }) })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}

export async function POST(request: Request, { params }: Context) {
  const auth = await verifySession()
  if (!auth) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("studioGeneration", `${auth.userId}:${request.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de lancements MIRAVA. Réessayez plus tard.", 429)

  try {
    const launch = await launchMiravaSessionShoot({ userId: auth.userId, sessionId: params.id })
    if (!launch.alreadyLaunched) {
      await recordMiravaAudit(auth.userId, "GENERATION_QUEUED", params.id)
      for (const creationId of launch.creationIds) scheduleMiravaStudioWork(request, creationId)
    }
    return apiSuccess({ sessionId: launch.sessionId, creationIds: launch.creationIds, queued: true, alreadyLaunched: launch.alreadyLaunched }, launch.alreadyLaunched ? 200 : 202)
  } catch (error) {
    if (error instanceof Error && error.message === "MIRAVA_REQUIRED_CONSENT_MISSING") {
      return apiError("Les conditions et le consentement explicite aux images doivent être acceptés.", 409)
    }
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
