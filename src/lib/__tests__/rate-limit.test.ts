import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
}))

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {},
}))

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class Ratelimit {
    static slidingWindow() {
      return {}
    }

    limit(identifier: string) {
      return mocks.limit(identifier)
    }
  },
}))

const originalEnv = {
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
}

function restore(name: keyof NodeJS.ProcessEnv, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

beforeEach(() => {
  vi.resetModules()
  mocks.limit.mockReset()
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test"
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"
})

afterEach(() => {
  vi.unstubAllEnvs()
  restore("UPSTASH_REDIS_REST_URL", originalEnv.redisUrl)
  restore("UPSTASH_REDIS_REST_TOKEN", originalEnv.redisToken)
  vi.restoreAllMocks()
})

describe("checkRateLimit", () => {
  it("returns the provider decision when Upstash responds", async () => {
    mocks.limit.mockResolvedValue({ success: false, remaining: 0 })
    const { checkRateLimit } = await import("@/lib/rate-limit")

    await expect(checkRateLimit("studioCreation", "user")).resolves.toEqual({
      success: false,
      remaining: 0,
    })
  })

  it("fails open in development when Upstash is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "development")
    mocks.limit.mockRejectedValue(new Error("network unavailable"))
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const { checkRateLimit } = await import("@/lib/rate-limit")

    await expect(checkRateLimit("studioCreation", "user")).resolves.toEqual({
      success: true,
      remaining: 0,
    })
  })

  it("fails closed in production when Upstash is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production")
    mocks.limit.mockRejectedValue(new Error("network unavailable"))
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const { checkRateLimit } = await import("@/lib/rate-limit")

    await expect(checkRateLimit("studioCreation", "user")).resolves.toEqual({
      success: false,
      remaining: 0,
    })
  })

  it("fails closed in production when Upstash times out", async () => {
    vi.stubEnv("NODE_ENV", "production")
    mocks.limit.mockResolvedValue({ success: true, remaining: 0, reason: "timeout" })
    const { checkRateLimit } = await import("@/lib/rate-limit")

    await expect(checkRateLimit("studioCreation", "user")).resolves.toEqual({
      success: false,
      remaining: 0,
    })
  })

  it("uses the same environment policy when Upstash is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const { checkRateLimit } = await import("@/lib/rate-limit")

    await expect(checkRateLimit("studioCreation", "user")).resolves.toEqual({
      success: false,
      remaining: 0,
    })
    expect(mocks.limit).not.toHaveBeenCalled()
  })
})
