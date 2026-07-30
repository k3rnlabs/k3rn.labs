import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let redis: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.K3RN_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.K3RN_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  if (!redis) {
    redis = new Redis({ url, token })
  }
  return redis
}

let _limiters: { experts: Ratelimit; mutations: Ratelimit; export: Ratelimit; studioCreation: Ratelimit; studioAnalysis: Ratelimit; studioGeneration: Ratelimit; studioUpload: Ratelimit; studioPush: Ratelimit; studioBilling: Ratelimit; studioDirector: Ratelimit } | null = null

function getLimiters() {
  if (!_limiters) {
    const r = getRedis()
    if (!r) return null
    _limiters = {
      experts: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:experts", timeout: 1_000 }),
      mutations: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:mutations", timeout: 1_000 }),
      export: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(2, "1 h"), prefix: "rl:export", timeout: 1_000 }),
      studioCreation: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:studio-creation", timeout: 1_000 }),
      studioAnalysis: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:studio-analysis", timeout: 1_000 }),
      studioGeneration: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:studio-generation", timeout: 1_000 }),
      studioUpload: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(16, "1 h"), prefix: "rl:studio-upload", timeout: 1_000 }),
      studioPush: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(6, "1 h"), prefix: "rl:studio-push", timeout: 1_000 }),
      studioBilling: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(8, "1 h"), prefix: "rl:studio-billing", timeout: 1_000 }),
      studioDirector: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:studio-director", timeout: 1_000 }),
    }
  }
  return _limiters
}

export type RateLimitKey = "experts" | "mutations" | "export" | "studioCreation" | "studioAnalysis" | "studioGeneration" | "studioUpload" | "studioPush" | "studioBilling" | "studioDirector"

function unavailableResult(): { success: boolean; remaining: number } {
  return {
    success: process.env.NODE_ENV !== "production",
    remaining: 0,
  }
}

export async function checkRateLimit(key: RateLimitKey, identifier: string): Promise<{ success: boolean; remaining: number }> {
  const limiters = getLimiters()
  if (!limiters) return unavailableResult()

  try {
    const { success, remaining, reason } = await limiters[key].limit(identifier)
    if (reason === "timeout" && process.env.NODE_ENV === "production") {
      return unavailableResult()
    }
    return { success, remaining }
  } catch {
    console.warn("[rate-limit] Upstash unavailable")
    return unavailableResult()
  }
}
