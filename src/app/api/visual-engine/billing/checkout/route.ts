import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getStripe } from "@/lib/stripe"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { getMiravaOffer, MIRAVA_STRIPE_PRODUCT } from "@/lib/mirava/brand"
import { isMiravaPublicLaunchEnabled } from "@/lib/mirava/server-config"

const schema = z.object({ offerId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  if (!isMiravaPublicLaunchEnabled()) return apiError("Les achats MIRAVA ne sont pas encore ouverts.", 503)
  const limit = await checkRateLimit("studioBilling", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de demandes de paiement. Réessayez plus tard.", 429)
  const parsed = await validateBody(schema, req)
  if ("error" in parsed) return parsed.error
  const offer = getMiravaOffer(parsed.data.offerId)
  if (!offer) return apiError("Offre MIRAVA introuvable.", 400)

  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return apiError("Utilisateur introuvable.", 404)

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const lineItem = offer.stripePriceId
      ? { price: offer.stripePriceId, quantity: 1 }
      : {
        price_data: {
          currency: "eur",
          unit_amount: offer.priceEur * 100,
          tax_behavior: "inclusive" as const,
          product_data: {
            name: offer.name,
            description: offer.kind === "subscription"
              ? `${offer.credits} créations MIRAVA Studio par mois`
              : `${offer.credits} créations MIRAVA Studio sans expiration`,
          },
          ...(offer.kind === "subscription" ? { recurring: { interval: "month" as const } } : {}),
        },
        quantity: 1,
      }
    const checkout = await stripe.checkout.sessions.create({
      mode: offer.kind === "subscription" ? "subscription" : "payment",
      payment_method_types: ["card"],
      automatic_tax: { enabled: true },
      billing_address_collection: "auto",
      line_items: [lineItem],
      metadata: { product: MIRAVA_STRIPE_PRODUCT, userId: session.userId, offerId: offer.id, credits: String(offer.credits), offerKind: offer.kind },
      ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
      ...(offer.kind === "subscription" ? { subscription_data: { metadata: { product: MIRAVA_STRIPE_PRODUCT, userId: session.userId, offerId: offer.id } } } : {}),
      success_url: `${appUrl}/visual-engine/studio?checkout=success`,
      cancel_url: `${appUrl}/visual-engine/studio?checkout=cancelled`,
    })
    if (!checkout.url) return apiError("Impossible de créer le paiement MIRAVA Studio.", 500)
    return apiSuccess({ url: checkout.url })
  } catch {
    return apiError("Le paiement MIRAVA Studio est indisponible.", 500)
  }
}
