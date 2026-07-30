import { Redis } from "@upstash/redis"
import { supabaseAdmin } from "@/lib/supabase-admin"

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

export async function linkTelegramChat(token: string, telegramChatId: string) {
  const redis = getRedis()
  const userId = await redis.get<string>(`telegram:link:${token}`)

  if (!userId) return { ok: false as const, reason: "invalid_or_expired" }

  await redis.del(`telegram:link:${token}`)
  const { error } = await supabaseAdmin
    .from("UserNotificationSettings")
    .upsert(
      { userId, telegramChatId, missionProgressUpdates: true, telegramOnComplete: true },
      { onConflict: "userId" }
    )

  if (error) throw new Error("Failed to link Telegram")
  return { ok: true as const, userId }
}
