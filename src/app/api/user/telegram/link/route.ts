import { NextRequest } from "next/server"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"
import { linkTelegramChat } from "@/lib/telegram"
import { z } from "zod"

const schema = z.object({
  token: z.string().min(1),
  telegramChatId: z.string().min(1),
})

// Internal fallback for trusted workers. Telegram itself calls /api/webhooks/telegram.
export async function POST(req: NextRequest) {
  if (!hasValidInternalWebhookSecret(req)) {
    return apiError("Forbidden", 403)
  }

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const linked = await linkTelegramChat(result.data.token, result.data.telegramChatId)
  if (!linked.ok) {
    return apiError("Token invalide ou expiré", 400)
  }
  return apiSuccess({ ok: true, userId: linked.userId })
}
