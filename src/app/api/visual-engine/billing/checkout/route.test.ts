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
    expect(route).toContain('automatic_tax: { enabled: true }')
    expect(route).toContain('line_items: [{ price: offer.stripePriceId, quantity: 1 }]')
    expect(route).not.toContain("price_data:")
  })

  it("does not create a second active subscription checkout", () => {
    expect(route).toContain('db.studioSubscription.findUnique({ where: { userId: session.userId } })')
    expect(route).toContain('"Un abonnement MIRAVA est déjà actif. Gérez ou modifiez votre forfait depuis le portail d’abonnement."')
    expect(route).toContain('return apiError("Un abonnement MIRAVA est déjà actif. Gérez ou modifiez votre forfait depuis le portail d’abonnement.", 409)')
  })

  it("does not return raw Stripe failures to the browser", () => {
    expect(route).toContain('return apiError("Le paiement MIRAVA Studio est momentanément indisponible. Réessayez dans un instant.", 500)')
    expect(route).not.toContain('return apiError(error instanceof Error ? error.message')
  })
})
