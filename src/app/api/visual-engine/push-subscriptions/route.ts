import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { isMiravaPushConfigured, removeMiravaPushSubscription, saveMiravaPushSubscription } from "@/lib/visual-engine/push"

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(16).max(1024), auth: z.string().min(8).max(1024) }),
  locale: z.enum(["fr", "es"]),
})

const revokeSchema = z.object({ endpoint: z.string().url().max(2048) })

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("studioPush", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de demandes de notification. Réessayez plus tard.", 429)
  if (!isMiravaPushConfigured()) return apiError("Les notifications MIRAVA ne sont pas encore disponibles.", 503)
  const parsed = await validateBody(subscriptionSchema, req)
  if ("error" in parsed) return parsed.error
  try {
    await saveMiravaPushSubscription(session.userId, parsed.data, parsed.data.locale)
    return apiSuccess({ subscribed: true }, 201)
  } catch {
    return apiError("Impossible d’activer les notifications.", 400)
  }
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const parsed = await validateBody(revokeSchema, req)
  if ("error" in parsed) return parsed.error
  await removeMiravaPushSubscription(session.userId, parsed.data.endpoint)
  return apiSuccess({ revoked: true })
}
