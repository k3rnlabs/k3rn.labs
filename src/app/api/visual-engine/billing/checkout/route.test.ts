import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA Stripe checkout contract", () => {
  const route = readFileSync(
    path.resolve(process.cwd(), "src/app/api/visual-engine/billing/checkout/route.ts"),
    "utf8",
  )

  it("uses the configured catalogue price and enables Stripe Tax", () => {
    expect(route).toContain('if (!offer.stripePriceId)')
    expect(route).toContain('automatic_tax: {')
    expect(route).toContain('enabled: true')
    expect(route).toContain('line_items: [')
    expect(route).toContain('price:')
    expect(route).toContain('offer')
    expect(route).not.toContain("price_data:")
  })

  it("does not create a second active subscription checkout", () => {
    expect(route).toContain('studioSubscription')
    expect(route).toContain('userId:')
    expect(route).toContain('"Un abonnement MIRAVA est déjà actif. Gérez ou modifiez votre forfait depuis le portail d’abonnement."')
    expect(route).toMatch(
      /message\(\s*"Un abonnement MIRAVA est déjà actif\. Gérez ou modifiez votre forfait depuis le portail d’abonnement\.",/,
    )
    expect(route).toMatch(
      /if \(activeSubscription\)[\s\S]*?409,/,
    )
  })

  it("does not return raw Stripe failures to the browser", () => {
    expect(route).toMatch(
      /message\(\s*"Le paiement MIRAVA Studio est momentanément indisponible\. Réessayez dans un instant\.",/,
    )
    expect(route).toMatch(
      /\[billing\] checkout error:[\s\S]*?500,/,
    )
    expect(route).not.toContain('return apiError(error instanceof Error ? error.message')
  })
  it("requires the protected post-onboarding creation for discovery checkout", () => {
    expect(route).toContain(
      'offer.kind === "discovery"',
    )
    expect(route).toContain(
      "getMiravaDiscoveryAccess",
    )
    expect(route).toContain(
      "isMiravaDiscoveryCreationLocked",
    )
    expect(route).toContain(
      "discovery-success",
    )
    expect(route).toContain(
      "creationId",
    )
  })

})
