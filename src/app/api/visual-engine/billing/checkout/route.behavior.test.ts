import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  checkRateLimit: vi.fn(),
  isStripeConfigured: vi.fn(),
  getStripe: vi.fn(),
  getMiravaOffer: vi.fn(),
  isMiravaPublicLaunchEnabled: vi.fn(),
  findUser: vi.fn(),
  findSubscription: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe, isStripeConfigured: mocks.isStripeConfigured }))
vi.mock("@/lib/mirava/brand", () => ({ getMiravaOffer: mocks.getMiravaOffer, MIRAVA_STRIPE_PRODUCT: "mirava" }))
vi.mock("@/lib/mirava/server-config", () => ({ isMiravaPublicLaunchEnabled: mocks.isMiravaPublicLaunchEnabled }))
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUser },
    studioSubscription: { findUnique: mocks.findSubscription },
  },
}))

import { POST } from "./route"

function request(offerId = "mirava-20") {
  return new NextRequest("https://mirava.test/api/visual-engine/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: JSON.stringify({ offerId }),
  })
}

describe("MIRAVA subscription checkout guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mocks.isMiravaPublicLaunchEnabled.mockReturnValue(true)
    mocks.isStripeConfigured.mockReturnValue(true)
    mocks.getMiravaOffer.mockReturnValue({ id: "mirava-20", kind: "subscription", credits: 20, stripePriceId: "price_mirava_20" })
    mocks.findUser.mockResolvedValue({ id: "user-1", email: "amina@example.test", stripeCustomerId: "cus_mirava" })
  })

  it("sends an existing subscriber to the portal path instead of creating a duplicate subscription", async () => {
    mocks.findSubscription.mockResolvedValue({ stripeSubscriptionId: "sub_active", status: "active" })

    const response = await POST(request())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: "Un abonnement MIRAVA est déjà actif. Gérez ou modifiez votre forfait depuis le portail d’abonnement." })
    expect(mocks.getStripe).not.toHaveBeenCalled()
  })

  it("allows a fresh subscription checkout when the prior subscription is cancelled", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/checkout" })
    mocks.findSubscription.mockResolvedValue({ stripeSubscriptionId: "sub_cancelled", status: "canceled" })
    mocks.getStripe.mockReturnValue({ checkout: { sessions: { create } } })

    const response = await POST(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: "https://stripe.test/checkout" })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mode: "subscription", automatic_tax: { enabled: true } }))
  })
})
