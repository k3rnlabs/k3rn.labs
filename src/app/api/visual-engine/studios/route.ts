import { verifySession } from "@/lib/auth"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { listStudioProfiles, studioErrorResponse } from "@/lib/visual-engine/core"

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try { return apiSuccess({ studios: await listStudioProfiles(session.userId) }) }
  catch (error) { const mapped = studioErrorResponse(error); return apiError(mapped.message, mapped.status) }
}
