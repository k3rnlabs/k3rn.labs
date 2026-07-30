import { afterEach, describe, expect, it } from "vitest"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"

const originalSecret = process.env.INTERNAL_WEBHOOK_SECRET

afterEach(() => {
  if (originalSecret === undefined) delete process.env.INTERNAL_WEBHOOK_SECRET
  else process.env.INTERNAL_WEBHOOK_SECRET = originalSecret
})

describe("hasValidInternalWebhookSecret", () => {
  it("rejects requests when the server secret is not configured", () => {
    delete process.env.INTERNAL_WEBHOOK_SECRET

    expect(hasValidInternalWebhookSecret(new Request("https://k3rn.test", {
      headers: { "x-internal-secret": "secret" },
    }))).toBe(false)
  })

  it("accepts only the configured secret", () => {
    process.env.INTERNAL_WEBHOOK_SECRET = "expected-secret"

    expect(hasValidInternalWebhookSecret(new Request("https://k3rn.test", {
      headers: { "x-internal-secret": "expected-secret" },
    }))).toBe(true)
    expect(hasValidInternalWebhookSecret(new Request("https://k3rn.test", {
      headers: { "x-internal-secret": "wrong-secret" },
    }))).toBe(false)
  })
})
