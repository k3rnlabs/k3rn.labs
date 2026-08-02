import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { validateBody } from "@/lib/validate"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess, withMiravaPrivateHeaders } from "@/lib/visual-engine/http"
import { createCreationFromStudioProfile, studioCreationPublic, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"
import { miravaCreativeOptionsSchema } from "@/lib/mirava/creative-options"
import { isMiravaPublicLaunchEnabled } from "@/lib/mirava/server-config"

const schema = z.object({ creativeOptions: miravaCreativeOptionsSchema.optional() })
type RouteContext = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  if (!isMiravaPublicLaunchEnabled()) return apiError("MIRAVA Studio est actuellement en accès privé.", 503)
  const limit = await checkRateLimit("studioCreation", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de créations MIRAVA. Réessayez plus tard.", 429)
  const parsed = await validateBody(schema, req)
  if ("error" in parsed) return withMiravaPrivateHeaders(parsed.error)
  try {
    const creation = await createCreationFromStudioProfile({ userId: session.userId, studioProfileId: params.id, creativeOptions: parsed.data.creativeOptions })
    await recordMiravaAudit(session.userId, "STUDIO_REUSED", creation.id)
    return apiSuccess({ creation: studioCreationPublic(creation) }, 201)
  } catch (error) { const mapped = studioErrorResponse(error); return apiError(mapped.message, mapped.status) }
}
