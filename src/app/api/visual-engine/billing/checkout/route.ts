import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getStripe, isStripeConfigured } from "@/lib/stripe"
import { validateBody } from "@/lib/validate"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess, withMiravaPrivateHeaders } from "@/lib/visual-engine/http"
import { getMiravaOffer, MIRAVA_STRIPE_PRODUCT } from "@/lib/mirava/brand"
import { isMiravaPublicLaunchEnabled } from "@/lib/mirava/server-config"

const schema = z.object({ offerId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  if (!isMiravaPublicLaunchEnabled()) return apiError("Les achats MIRAVA ne sont pas encore ouverts.", 503)
  if (!isStripeConfigured()) return apiError("Le paiement en ligne n’est pas encore configuré (Clé Stripe manquante).", 503)
  const limit = await checkRateLimit("studioBilling", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de demandes de paiement. Réessayez plus tard.", 429)
  const parsed = await validateBody(schema, req)
  if ("error" in parsed) return withMiravaPrivateHeaders(parsed.error)
  const offer = getMiravaOffer(parsed.data.offerId)
  if (!offer) return apiError("Offre MIRAVA introuvable.", 400)
  // MIRAVA is sold through the six catalogued Stripe prices only. Creating an
  // ad-hoc fallback price here would bypass the product's Stripe Tax category
  // and can make the checkout differ from the offer shown in the studio.
  if (!offer.stripePriceId) return apiError("Cette offre MIRAVA est momentanément indisponible.", 503)

  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return apiError("Utilisateur introuvable.", 404)

  if (offer.kind === "subscription") {
    const currentSubscription = await db.studioSubscription.findUnique({ where: { userId: session.userId } })
    const activeSubscription = currentSubscription?.stripeSubscriptionId
      && !["canceled", "incomplete_expired"].includes(currentSubscription.status ?? "")
    if (activeSubscription) {
      return apiError("Un abonnement MIRAVA est déjà actif. Gérez ou modifiez votre forfait depuis le portail d’abonnement.", 409)
    }
  }

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const checkout = await stripe.checkout.sessions.create({
      mode: offer.kind === "subscription" ? "subscription" : "payment",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      automatic_tax: { enabled: true },
      line_items: [{ price: offer.stripePriceId, quantity: 1 }],
      metadata: { product: MIRAVA_STRIPE_PRODUCT, userId: session.userId, offerId: offer.id, credits: String(offer.credits), offerKind: offer.kind },
      ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
      ...(offer.kind === "subscription" ? { subscription_data: { metadata: { product: MIRAVA_STRIPE_PRODUCT, userId: session.userId, offerId: offer.id } } } : {}),
      success_url: `${appUrl}/visual-engine/studio?checkout=success`,
      cancel_url: `${appUrl}/visual-engine/studio?checkout=cancelled`,
    })
    if (!checkout.url) return apiError("Impossible de créer le paiement MIRAVA Studio.", 500)
    return apiSuccess({ url: checkout.url })
  } catch (error) {
    console.error("[billing] checkout error:", error)
    return apiError("Le paiement MIRAVA Studio est momentanément indisponible. Réessayez dans un instant.", 500)
  }
}
