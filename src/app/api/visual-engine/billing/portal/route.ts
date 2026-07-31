import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { apiError, apiSuccess } from "@/lib/validate"

export async function POST() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const subscription = await db.studioSubscription.findUnique({ where: { userId: session.userId } })
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { stripeCustomerId: true } })
  const customer = subscription?.stripeCustomerId ?? user?.stripeCustomerId
  if (!customer) return apiError("Aucun abonnement MIRAVA n’est associé à ce compte.", 404)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const portal = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${appUrl}/visual-engine/studio?view=account`,
    })
    return apiSuccess({ url: portal.url })
  } catch (error) {
    console.error("[billing] portal error:", error)
    return apiError(error instanceof Error ? error.message : "Le portail d'abonnement est momentanément indisponible.", 500)
  }
}
