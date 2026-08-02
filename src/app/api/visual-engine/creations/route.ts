import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { validateBody } from "@/lib/validate"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess, withMiravaPrivateHeaders } from "@/lib/visual-engine/http"
import { createStudioCreation, ensureStudioActivation, listStudioCreations, studioCreationPublic, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"
import { MIRAVA_STUDIO_PRESETS, type MiravaStudioPresetId } from "@/lib/mirava/brand"
import { miravaCreativeOptionsSchema } from "@/lib/mirava/creative-options"
import { isMiravaPublicLaunchEnabled } from "@/lib/mirava/server-config"

const createSchema = z.object({
  ageConfirmed: z.literal(true),
  rightsConfirmed: z.literal(true),
  privacyAccepted: z.literal(true),
  openaiDisclosureAccepted: z.literal(true),
  presetId: z.enum(MIRAVA_STUDIO_PRESETS.map((preset) => preset.id) as [string, ...string[]]).optional(),
  creativeOptions: miravaCreativeOptionsSchema.optional(),
})

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try {
    const studioCredits = await ensureStudioActivation(session.userId)
    const creations = await listStudioCreations(session.userId)
    return apiSuccess({ studioCredits, creations })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  if (!isMiravaPublicLaunchEnabled()) return apiError("MIRAVA Studio est actuellement en accès privé.", 503)
  const limit = await checkRateLimit("studioCreation", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de créations MIRAVA. Réessayez plus tard.", 429)
  const result = await validateBody(createSchema, req)
  if ("error" in result) return withMiravaPrivateHeaders(result.error)
  try {
    const creation = await createStudioCreation({ userId: session.userId, ...result.data, presetId: result.data.presetId as MiravaStudioPresetId | undefined })
    await recordMiravaAudit(session.userId, "CREATED", creation.id)
    return apiSuccess({ creation: studioCreationPublic(creation) }, 201)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
