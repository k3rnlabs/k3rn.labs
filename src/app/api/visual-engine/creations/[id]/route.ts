import { verifySession } from "@/lib/auth"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { deleteStudioCreation, studioCreationDTO, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

type RouteContext = { params: { id: string } }

export async function GET(_: Request, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try {
    return apiSuccess(await studioCreationDTO(session.userId, params.id))
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
