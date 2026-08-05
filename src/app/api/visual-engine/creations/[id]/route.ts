import { verifySession } from "@/lib/auth"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { deleteStudioCreation, studioCreationDTO, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"
import { scheduleMiravaStudioWork } from "@/lib/visual-engine/vercel-worker"

export const runtime = "nodejs"
export const maxDuration = 300

type RouteContext = { params: { id: string } }

export async function GET(req: Request, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try {
    const detail =
      await studioCreationDTO(
        session.userId,
        params.id,
      )

    if (
      [
        "ANALYSIS_QUEUED",
        "ANALYSING",
        "GENERATION_QUEUED",
        "GENERATING",
      ].includes(
        detail.creation.status,
      )
    ) {
      scheduleMiravaStudioWork(
        req,
        params.id,
      )
    }

    return apiSuccess(detail)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try {
    await deleteStudioCreation(session.userId, params.id)
    await recordMiravaAudit(session.userId, "DELETED", params.id)
    return apiSuccess({ deleted: true })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
