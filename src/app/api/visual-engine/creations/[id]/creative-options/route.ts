import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { miravaCreativeOptionsSchema } from "@/lib/mirava/creative-options"
import { validateBody } from "@/lib/validate"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess, withMiravaPrivateHeaders } from "@/lib/visual-engine/http"
import { studioErrorResponse, updateStudioCreationCreativeOptions } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

type RouteContext = { params: { id: string } }

// Keep this endpoint intentionally narrower than the general creation schema:
// unknown properties cannot be written through Alma's public action contract.
const requestSchema = miravaCreativeOptionsSchema.strip()

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const parsed = await validateBody(requestSchema, req)
  if ("error" in parsed) return withMiravaPrivateHeaders(parsed.error)

  try {
    const creation = await updateStudioCreationCreativeOptions({
      userId: session.userId,
      creationId: params.id,
      creativeOptions: parsed.data,
    })
    await recordMiravaAudit(session.userId, "CREATIVE_DIRECTION_APPLIED", params.id)
    return apiSuccess({ creation })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
