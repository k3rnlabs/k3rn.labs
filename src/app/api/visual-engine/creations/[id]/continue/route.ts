import {
  NextRequest,
} from "next/server"
import { z } from "zod"

import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { validateBody } from "@/lib/validate"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
  withMiravaPrivateHeaders,
} from "@/lib/visual-engine/http"
import {
  continueStudioCreation,
  studioCreationPublic,
  studioErrorResponse,
} from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"
import { isMiravaPublicLaunchEnabled } from "@/lib/mirava/server-config"
import {
  MIRAVA_MAX_CONTINUATION_INSTRUCTION_CHARS,
  miravaShotIntentSchema,
  miravaShotIntentsSchema,
} from "@/lib/mirava/session-continuity"

const schema =
  z
    .object({
      intent: miravaShotIntentSchema.optional(),
      intents: miravaShotIntentsSchema.optional(),
      customInstruction:
        z.string().trim().max(MIRAVA_MAX_CONTINUATION_INSTRUCTION_CHARS).optional(),
      sourceResultIndex:
        z.number().int().min(0).max(5).default(0),
    })
    .superRefine((value, context) => {
      const intents = value.intents ?? (value.intent ? [value.intent] : [])
      if (intents.length === 0 && !value.customInstruction?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose at least one variation or add a custom instruction.",
        })
      }
    })

type RouteContext = {
  params: { id: string }
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext,
) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  if (!isMiravaPublicLaunchEnabled()) {
    return apiError("MIRAVA Studio est actuellement en accès privé.", 503)
  }

  const limit = await checkRateLimit(
    "studioCreation",
    `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`,
  )
  if (!limit.success) {
    return apiError("Trop de créations MIRAVA. Réessayez plus tard.", 429)
  }

  const parsed = await validateBody(schema, req)
  if ("error" in parsed) return withMiravaPrivateHeaders(parsed.error)

  const intents = parsed.data.intents ?? (parsed.data.intent ? [parsed.data.intent] : [])

  try {
    const creation = await continueStudioCreation({
      userId: session.userId,
      sourceCreationId: params.id,
      intents,
      customInstruction: parsed.data.customInstruction,
      sourceResultIndex: parsed.data.sourceResultIndex,
    })

    await recordMiravaAudit(session.userId, "SESSION_CONTINUED", creation.id)
    return apiSuccess({ creation: studioCreationPublic(creation) }, 201)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
