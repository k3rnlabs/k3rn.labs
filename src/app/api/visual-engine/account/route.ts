import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"
import { MIRAVA_CREDIT_PACKS, MIRAVA_SUBSCRIPTION_PLANS } from "@/lib/mirava/brand"
import { ensureMiravaActivation, getMiravaAccount } from "@/lib/visual-engine/credits"

function publicOffer(offer: { id: string; name: string; credits: number; priceEur: number; kind: "pack" | "subscription" }) {
  return { id: offer.id, name: offer.name, credits: offer.credits, priceEur: offer.priceEur, kind: offer.kind }
}

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try {
    await ensureMiravaActivation(session.userId)
    const account = await getMiravaAccount(session.userId)
    return apiSuccess({
      ...account,
      plans: MIRAVA_SUBSCRIPTION_PLANS.map(publicOffer),
      packs: MIRAVA_CREDIT_PACKS.map(publicOffer),
    })
  } catch {
    return apiError("Le compte MIRAVA est momentanément indisponible.", 500)
  }
}
