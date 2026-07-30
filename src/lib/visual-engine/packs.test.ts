import { describe, expect, it } from "vitest"
import { MIRAVA_CREDIT_PACKS, MIRAVA_SUBSCRIPTION_PLANS, getMiravaOffer } from "@/lib/mirava/brand"
import { getStudioCreditPack } from "./packs"

describe("MIRAVA offers", () => {
  it("keeps MIRAVA credits and pricing isolated from mission packs", () => {
    expect(MIRAVA_CREDIT_PACKS.map((pack) => [pack.credits, pack.priceEur])).toEqual([[10, 29], [30, 79], [100, 199]])
    expect(MIRAVA_SUBSCRIPTION_PLANS.map((plan) => [plan.credits, plan.priceEur])).toEqual([[20, 49], [60, 119], [150, 249]])
    expect(getMiravaOffer("mirava-30")?.name).toBe("Recarga Aura — 30")
    expect(getStudioCreditPack("studio-30")?.name).toBe("Signature")
    expect(getStudioCreditPack("mission-100")).toBeUndefined()
  })
})
